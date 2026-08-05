#!/usr/bin/env node
/**
 * verify-image-hygiene.mjs — Wave 1 / Session 7 (static container-image hygiene; seeds Wave 8, R-14)
 *
 * A real image build + Trivy scan needs a Docker daemon (deferred to Wave 8, where the backend/
 * frontend Dockerfiles are also authored — R-12). What we CAN gate today, statically, is the thing
 * R-14 is actually about: secrets must not be baked into shipped images. So this verifier asserts:
 *
 *   1. Every app-service Dockerfile that copies its whole build context (`COPY . .` / `ADD . …`)
 *      has a `.dockerignore` in that context which EXCLUDES `.env` (not merely `.env.local`).
 *      Without it, `COPY . .` bakes the service's real-credential .env into the image.
 *   2. No Dockerfile explicitly copies a secret env file (`COPY .env …`, excluding `.env.example`).
 *   3. No Dockerfile hardcodes a secret literal (gitleaks-style: API keys, private keys, or an
 *      ENV/ARG assigning a long value to a *_SECRET/_TOKEN/_PASSWORD/_KEY name).
 *
 * The language-runner Dockerfiles under backend/docker/* are sandbox BASE images (no app source,
 * no .env) — they get the cheap secret-literal scan (3) but not the .dockerignore requirement.
 *
 * Exit 0 => image hygiene holds. Exit 1 => a secret could ship in an image (prints which).
 * Node built-ins only. Windows-safe. Usage: node hiralent-master-plan/tools/verify-image-hygiene.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const errors = [];
const notes = [];

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(p);

// App-service Dockerfiles (build an app image from a context that can contain a real .env).
// { dockerfile, context } relative to repo root.
const SERVICES = [
  { df: 'ai-service/Dockerfile', ctx: 'ai-service' },
  { df: 'assessment-ai-service/Dockerfile', ctx: 'assessment-ai-service' },
  { df: 'document-validator-service/Dockerfile', ctx: 'document-validator-service' },
  { df: 'backend/Dockerfile.workers', ctx: 'backend' },
  { df: 'runner-python/Dockerfile', ctx: 'runner-python' },
  { df: 'talent-ai-service/job-creation-ai/Dockerfile', ctx: 'talent-ai-service/job-creation-ai' },
  { df: 'talent-ai-service/matching-candidate-job/Dockerfile', ctx: 'talent-ai-service/matching-candidate-job' },
  { df: 'talent-ai-service/scraping-candidates/Dockerfile', ctx: 'talent-ai-service/scraping-candidates' },
];

/** Does the Dockerfile copy the whole build context? (COPY . …, COPY ./ …, ADD . …) */
function copiesWholeContext(text) {
  return text.split(/\r?\n/).some((line) => /^\s*(COPY|ADD)\s+(--\S+\s+)*(\.|\.\/)\s+\S/.test(line));
}

/** Does the .dockerignore exclude the plain `.env` file? (a lone `.env.local` does NOT count) */
function ignoresDotEnv(dockerignoreText) {
  return dockerignoreText.split(/\r?\n/).map((l) => l.trim()).some((l) => {
    if (!l || l.startsWith('#') || l.startsWith('!')) return false;
    return l === '.env' || l === '.env*' || l === '*.env' || l === '**/.env' || l === '**/.env*';
  });
}

/** Explicit `COPY .env` / `ADD .env` of a secret file (allow `.env.example`). */
function copiesSecretEnvFile(text) {
  return text.split(/\r?\n/).some((line) => {
    const m = line.match(/^\s*(COPY|ADD)\s+(--\S+\s+)*(\S+)/);
    if (!m) return false;
    const src = m[3];
    return /^\.env(\.|$)/.test(src) && !/^\.env\.example$/.test(src) && src !== '.env.sample';
  });
}

// gitleaks-style secret literals.
const SECRET_PATTERNS = [
  { re: /AIza[0-9A-Za-z\-_]{35}/, what: 'Google API key' },
  { re: /AKIA[0-9A-Z]{16}/, what: 'AWS access key id' },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, what: 'private key block' },
  { re: /gh[pousr]_[0-9A-Za-z]{36}/, what: 'GitHub token' },
  { re: /\b(sk|rk)_(live|test)_[0-9A-Za-z]{16,}/, what: 'Stripe secret key' },
  // ENV/ARG assigning a long literal to a secret-named variable.
  { re: /^\s*(ENV|ARG)\s+\w*(SECRET|PASSWORD|TOKEN|API[_-]?KEY|PRIVATE[_-]?KEY)\w*\s*[= ]\s*["']?[A-Za-z0-9/+_\-]{16,}/im, what: 'inline secret in ENV/ARG' },
];

function scanForSecrets(label, text) {
  for (const { re, what } of SECRET_PATTERNS) {
    if (re.test(text)) errors.push(`[secret] ${label}: looks like a hardcoded ${what}.`);
  }
}

// ---- 1 & 2: per app-service context ----
for (const { df, ctx } of SERVICES) {
  const dfAbs = path.join(ROOT, df);
  if (!exists(dfAbs)) { notes.push(`[skip] ${df} not present.`); continue; }
  const text = read(dfAbs);

  scanForSecrets(df, text);

  if (copiesSecretEnvFile(text)) errors.push(`[env-copy] ${df} explicitly COPY/ADDs a .env secret file into the image.`);

  if (copiesWholeContext(text)) {
    const diAbs = path.join(ROOT, ctx, '.dockerignore');
    if (!exists(diAbs)) {
      errors.push(`[dockerignore] ${df} does \`COPY . .\` but ${ctx}/.dockerignore is missing — the context .env would be baked into the image (R-14).`);
    } else if (!ignoresDotEnv(read(diAbs))) {
      errors.push(`[dockerignore] ${ctx}/.dockerignore does not exclude \`.env\` (only variants like .env.local don't count) — \`COPY . .\` bakes real credentials into the image (R-14).`);
    } else {
      notes.push(`[ok] ${ctx}: COPY . . + .dockerignore excludes .env.`);
    }
  } else {
    notes.push(`[ok] ${ctx}: no whole-context COPY (no .env leak vector).`);
  }
}

// ---- 3: secret-literal scan across the sandbox language-runner Dockerfiles too ----
const runnerDir = path.join(ROOT, 'backend', 'docker');
let runnerCount = 0;
if (exists(runnerDir)) {
  for (const entry of fs.readdirSync(runnerDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dfp = path.join(runnerDir, entry.name, 'Dockerfile');
    if (exists(dfp)) { runnerCount++; scanForSecrets(`backend/docker/${entry.name}/Dockerfile`, read(dfp)); }
  }
}
notes.push(`[info] scanned ${runnerCount} sandbox language-runner Dockerfiles for secret literals.`);
notes.push('[deferred] real image build + Trivy vuln/secret scan needs a Docker daemon → Wave 8 (R-14/R-12).');

for (const n of notes) console.log('  · ' + n);

if (errors.length) {
  console.error('\n✗ FAIL: container-image hygiene\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✅ PASS: no whole-context Dockerfile bakes a .env, no explicit secret-file COPY, no hardcoded secret literal.');
process.exit(0);

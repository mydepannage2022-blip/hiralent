#!/usr/bin/env node
/**
 * verify-secrets-hygiene.mjs — Wave 1 / Session 1 (Secrets rotation & leak prevention, Phase 1.1)
 *
 * Proves the Phase 1.1 Definition of Done:
 *   1. No git-TRACKED source file contains a real-secret signature or one of the weak,
 *      publicly-known literals this repo used to ship (R-01, R-02, R-14).
 *   2. The specific fallback sites removed this session stay removed (regression anchors):
 *      admin.auth.service.ts / adminAuth.middleware.ts (ADMIN_JWT_SECRET `|| '...'`),
 *      gemini_service.py (hardcoded Gemini key as os.getenv default),
 *      assessment config.py (hardcoded internal token default),
 *      candidate.case.controller.ts (hardcoded S3 credentials).
 *   3. No source line dumps a secret env value into logs (the INTERNAL_SERVICE_KEY leak).
 *   4. Secret scanning is wired: .gitleaks.toml + .github/workflows/secret-scan.yml exist.
 *   5. Core secrets fail fast: assertCoreSecrets() PASSES with the real backend/.env
 *      loaded (green) and THROWS when JWT_SECRET is removed (red). Both are proven —
 *      a guard that is never exercised in its failing direction is not a guard.
 *
 * Exit 0 => all checks pass. Exit 1 => at least one failed (prints why).
 * Deterministic. Node built-ins only. Windows-safe (no shell, args-array spawns).
 *
 * Usage: node hiralent-master-plan/tools/verify-secrets-hygiene.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');

const errors = [];
const notes = [];

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const abs = (rel) => path.join(ROOT, rel.replace(/\//g, path.sep));

// ---------------------------------------------------------------------------
// Tracked-file inventory (git ls-files: no node_modules, no untracked .env).
// ---------------------------------------------------------------------------
// Scan tracked files AND not-yet-tracked (but not git-ignored) files. A secret pasted
// into a brand-new file must fail the gate BEFORE it is ever staged — scanning only
// tracked files would let it through locally and leave CI as the sole net.
function gitList(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    console.error('\n✗ FAIL: could not enumerate files via `git ' + args.join(' ') + '`.');
    console.error('  - ' + (r.error ? r.error.message : r.stderr));
    process.exit(1);
  }
  return r.stdout.split('\0').filter(Boolean);
}
const tracked = [
  ...new Set([...gitList(['ls-files', '-z']), ...gitList(['ls-files', '--others', '--exclude-standard', '-z'])]),
];

// Scan EVERY text file regardless of extension — Dockerfiles (no extension), shell
// scripts and JSON all routinely carry baked credentials. Only skip binaries and
// oversized generated files. (An earlier extension-allowlist here is exactly why a
// real Authorization-header leak went undetected.)
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.zip', '.gz', '.tgz',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.wav', '.db', '.sqlite', '.pyc', '.exe', '.dll',
]);
const MAX_SCAN_BYTES = 2 * 1024 * 1024;

function isScannable(rel) {
  if (SKIP_EXT.has(path.extname(rel).toLowerCase())) return false;
  const p = abs(rel);
  try {
    if (fs.statSync(p).size > MAX_SCAN_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

// Paths that legitimately mention weak defaults. Kept in sync with .gitleaks.toml.
const ALLOWLIST = [
  /^hiralent-master-plan\//,        // audit/planning docs record the values they track
  /^docs\//,                        // architecture docs describe local-only creds
  /^docker-compose\.yml$/,          // local-only dev stack (see docs/DEV_ARCHITECTURE.md)
  /\.env\.example$/,                // templates carry placeholders (config-hygiene checks these)
  /^\.gitleaks\.toml$/,             // necessarily contains the patterns it detects
  /^\.gitleaksignore$/,
];
const allowlisted = (rel) => ALLOWLIST.some((re) => re.test(rel));

// ---------------------------------------------------------------------------
// 1. Secret signatures + weak literals in tracked source.
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
  { re: /AIza[0-9A-Za-z_\-]{30,}/, what: 'Google/Gemini API key' },
  { re: /pcsk_[0-9A-Za-z_\-]{20,}/, what: 'Pinecone API key' },
  { re: /\bsk-[0-9A-Za-z]{20,}/, what: 'OpenAI API key' },
  { re: /mongodb\+srv:\/\/[^\s:]+:[^\s@]+@/, what: 'MongoDB SRV credentials' },
  { re: /cloudinary:\/\/[0-9]+:[^@\s]+@/, what: 'Cloudinary credentials' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, what: 'private key' },
  { re: /fallback-secret-change-this/, what: "removed ADMIN_JWT_SECRET fallback literal" },
  { re: /super-secret-internal-token/, what: 'removed internal API token default' },
  {
    re: /(?:access_?key_?id|secret_?access_?key|accessKey|secretKey)\s*[:=]\s*["']minioadmin["']/i,
    what: 'well-known MinIO default used as a literal credential',
  },
  {
    re: /^\s*(?:ENV|ARG)\s+[A-Z_]*(?:SECRET|TOKEN|PASSWORD|API_KEY)\s*=\s*\S+/m,
    what: 'credential baked into a Dockerfile ENV/ARG default',
  },
];

for (const rel of tracked) {
  if (allowlisted(rel)) continue;
  if (!isScannable(rel)) continue;
  const p = abs(rel);
  if (!exists(p)) continue; // tracked but deleted in the working tree
  let body;
  try {
    body = read(p);
  } catch {
    continue;
  }
  const lines = body.split(/\r?\n/);
  for (const { re, what } of SECRET_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        errors.push(`${rel}:${i + 1} contains ${what} — secrets must come from env only.`);
        break; // one report per pattern per file is enough
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Regression anchors — the exact sites fixed this session.
// ---------------------------------------------------------------------------
const ANCHORS = [
  {
    file: 'backend/src/services/admin.auth.service.ts',
    bad: /process\.env\.ADMIN_JWT_SECRET\s*\|\|/,
    why: 'ADMIN_JWT_SECRET must not have an `||` fallback — use requireEnv().',
  },
  {
    file: 'backend/src/middlewares/adminAuth.middleware.ts',
    bad: /process\.env\.ADMIN_JWT_SECRET\s*\|\|/,
    why: 'ADMIN_JWT_SECRET must not have an `||` fallback — use requireEnv().',
  },
  {
    file: 'ai-service/app/gemini_service.py',
    bad: /os\.getenv\(\s*["']GEMINI_API_KEY["']\s*,/,
    why: 'GEMINI_API_KEY must be read with NO default argument (a default re-introduces a baked key).',
  },
  {
    file: 'assessment-ai-service/app/core/config.py',
    bad: /INTERNAL_API_TOKEN\s*=\s*os\.getenv\(\s*["']INTERNAL_API_TOKEN["']\s*,\s*["'].+["']\s*\)/,
    why: 'INTERNAL_API_TOKEN must not have a non-empty default.',
  },
  {
    file: 'backend/src/controller/candidate/candidate.case.controller.ts',
    bad: /new S3Client\(/,
    why: 'must reuse the shared env-configured client from lib/s3.ts, not construct its own.',
  },
  {
    file: 'assessment-ai-service/docker-compose.yml',
    bad: /INTERNAL_API_TOKEN=(?!\$\{)/,
    why: 'compose must pass INTERNAL_API_TOKEN through from the environment (${INTERNAL_API_TOKEN}).',
  },
];

for (const { file, bad, why } of ANCHORS) {
  const p = abs(file);
  if (!exists(p)) {
    errors.push(`Expected file missing: ${file}`);
    continue;
  }
  if (bad.test(read(p))) errors.push(`${file}: ${why}`);
}

// Positive anchors: the fail-fast helper exists and is actually wired at boot.
const helper = abs('backend/src/config/requireEnv.ts');
if (!exists(helper)) {
  errors.push('backend/src/config/requireEnv.ts is missing — the fail-fast env helper.');
} else {
  const h = read(helper);
  for (const fn of ['requireEnv', 'assertCoreSecrets']) {
    if (!new RegExp(`export function ${fn}`).test(h)) {
      errors.push(`requireEnv.ts does not export ${fn}().`);
    }
  }
}
const serverTs = abs('backend/src/server.ts');
if (!exists(serverTs)) {
  errors.push('backend/src/server.ts is missing.');
} else if (!/assertCoreSecrets\(\)/.test(read(serverTs))) {
  errors.push('server.ts does not call assertCoreSecrets() — core secrets are not asserted at boot.');
}

// ---------------------------------------------------------------------------
// 3. No secret VALUES in logs.
// ---------------------------------------------------------------------------
// Secrets reach logs through more than process.env: request headers carry the very same
// shared tokens. The Authorization-header case below was a REAL leak that an env-only
// rule missed, so it is modelled explicitly.
const LOG_LEAKS = [
  {
    re: /JSON\.stringify\(\s*process\.env\.[A-Za-z0-9_]*(?:SECRET|KEY|TOKEN|PASS)/i,
    what: 'dumps a raw secret env value',
  },
  {
    re: /console\.log\([^)]*\bprocess\.env\.[A-Za-z0-9_]*(?:SECRET|PASSWORD)\b/i,
    what: 'logs a secret env value',
  },
  {
    re: /console\.(?:log|info|warn|error|debug)\([^)]*\breq\.headers(?:\.authorization|\[["']authorization["']\])/i,
    what: 'logs the Authorization header (contains the bearer secret)',
  },
  {
    re: /console\.(?:log|info|warn|error|debug)\([^)]*\breq\.headers\[["']x-(?:internal-key|api-token|api-key)["']\]/i,
    what: 'logs an internal service key header',
  },
  {
    re: /(?:print|console\.(?:log|info|warn|error|debug))\([^)]*\b(?:authHeader|bearerToken|accessToken|apiSecret)\b/,
    what: 'logs a token/secret variable',
  },
];
for (const rel of tracked) {
  if (allowlisted(rel)) continue;
  if (!isScannable(rel)) continue;
  const p = abs(rel);
  if (!exists(p)) continue;
  const lines = read(p).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { re, what } of LOG_LEAKS) {
      if (re.test(lines[i])) {
        errors.push(`${rel}:${i + 1} ${what} — secrets must never reach logs.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Secret scanning is wired.
// ---------------------------------------------------------------------------
if (!exists(abs('.gitleaks.toml'))) {
  errors.push('.gitleaks.toml is missing — no secret-scanning config.');
}
const wf = abs('.github/workflows/secret-scan.yml');
if (!exists(wf)) {
  errors.push('.github/workflows/secret-scan.yml is missing — secret scanning is not in CI.');
} else if (!/gitleaks\s+detect/.test(read(wf))) {
  errors.push('secret-scan.yml does not run `gitleaks detect`.');
}

// ---------------------------------------------------------------------------
// 5. Core-secret fail-fast: GREEN (present -> no throw) and RED (missing -> throws).
// ---------------------------------------------------------------------------
const tsxCli = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const envPath = path.join(BACKEND, '.env');

// Minimal .env parse — only to build the child env; values are never printed.
function parseEnv(body) {
  const out = {};
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    const hash = v.indexOf(' #');
    if (hash !== -1) v = v.slice(0, hash);
    v = v.trim().replace(/^["']|["']$/g, '');
    out[m[1]] = v;
  }
  return out;
}

if (!exists(helper)) {
  // already reported above
} else if (!exists(tsxCli)) {
  notes.push('tsx not installed in backend/ — skipped the fail-fast RUNTIME probe (run `pnpm install` in backend/ to enable).');
} else if (!exists(envPath)) {
  notes.push('backend/.env not found — skipped the fail-fast RUNTIME probe.');
} else {
  const probe = path.join(os.tmpdir(), `hiralent-secrets-probe-${process.pid}.mjs`);
  fs.writeFileSync(
    probe,
    [
      "import { pathToFileURL } from 'node:url';",
      'const target = process.argv[2];',
      'const mode = process.argv[3];',
      'const m = await import(pathToFileURL(target).href);',
      "if (mode === 'green') {",
      '  try { m.assertCoreSecrets(); process.exit(0); }',
      "  catch (e) { console.log('GREEN_THREW:' + (e && e.message)); process.exit(4); }",
      '} else {',
      '  delete process.env.JWT_SECRET;',
      '  try { m.assertCoreSecrets(); console.log("RED_DID_NOT_THROW"); process.exit(5); }',
      "  catch (e) { if (String(e && e.message).includes('JWT_SECRET')) process.exit(0);",
      "    console.log('RED_WRONG_ERROR:' + (e && e.message)); process.exit(6); }",
      '}',
    ].join('\n'),
    'utf8'
  );

  const childEnv = { ...process.env, ...parseEnv(read(envPath)) };
  const run = (mode) =>
    spawnSync(process.execPath, [tsxCli, probe, helper, mode], {
      cwd: BACKEND,
      env: childEnv,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });

  const green = run('green');
  if (green.status !== 0) {
    errors.push(
      `Core-secret GREEN probe failed (exit ${green.status}): assertCoreSecrets() threw even with backend/.env loaded.\n    ${`${green.stdout || ''}${green.stderr || ''}`.trim()}`
    );
  }

  const red = run('red');
  if (red.status !== 0) {
    errors.push(
      `Core-secret RED probe failed (exit ${red.status}): assertCoreSecrets() did NOT throw with JWT_SECRET removed — the boot guard is not real.\n    ${`${red.stdout || ''}${red.stderr || ''}`.trim()}`
    );
  }

  try { fs.unlinkSync(probe); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
for (const n of notes) console.log('  · ' + n);
if (errors.length) {
  console.error('\n✗ FAIL: secrets hygiene not clean\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  '\n✓ PASS: secrets hygiene clean (no secret literals in tracked source · fallbacks removed · no secret logging · gitleaks wired · core secrets fail fast, green+red proven).'
);
process.exit(0);

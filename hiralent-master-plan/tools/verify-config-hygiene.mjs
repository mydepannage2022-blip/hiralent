#!/usr/bin/env node
/**
 * verify-config-hygiene.mjs — Wave 0 / Session 5 (Config Hygiene, Phase 0.6)
 *
 * Proves the Phase 0.6 Definition of Done:
 *   1. backend/.env loads clean — no `[object Promise]` line (R-43), no duplicate keys.
 *   2. SHADOW_DATABASE_URL can never wipe the primary DB (R-07):
 *        (a) no UNCOMMENTED `SHADOW_DATABASE_URL=` in backend/.env, and
 *        (b) `shadowDatabaseUrl` is NOT declared in prisma/schema.prisma.
 *   3. firebase.ts is boot-safe: importing it with FIREBASE_* unset does NOT throw
 *      (lazy init), yet calling verifyFirebaseToken WITHOUT config throws the clean
 *      "Firebase not configured" error (guard is real, not a silent pass). (supports R-33)
 *   4. Every target service has a `.env.example`; every key in a service's real `.env`
 *      is documented in its `.env.example`; and no `.env.example` leaks a real secret.
 *
 * Exit 0 => all checks pass. Exit 1 => at least one failed (prints why).
 * Deterministic. Node built-ins only. Windows-safe (no shell, args-array spawns).
 *
 * Usage: node hiralent-master-plan/tools/verify-config-hygiene.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');

const errors = [];
const notes = [];

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

// Extract UPPER_SNAKE env keys from a .env / .env.example body (skip comments/blanks).
function envKeys(body) {
  const keys = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

// Keys DOCUMENTED in a .env.example — counts both active (`KEY=`) and commented
// (`# KEY=`) lines, since a commented example still tells the dev the var exists.
function documentedKeys(body) {
  const keys = new Set();
  for (const raw of body.split(/\r?\n/)) {
    const m = raw.trim().match(/^#?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) keys.add(m[1].toUpperCase());
  }
  return keys;
}

// Field names declared in a pydantic BaseSettings class (4-space-indented `NAME: type`).
function pydanticFields(body) {
  const out = [];
  for (const l of body.split(/\r?\n/)) {
    const m = l.match(/^ {4}([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (m) out.push(m[1].toUpperCase());
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. backend/.env clean: no [object Promise], no duplicate keys.
// ---------------------------------------------------------------------------
const envPath = path.join(BACKEND, '.env');
if (!exists(envPath)) {
  errors.push('backend/.env not found.');
} else {
  const body = read(envPath);
  if (/\[object Promise\]/.test(body)) {
    errors.push('backend/.env still contains a corrupt `[object Promise]` line (R-43).');
  }
  const keys = envKeys(body);
  const seen = new Map();
  for (const k of keys) seen.set(k, (seen.get(k) || 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
  if (dupes.length) {
    errors.push(`backend/.env has duplicate keys (dotenv last-wins footgun): ${dupes.join(', ')}`);
  }

  // ------- 2a. No uncommented SHADOW_DATABASE_URL assignment. -------
  const uncommentedShadow = body
    .split(/\r?\n/)
    .some((l) => /^\s*SHADOW_DATABASE_URL\s*=/.test(l));
  if (uncommentedShadow) {
    errors.push('backend/.env has an ACTIVE `SHADOW_DATABASE_URL=` line — R-07 risk (a `prisma migrate dev` could wipe the primary DB). Comment it out.');
  }
}

// ---------------------------------------------------------------------------
// 2b. schema.prisma must NOT declare shadowDatabaseUrl.
// ---------------------------------------------------------------------------
const schemaPath = path.join(BACKEND, 'prisma', 'schema.prisma');
if (!exists(schemaPath)) {
  errors.push('backend/prisma/schema.prisma not found.');
} else if (/shadowDatabaseUrl/.test(read(schemaPath))) {
  errors.push('schema.prisma declares `shadowDatabaseUrl` — combined with a shadow=primary URL this can wipe the primary DB (R-07). Remove it.');
}

// ---------------------------------------------------------------------------
// 3. firebase.ts boot-safe (runtime probe via the project's own tsx).
// ---------------------------------------------------------------------------
const firebaseTs = path.join(BACKEND, 'src', 'utils', 'firebase.ts');
const tsxCli = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
if (!exists(firebaseTs)) {
  errors.push('backend/src/utils/firebase.ts not found.');
} else if (!exists(tsxCli)) {
  notes.push('tsx not installed in backend/ — skipped the firebase RUNTIME probe (run `pnpm install` in backend/ to enable). Static structure still checked below.');
  // Static fallback: no top-level initializeApp, guard string present.
  const fb = read(firebaseTs);
  const topLevelInit = fb.split(/\r?\n/).some((l) => /^\s*admin\.initializeApp\(/.test(l));
  if (topLevelInit) errors.push('firebase.ts calls admin.initializeApp at top level — will crash boot if FIREBASE_* is missing.');
  if (!/Firebase not configured/.test(fb)) errors.push('firebase.ts is missing the "Firebase not configured" guard.');
} else {
  const probe = path.join(os.tmpdir(), `hiralent-fb-probe-${process.pid}.mjs`);
  fs.writeFileSync(
    probe,
    [
      "import { pathToFileURL } from 'node:url';",
      'const target = process.argv[2];',
      'import(pathToFileURL(target).href)',
      '  .then(async (m) => {',
      '    try {',
      "      await m.verifyFirebaseToken('dummy');",
      "      console.log('PROBE:NO_THROW'); process.exit(4);",
      '    } catch (e) {',
      "      if (String(e && e.message).includes('Firebase not configured')) { console.log('PROBE:GUARDED'); process.exit(0); }",
      "      console.log('PROBE:WRONG_ERROR:' + (e && e.message)); process.exit(5);",
      '    }',
      '  })',
      "  .catch((e) => { console.log('PROBE:IMPORT_THREW:' + (e && e.message)); process.exit(3); });",
    ].join('\n'),
    'utf8'
  );
  // Child env with all FIREBASE_* removed to simulate "unconfigured".
  const childEnv = { ...process.env };
  for (const k of Object.keys(childEnv)) if (k.startsWith('FIREBASE_')) delete childEnv[k];
  const res = spawnSync(process.execPath, [tsxCli, probe, firebaseTs], {
    cwd: BACKEND,
    env: childEnv,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  try { fs.unlinkSync(probe); } catch { /* ignore */ }
  const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
  if (res.status === 3) {
    errors.push(`firebase.ts crashes on import with FIREBASE_* unset (top-level init regression?):\n    ${out}`);
  } else if (res.status === 4) {
    errors.push('firebase.ts did NOT throw when verifying without config — the guard is missing/broken.');
  } else if (res.status !== 0) {
    errors.push(`firebase.ts boot-safety probe failed (exit ${res.status}):\n    ${out}`);
  }
}

// ---------------------------------------------------------------------------
// 4. .env.example completeness + no-secret-leak.
// ---------------------------------------------------------------------------
// envFile !== null => also assert every real .env key is documented in .env.example.
const SERVICES = [
  { name: 'backend', dir: 'backend', envFile: '.env' },
  { name: 'frontend', dir: 'frontend', envFile: '.env' },
  { name: 'ai-service', dir: 'ai-service', envFile: '.env' },
  { name: 'assessment-ai-service', dir: 'assessment-ai-service', envFile: '.env' },
  { name: 'document-validator-service', dir: 'document-validator-service', envFile: null },
  { name: 'python-services', dir: 'python-services', envFile: null },
  { name: 'talent-ai/job-creation-ai', dir: 'talent-ai-service/job-creation-ai', envFile: null },
  { name: 'talent-ai/matching-candidate-job', dir: 'talent-ai-service/matching-candidate-job', envFile: null },
  { name: 'talent-ai/scraping-candidates', dir: 'talent-ai-service/scraping-candidates', envFile: null },
  { name: 'runner-python', dir: 'runner-python', envFile: null },
];

// Real-secret signatures (placeholders never match these).
const SECRET_PATTERNS = [
  { re: /AIza[0-9A-Za-z_\-]{30,}/, what: 'Google/Gemini API key' },
  { re: /pcsk_[0-9A-Za-z_\-]{20,}/, what: 'Pinecone API key' },
  { re: /\bsk-[0-9A-Za-z]{20,}/, what: 'OpenAI API key' },
  { re: /mongodb\+srv:\/\/[^\s:]+:[^\s@]+@/, what: 'MongoDB SRV credentials' },
  { re: /cloudinary:\/\/[0-9]+:[^@\s]+@/, what: 'Cloudinary credentials' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, what: 'private key' },
];

for (const svc of SERVICES) {
  const exPath = path.join(ROOT, svc.dir, '.env.example');
  if (!exists(exPath)) {
    errors.push(`Missing .env.example for ${svc.name} (${svc.dir}/.env.example).`);
    continue;
  }
  const exBody = read(exPath);

  // Secret-leak scan.
  for (const { re, what } of SECRET_PATTERNS) {
    if (re.test(exBody)) errors.push(`${svc.name}/.env.example appears to leak a real secret (${what}). Use a placeholder.`);
  }

  // Duplicate active-key scan (a dup silently shadows the earlier line under dotenv/pydantic).
  const exKeys = envKeys(exBody);
  const exSeen = new Map();
  for (const k of exKeys) exSeen.set(k, (exSeen.get(k) || 0) + 1);
  const exDup = [...exSeen.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
  if (exDup.length) errors.push(`${svc.name}/.env.example has duplicate active keys: ${exDup.join(', ')}`);

  // Completeness vs the real .env (only for services that ship one).
  if (svc.envFile) {
    const realPath = path.join(ROOT, svc.dir, svc.envFile);
    if (exists(realPath)) {
      const documented = new Set(envKeys(exBody).map((k) => k.toUpperCase()));
      const missing = [...new Set(envKeys(read(realPath)).map((k) => k.toUpperCase()))].filter((k) => !documented.has(k));
      if (missing.length) {
        errors.push(`${svc.name}/.env.example is missing keys present in ${svc.envFile}: ${missing.join(', ')}`);
      }
    } else {
      notes.push(`${svc.name}: no real ${svc.envFile} on disk — skipped key-completeness (existence + secret-scan still ran).`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Every .env.example must be COMMITTABLE (not git-ignored) — else the
//    template silently never ships (e.g. Next.js default `.env*` swallows it).
// ---------------------------------------------------------------------------
let gitAvailable = true;
for (const svc of SERVICES) {
  const abs = path.join(ROOT, svc.dir, '.env.example');
  if (!exists(abs)) continue; // existence already reported in step 4
  const rel = path.join(svc.dir, '.env.example').replace(/\\/g, '/');
  const gi = spawnSync('git', ['check-ignore', rel], { cwd: ROOT, encoding: 'utf8' });
  if (gi.error) { notes.push('git not on PATH — skipped the .gitignore-committability check.'); gitAvailable = false; break; }
  // `git check-ignore` exits 0 (and prints the match) when the path IS ignored.
  if (gi.status === 0) {
    errors.push(`${svc.name}/.env.example is git-IGNORED (${gi.stdout.trim()}) — it can never be committed. Add a negation (e.g. \`!.env.example\`) after the ignoring rule.`);
  }
}
void gitAvailable;

// ---------------------------------------------------------------------------
// 6. Pydantic services have no real `.env`, so step 4 can't check completeness
//    against one. Instead assert every BaseSettings field is DOCUMENTED
//    (commented or active) in the service's `.env.example`.
// ---------------------------------------------------------------------------
const PYDANTIC = [
  { name: 'document-validator-service', settings: 'document-validator-service/app/config.py', example: 'document-validator-service/.env.example' },
  { name: 'talent-ai/job-creation-ai', settings: 'talent-ai-service/job-creation-ai/config/settings.py', example: 'talent-ai-service/job-creation-ai/.env.example' },
  { name: 'talent-ai/matching-candidate-job', settings: 'talent-ai-service/matching-candidate-job/app/core/settings.py', example: 'talent-ai-service/matching-candidate-job/.env.example' },
  { name: 'talent-ai/scraping-candidates', settings: 'talent-ai-service/scraping-candidates/app/settings.py', example: 'talent-ai-service/scraping-candidates/.env.example' },
];
for (const svc of PYDANTIC) {
  const sPath = path.join(ROOT, svc.settings);
  const ePath = path.join(ROOT, svc.example);
  if (!exists(sPath)) { notes.push(`${svc.name}: settings file not found (${svc.settings}) — skipped pydantic completeness.`); continue; }
  if (!exists(ePath)) continue; // missing-example already reported in step 4
  const documented = documentedKeys(read(ePath));
  const missing = [...new Set(pydanticFields(read(sPath)))].filter((k) => !documented.has(k));
  if (missing.length) {
    errors.push(`${svc.name}/.env.example is missing settings field(s) from ${path.basename(svc.settings)}: ${missing.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
for (const n of notes) console.log('  · ' + n);
if (errors.length) {
  console.error('\n✗ FAIL: config hygiene not clean\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✓ PASS: config hygiene clean (env clean · shadow-DB safe · firebase boot-safe · all .env.example complete & secret-free).');
process.exit(0);

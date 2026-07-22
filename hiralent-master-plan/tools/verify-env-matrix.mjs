#!/usr/bin/env node
/**
 * verify-env-matrix.mjs — Wave 0 / Session 1 (Freeze & Env Inventory)
 *
 * Purpose: prove that the env-var inventory in `matrices/env-var-matrix.md` is
 * COMPLETE. It enumerates every environment variable that the project either
 *   (A) defines in a `.env` file, or
 *   (B) references in code (`process.env.X`, `os.getenv("X")`, `os.environ["X"]`),
 * and asserts that the union (A ∪ B) is documented in the matrix (set C).
 *
 * Exit 0 => every discovered var is in the matrix (Session-1 DoD test passes).
 * Exit 1 => at least one discovered var is missing from the matrix (prints them).
 *
 * It also prints (report-only, never fails the build):
 *   - code-only vars  (B \ A): referenced in code but not in any .env  -> default-reliant / possibly-missing
 *   - env-only vars   (A \ B): present in .env but never referenced    -> possibly dead
 *
 * Deterministic: same inputs => same output. Node built-ins only. Windows-safe.
 *
 * Usage:  node hiralent-master-plan/tools/verify-env-matrix.mjs
 *         node hiralent-master-plan/tools/verify-env-matrix.mjs --report   (dump discovered vars, always exit 0)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// repo root = two levels up from hiralent-master-plan/tools/
const ROOT = path.resolve(__dirname, '..', '..');
const MATRIX = path.join(ROOT, 'hiralent-master-plan', 'matrices', 'env-var-matrix.md');

const REPORT_ONLY = process.argv.includes('--report');

// ---------------------------------------------------------------------------
// Service map. envFile = the .env snapshot for that service (null if none).
// codeDir  = directory scanned for env references.
// ---------------------------------------------------------------------------
const SERVICES = [
  { name: 'backend',                    envFile: 'backend/.env',                    codeDir: 'backend/src' },
  { name: 'frontend',                   envFile: 'frontend/.env',                   codeDir: 'frontend' },
  { name: 'ai-service',                 envFile: 'ai-service/.env',                 codeDir: 'ai-service' },
  { name: 'assessment-ai-service',      envFile: 'assessment-ai-service/.env',      codeDir: 'assessment-ai-service' },
  { name: 'document-validator-service', envFile: 'document-validator-service/.env', codeDir: 'document-validator-service' },
  { name: 'python-services',            envFile: 'python-services/.env',            codeDir: 'python-services' },
  { name: 'talent-ai-service',          envFile: null,                              codeDir: 'talent-ai-service' },
  { name: 'runner-python',              envFile: null,                              codeDir: 'runner-python' },
];

const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py']);
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo',
  '__pycache__', 'venv', '.venv', 'env', '.env-snapshots', 'coverage', 'uploads',
]);

// Env-var name shape used everywhere (keys, refs, matrix tokens).
const VAR_RE = /^[A-Z][A-Z0-9_]{1,}$/;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function walk(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), acc);
    } else if (CODE_EXTS.has(path.extname(e.name))) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

// (A) keys defined in a .env file: `KEY=...`, skipping blanks/comments.
function parseEnvFileKeys(absFile) {
  const txt = read(absFile);
  const keys = new Set();
  if (txt == null) return keys;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

// (B) env references in a single code file (node + python patterns).
const REF_PATTERNS = [
  /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,            // process.env.X
  /process\.env\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g, // process.env['X']
  /os\.getenv\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g,   // os.getenv("X")
  /os\.environ\.get\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g, // os.environ.get("X")
  /os\.environ\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g,  // os.environ["X"]
  /Field\([^)]*\benv\s*=\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g, // Field(..., env="X")
];

const indentOf = (s) => (s.match(/^[ \t]*/)[0] || '').length;

// Block-aware pydantic extractor: only UPPER_SNAKE annotated fields that live
// inside a `class X(...BaseSettings...)` body count as env vars. This avoids
// matching UPPER_SNAKE module/class constants (e.g. regex pattern tables).
function parsePydanticFields(txt) {
  const out = new Set();
  const lines = txt.split(/\r?\n/);
  let inSettings = false;
  let classIndent = -1;
  for (const line of lines) {
    if (/^\s*class\s+\w+\s*\([^)]*BaseSettings[^)]*\)\s*:/.test(line)) {
      inSettings = true;
      classIndent = indentOf(line);
      continue;
    }
    if (!inSettings) continue;
    if (!line.trim() || line.trim().startsWith('#')) continue;
    // A non-blank line at or below the class's indent ends the class body...
    if (indentOf(line) <= classIndent) {
      // ...unless it's an immediately-following BaseSettings class.
      if (/^\s*class\s+\w+\s*\([^)]*BaseSettings[^)]*\)\s*:/.test(line)) {
        classIndent = indentOf(line);
        continue;
      }
      inSettings = false;
      continue;
    }
    const m = line.match(/^\s*([A-Z][A-Z0-9_]{1,})\s*:\s*(?:str|int|bool|float|List|Optional|Dict|dict|list|Any|Set|Tuple)\b/);
    if (m) out.add(m[1]);
  }
  return out;
}

// `const { A, B: c, D } = process.env` — every destructured key is an env ref.
const DESTRUCTURE_RE = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*process\.env\b/g;
function parseDestructuredEnv(txt) {
  const out = new Set();
  DESTRUCTURE_RE.lastIndex = 0;
  let m;
  while ((m = DESTRUCTURE_RE.exec(txt)) !== null) {
    for (let part of m[1].split(',')) {
      // handle `KEY: alias` and `KEY = default` — the env key is before : or =
      part = part.split(':')[0].split('=')[0].trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) out.add(part);
    }
  }
  return out;
}

function parseCodeRefs(absFile) {
  const txt = read(absFile);
  const refs = new Set();
  if (txt == null) return refs;
  for (const re of REF_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt)) !== null) refs.add(m[1]);
  }
  for (const d of parseDestructuredEnv(txt)) refs.add(d);
  if (absFile.endsWith('.py')) for (const f of parsePydanticFields(txt)) refs.add(f);
  return refs;
}

// (C) vars documented in the matrix: every backtick span, split into tokens,
// keep those shaped like an env var. Over-inclusive is safe (we test ⊆ C).
function parseMatrixVars(absFile) {
  const txt = read(absFile);
  const out = new Set();
  if (txt == null) return out;
  const spans = txt.match(/`[^`]+`/g) || [];
  for (const span of spans) {
    const inner = span.slice(1, -1);
    for (const tok of inner.split(/[^A-Za-z0-9_]+/)) {
      if (VAR_RE.test(tok)) out.add(tok);
    }
  }
  return out;
}

function sortedFilter(set) {
  return [...set].filter((v) => VAR_RE.test(v)).sort();
}

// ---------------------------------------------------------------------------
// collect
// ---------------------------------------------------------------------------
const envKeys = new Set();   // A
const codeRefs = new Set();  // B
const perService = [];

for (const svc of SERVICES) {
  const a = svc.envFile ? parseEnvFileKeys(path.join(ROOT, svc.envFile)) : new Set();
  const b = new Set();
  const files = walk(path.join(ROOT, svc.codeDir));
  for (const f of files) for (const r of parseCodeRefs(f)) b.add(r);
  a.forEach((k) => envKeys.add(k));
  b.forEach((k) => codeRefs.add(k));
  perService.push({ name: svc.name, envFile: svc.envFile, envCount: a.size, refCount: b.size, fileCount: files.length, a, b });
}

const matrixVars = parseMatrixVars(MATRIX);

// A/B contain raw .env keys (any case) and code refs; normalise to VAR_RE shape
// for the assertion (env vars are conventionally UPPER_SNAKE). Lowercase/odd
// keys are still reported but not asserted, to avoid false failures on stray
// non-conventional keys.
const union = new Set([...sortedFilter(envKeys), ...sortedFilter(codeRefs)]);
const missing = [...union].filter((v) => !matrixVars.has(v)).sort();

// Surface anything the UPPER_SNAKE filter silently drops, so a non-standard
// key (e.g. lowercase) can never slip past the completeness guarantee unseen.
const dropped = [...new Set([...envKeys, ...codeRefs])]
  .filter((v) => v && !VAR_RE.test(v))
  .sort();

const codeOnly = sortedFilter(codeRefs).filter((v) => !envKeys.has(v)).sort();
const envOnly = sortedFilter(envKeys).filter((v) => !codeRefs.has(v)).sort();

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const line = '─'.repeat(72);
console.log(line);
console.log('Env-Var Matrix Verification — Wave 0 / Session 1');
console.log(line);
for (const s of perService) {
  const env = s.envFile ? `${String(s.envCount).padStart(3)} .env` : '  — .env';
  console.log(`  ${s.name.padEnd(28)} ${env}   ${String(s.refCount).padStart(3)} code-refs   (${s.fileCount} files)`);
}
console.log(line);
console.log(`  total distinct .env keys (UPPER_SNAKE): ${sortedFilter(envKeys).length}`);
console.log(`  total distinct code refs (UPPER_SNAKE): ${sortedFilter(codeRefs).length}`);
console.log(`  union to document (A ∪ B):              ${union.size}`);
console.log(`  vars documented in matrix (C):          ${matrixVars.size}`);
console.log(line);

if (REPORT_ONLY) {
  for (const s of perService) {
    const all = [...new Set([...sortedFilter(s.a), ...sortedFilter(s.b)])].sort();
    console.log(`\n### ${s.name} (${all.length} vars)`);
    console.log(all.join(', '));
  }
  console.log('\n### ALL (union A ∪ B), alphabetical:\n');
  console.log([...union].sort().join('\n'));
  console.log(`\n[--report] exit 0 (no assertion run)`);
  process.exit(0);
}

// Report-only diffs
if (codeOnly.length) {
  console.log(`\n[report] code-only (referenced, not in any .env) — ${codeOnly.length}:`);
  console.log('  ' + codeOnly.join(', '));
}
if (envOnly.length) {
  console.log(`\n[report] env-only (in .env, never referenced) — ${envOnly.length}:`);
  console.log('  ' + envOnly.join(', '));
}
if (dropped.length) {
  console.log(`\n⚠️  [warn] ${dropped.length} non-standard (non-UPPER_SNAKE) key(s) NOT covered by the assertion:`);
  console.log('  ' + dropped.join(', '));
}

// Assertion 1
if (missing.length) {
  console.log(`\n❌ FAIL: ${missing.length} var(s) discovered but NOT documented in env-var-matrix.md:\n`);
  console.log('  ' + missing.join('\n  '));
  console.log(`\nAdd these to ${path.relative(ROOT, MATRIX)} then re-run.`);
  process.exit(1);
}

console.log(`\n✅ PASS: all ${union.size} discovered env vars are documented in the matrix.`);
process.exit(0);

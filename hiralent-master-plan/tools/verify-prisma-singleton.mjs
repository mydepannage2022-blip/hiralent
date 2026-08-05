#!/usr/bin/env node
/**
 * verify-prisma-singleton.mjs — Wave 2 / Session 1 (Phase 2.1, R-06a)
 *
 * Proves the "one Prisma client" invariant: the whole `backend/src` tree must
 * construct a PrismaClient in EXACTLY one place — the shared singleton
 * `backend/src/lib/prisma.ts` — and everything else imports it. This is the
 * regression gate that keeps DB-connection sprawl (R-06) from creeping back.
 *
 * Checks:
 *   1. `new PrismaClient(` appears in `src/**` ONLY in `src/lib/prisma.ts`
 *      and the one allowlisted separate-DB script (`scripts/sync-to-library-db.ts`,
 *      whose `libraryDb` points at LIBRARY_DATABASE_URL — a different database).
 *      Matches inside comments and template-literal strings (e.g. generated
 *      documentation examples) are NOT counted — only real code.
 *   2. The singleton itself is real: `src/lib/prisma.ts` constructs exactly one
 *      client and default-exports it.
 *
 * Exit 0 => invariant holds. Exit 1 => a stray client (or missing singleton) —
 * prints every offending file:line.
 *
 * Deterministic. Node built-ins only. Windows-safe (no shell).
 *
 * Usage: node hiralent-master-plan/tools/verify-prisma-singleton.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'backend', 'src');

// The singleton + explicitly-allowed separate-DB clients (repo-relative, POSIX).
// NOTE: this is "exactly 1 shared client for request-serving code" — the ONE allowlisted
// exception (`sync-to-library-db.ts`) targets a DIFFERENT database (LIBRARY_DATABASE_URL)
// and is a standalone script, so it legitimately owns its own client. The invariant that
// matters for R-06 (no pool sprawl in the long-lived server) holds.
const SINGLETON_REL = 'backend/src/lib/prisma.ts';
const ALLOWLIST = new Set([
  SINGLETON_REL,
  'backend/src/scripts/sync-to-library-db.ts', // libraryDb → LIBRARY_DATABASE_URL (separate DB)
]);

// Files that legitimately contain `new PrismaClient(` *inside a doc/template string* (code
// examples emitted into generated documentation) rather than as real code. These are exempt
// from the obfuscation guard below — every OTHER file having the pattern only inside a
// string/comment/template is treated as an attempt to smuggle a client past the code scan.
const DOC_ALLOWLIST = new Set([
  'backend/src/scripts/export-to-git-repo.ts',
  'backend/src/scripts/export-library-questions.ts',
]);

const errors = [];

const relPosix = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.isFile() && e.name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

/**
 * Return `src` with comments and string/template-literal contents blanked out
 * (replaced by spaces, preserving newlines so line numbers stay accurate).
 * A real `new PrismaClient()` is always CODE — never inside a comment or a
 * doc-string — so blanking these removes false positives without hiding real
 * instantiations.
 */
function codeOnly(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const keep = (ch) => (out += ch === '\n' ? '\n' : ch);
  const blank = (ch) => (out += ch === '\n' ? '\n' : ' ');
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    // line comment
    if (c === '/' && c2 === '/') {
      while (i < n && src[i] !== '\n') blank(src[i++]);
      continue;
    }
    // block comment
    if (c === '/' && c2 === '*') {
      blank(src[i++]); blank(src[i++]);
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) blank(src[i++]);
      if (i < n) { blank(src[i++]); blank(src[i++]); }
      continue;
    }
    // single / double quoted string
    if (c === "'" || c === '"') {
      const q = c;
      keep(src[i++]); // keep the opening quote position (as code char is harmless)
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { blank(src[i++]); if (i < n) blank(src[i++]); continue; }
        if (src[i] === '\n') break; // unterminated; bail defensively
        blank(src[i++]);
      }
      if (i < n && src[i] === q) keep(src[i++]);
      continue;
    }
    // template literal (blank entire span incl. ${...} — good enough: no real
    // instantiation ever lives inside one in this codebase)
    if (c === '`') {
      keep(src[i++]);
      while (i < n && src[i] !== '`') {
        if (src[i] === '\\') { blank(src[i++]); if (i < n) blank(src[i++]); continue; }
        blank(src[i++]);
      }
      if (i < n && src[i] === '`') keep(src[i++]);
      continue;
    }
    keep(src[i++]);
  }
  return out;
}

// ---- Check 1: no stray `new PrismaClient(` in real code ---------------------
const NEW_CLIENT = /new\s+PrismaClient\s*\(/;
const files = walk(SRC);
for (const file of files) {
  const rel = relPosix(file);
  const raw = fs.readFileSync(file, 'utf8');
  const code = codeOnly(raw);
  const lines = code.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln++) {
    if (NEW_CLIENT.test(lines[ln])) {
      if (ALLOWLIST.has(rel)) continue;
      errors.push(`${rel}:${ln + 1} — stray "new PrismaClient(" (import the singleton from lib/prisma instead)`);
    }
  }

  // ---- Check 1a: obfuscation guard --------------------------------------------------
  // `codeOnly()` blanks comments/strings/template literals to avoid false positives from
  // doc examples. But that blanking is exactly what a stray client could hide behind — put
  // `new PrismaClient(` inside a template literal and the code scan above never sees it.
  // If the RAW source has the pattern but the code-only view does NOT, the instantiation
  // lives entirely inside a string/comment/template. That's only legitimate for the known
  // doc-emitting scripts; anywhere else it is flagged.
  if (ALLOWLIST.has(rel) || DOC_ALLOWLIST.has(rel)) continue;
  if (NEW_CLIENT.test(raw) && !NEW_CLIENT.test(code)) {
    errors.push(
      `${rel} — "new PrismaClient(" appears only inside a string/comment/template (hidden from the code scan). ` +
        `If this is a real client, import the singleton; if it is documentation, add the file to DOC_ALLOWLIST.`
    );
  }
}

// ---- Check 1b: no $disconnect() on the shared singleton in request-serving code
// Routes/controllers/services run inside the long-lived server process and share
// ONE client — calling prisma.$disconnect() there tears down the pool for every
// other request. Scripts (standalone, exit after) and workers (own process,
// lifecycle shutdown) are allowed to disconnect.
const DISCONNECT_DIRS = ['src/controller', 'src/routes', 'src/services'];
for (const file of files) {
  const rel = relPosix(file);
  const under = rel.replace(/^backend\//, '');
  if (!DISCONNECT_DIRS.some((d) => under.startsWith(d + '/'))) continue;
  const code = codeOnly(fs.readFileSync(file, 'utf8'));
  const lines = code.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln++) {
    if (/\.\$disconnect\s*\(/.test(lines[ln])) {
      errors.push(`${rel}:${ln + 1} — "$disconnect()" on the shared singleton inside request-serving code (would kill the pool process-wide; remove it — lifecycle belongs to graceful shutdown)`);
    }
  }
}

// ---- Check 2: the singleton is real -----------------------------------------
const singletonPath = path.join(ROOT, SINGLETON_REL);
if (!fs.existsSync(singletonPath)) {
  errors.push(`${SINGLETON_REL} — singleton file is missing`);
} else {
  const s = fs.readFileSync(singletonPath, 'utf8');
  const count = (s.match(/new\s+PrismaClient\s*\(/g) || []).length;
  if (count !== 1) errors.push(`${SINGLETON_REL} — expected exactly 1 "new PrismaClient(", found ${count}`);
  if (!/export\s+default\s+prisma/.test(s)) {
    errors.push(`${SINGLETON_REL} — must "export default prisma" (the shared client)`);
  }
}

// ---- Report -----------------------------------------------------------------
if (errors.length) {
  console.error('✗ FAIL — Prisma singleton invariant violated:\n');
  for (const e of errors) console.error(`  • ${e}`);
  console.error(`\n${errors.length} problem(s). Every src file must import the shared client from lib/prisma.`);
  process.exit(1);
}

console.log(`✅ PASS — single shared PrismaClient. Scanned ${files.length} src files; only the singleton (+1 allowlisted separate-DB script) constructs a real client, no client hidden in a string/template, no $disconnect in request code.`);
process.exit(0);

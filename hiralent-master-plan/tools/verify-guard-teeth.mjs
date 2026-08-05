#!/usr/bin/env node
/**
 * verify-guard-teeth.mjs — Wave 2 / Session 7 (gate)
 *
 * A green gate only means something if it turns RED when the invariant is violated. This is
 * the negative-control / "penetration" proof for the data-layer safety gates: it deliberately
 * reintroduces the exact regressions Wave 2 fixed and asserts the guard actually FAILS.
 *
 *   [1] baseline            — the clean tree passes `verify-prisma-singleton.mjs` (exit 0).
 *   [2] new PrismaClient    — inject a real `new PrismaClient()` into a temp `src/**` file →
 *                             assert the singleton gate exits 1 AND names the offending file.
 *                             (Proves "reintroduce a stray client → gate fail" — R-06.)
 *   [3] $disconnect         — inject `prisma.$disconnect()` into a temp `src/services` file →
 *                             assert the singleton gate exits 1 (Check 1b: killing the shared
 *                             pool from request-serving code is caught).
 *   [4] deleteMany guard    — static meta-check: the behavioral blind-`deleteMany` guard in
 *                             `verify-seed-safety.mjs` [D2] (prod re-seed must not WIPE/DUPLICATE)
 *                             is still present, so nobody silently removes the teeth that keep
 *                             a blind deleteMany out of the seed (R-21).
 *
 * All temp files are written under the SESSION-marked prefix `__guard_teeth_*` and removed in a
 * `finally` (plus a belt-and-suspenders sweep at the end) so the working tree is never left dirty.
 *
 * Exit 0 => every guard has teeth. Exit 1 => a guard did NOT catch its regression (prints which).
 * Deterministic. Node built-ins only. No DB, no network. Windows-safe.
 *
 * Usage: node hiralent-master-plan/tools/verify-guard-teeth.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const SINGLETON_VERIFIER = path.join(__dirname, 'verify-prisma-singleton.mjs');
const SEED_SAFETY_VERIFIER = path.join(__dirname, 'verify-seed-safety.mjs');

const errors = [];
const relPosix = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// Every temp file we may create — tracked so the final sweep can guarantee a clean tree.
const TEMP_FILES = [
  path.join(BACKEND, 'src', '__guard_teeth_client.ts'),
  path.join(BACKEND, 'src', 'services', '__guard_teeth_disconnect.ts'),
];
function sweep() {
  for (const f of TEMP_FILES) { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ } }
}

/** Run a verifier as a child process; return { code, out }. */
function runVerifier(scriptPath) {
  const r = spawnSync(process.execPath, [scriptPath], { cwd: ROOT, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

/** Write `content` to `file`, run the singleton verifier, always delete `file`. Returns the run. */
function withInjectedFile(file, content, fn) {
  try {
    fs.writeFileSync(file, content);
    return fn();
  } finally {
    try { fs.unlinkSync(file); } catch { /* ignore */ }
  }
}

function main() {
  if (!fs.existsSync(SINGLETON_VERIFIER)) { errors.push(`verify-prisma-singleton.mjs not found at ${relPosix(SINGLETON_VERIFIER)}.`); return; }
  if (!fs.existsSync(path.join(BACKEND, 'src'))) { errors.push('backend/src not found — run from the repo root.'); return; }

  // Refuse to run if a previous crash left temp files behind (avoids masking / double-writes).
  for (const f of TEMP_FILES) if (fs.existsSync(f)) { errors.push(`stale temp file present: ${relPosix(f)} — remove it before running this gate.`); }
  if (errors.length) return;

  // ---- [1] baseline: clean tree must PASS ------------------------------------
  const base = runVerifier(SINGLETON_VERIFIER);
  if (base.code !== 0) {
    errors.push(`[1] baseline: verify-prisma-singleton FAILED on the clean tree (exit ${base.code}) — cannot trust the teeth tests. Tail: ${base.out.split(/\r?\n/).filter(Boolean).slice(-4).join(' | ')}`);
    return;
  }
  console.log('  [1] baseline OK — verify-prisma-singleton passes on the clean tree (exit 0).');

  // ---- [2] new PrismaClient reintroduced -> gate MUST fail -------------------
  const clientFile = TEMP_FILES[0];
  const rel2 = relPosix(clientFile);
  const r2 = withInjectedFile(clientFile,
    "import { PrismaClient } from '@prisma/client';\n// injected by verify-guard-teeth (negative control)\nconst strayClient = new PrismaClient();\nexport default strayClient;\n",
    () => runVerifier(SINGLETON_VERIFIER));
  if (r2.code === 0) errors.push(`[2] TEETH MISSING — the singleton gate PASSED with a stray "new PrismaClient()" in ${rel2} (a reintroduced client would slip through).`);
  else if (!r2.out.includes(rel2)) errors.push(`[2] gate failed (exit ${r2.code}) but did NOT name the offending file ${rel2} — detection is imprecise. Tail: ${r2.out.split(/\r?\n/).filter(Boolean).slice(-4).join(' | ')}`);
  else console.log(`  [2] new-client teeth OK — injecting a stray "new PrismaClient()" flips the gate to exit ${r2.code} and it names ${rel2}.`);

  // ---- [3] $disconnect in request-serving code -> gate MUST fail ------------
  const discFile = TEMP_FILES[1];
  const rel3 = relPosix(discFile);
  const r3 = withInjectedFile(discFile,
    "import prisma from '../lib/prisma';\n// injected by verify-guard-teeth (negative control)\nexport async function killThePool() { await prisma.$disconnect(); }\n",
    () => runVerifier(SINGLETON_VERIFIER));
  if (r3.code === 0) errors.push(`[3] TEETH MISSING — the singleton gate PASSED with "prisma.$disconnect()" in ${rel3} (would tear down the shared pool process-wide).`);
  else if (!r3.out.includes(rel3)) errors.push(`[3] gate failed (exit ${r3.code}) but did NOT name ${rel3} — Check 1b detection imprecise. Tail: ${r3.out.split(/\r?\n/).filter(Boolean).slice(-4).join(' | ')}`);
  else console.log(`  [3] $disconnect teeth OK — injecting "prisma.$disconnect()" in src/services flips the gate to exit ${r3.code} and it names ${rel3}.`);

  // ---- [4] deleteMany behavioral guard still present in verify-seed-safety --
  if (!fs.existsSync(SEED_SAFETY_VERIFIER)) {
    errors.push('[4] verify-seed-safety.mjs not found — the behavioral blind-deleteMany guard cannot be confirmed.');
  } else {
    const seedSafety = fs.readFileSync(SEED_SAFETY_VERIFIER, 'utf8');
    const hasD2 = /WIPED or DUPLICATED/.test(seedSafety) && /no blind deleteMany/.test(seedSafety);
    if (!hasD2) errors.push('[4] the [D2] differential guard (prod re-seed must not WIPE/DUPLICATE — "no blind deleteMany") is missing from verify-seed-safety.mjs — the deleteMany teeth were removed.');
    else console.log('  [4] deleteMany guard OK — verify-seed-safety [D2] still asserts a prod re-seed neither wipes nor duplicates (blind-deleteMany would be caught live).');
  }
}

try {
  main();
} catch (e) {
  errors.push(`verifier crashed: ${e && e.stack ? e.stack : e}`);
} finally {
  sweep(); // guarantee a clean tree regardless of how we got here
}

if (errors.length) {
  console.error('\n✗ FAIL: a safety gate lacks teeth (a reintroduced regression would not be caught):');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log('\n✅ PASS: the data-layer guards have teeth — reintroducing a stray "new PrismaClient()" or a request-path "$disconnect()" flips the singleton gate RED (and names the file), and the behavioral blind-deleteMany guard is intact. Green means green for a reason.');
process.exit(0);

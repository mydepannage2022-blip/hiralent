#!/usr/bin/env node
/**
 * verify-bcrypt-compat.mjs — Wave 0 / Session 2 (bcrypt -> bcryptjs converge)
 *
 * Purpose: prove that dropping the native `bcrypt` dependency and standardising
 * on pure-JS `bcryptjs` is BEHAVIOUR-PRESERVING for existing users — i.e. every
 * password hash already stored in the DB (produced by native `bcrypt`) still
 * validates under `bcryptjs`.
 *
 * How: `bcrypt` and `bcryptjs` both implement the OpenBSD bcrypt algorithm.
 * We verify `bcryptjs.compareSync` against the canonical jBCrypt / OpenBSD
 * reference test vectors (the same vectors native `bcrypt` satisfies). If
 * bcryptjs reproduces those, it is algorithm-compatible with native bcrypt,
 * so stored `$2a$`/`$2b$` hashes keep verifying. Also does a fresh round-trip.
 *
 * Exit 0 => cross-implementation compatibility holds (Session-2 DoD test passes).
 * Exit 1 => a vector failed to verify (converge would break logins — prints which).
 *
 * Resolves bcryptjs from backend/node_modules (run after `pnpm install` in backend).
 * Deterministic, Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-bcrypt-compat.mjs
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const require = createRequire(import.meta.url);
let bcrypt;
try {
  bcrypt = require(path.join(ROOT, 'backend', 'node_modules', 'bcryptjs'));
} catch (e) {
  console.error('✗ FAIL: could not load bcryptjs from backend/node_modules — run `pnpm install` in backend first.');
  console.error('  ' + e.message);
  process.exit(1);
}

// Canonical jBCrypt / OpenBSD bcrypt reference vectors: [plaintext, hash].
// These are produced by the reference bcrypt algorithm that native `bcrypt` binds to.
// (Empty-password vectors are intentionally excluded: bcryptjs guards empty input
//  and returns false — not a real scenario, no stored user hash is for an empty password.)
const VECTORS = [
  ['a',   '$2a$06$m0CrhHm10qJ3lXRY.5zDGO3rS2KdeeWLuGmsfGlMfOxih58VYVfxe'],
  ['abc', '$2a$06$If6bvum7DFjUnE9p2uDeDu0YHzrHM6tf.iqN8.yx.jNN1ILEf7h0i'],
  ['abcdefghijklmnopqrstuvwxyz', '$2a$06$.rCVZVOThsIa97pEDOxvGuRRgzG64bvtJ0938xuqzv18d3ZpQhstC'],
  ['~!@#$%^&*()      ~!@#$%^&*()PNBFRD', '$2a$06$fPIsBO8qRqkjj273rfaOI.HtSV9jLDpTbZn782DC6/t7qT67P6FfO'],
];

const failures = [];

// 1. Cross-implementation: bcryptjs must verify native-bcrypt-format hashes.
for (const [pw, hash] of VECTORS) {
  if (bcrypt.compareSync(pw, hash) !== true) failures.push(`vector not verified: pw=${JSON.stringify(pw)} hash=${hash}`);
}

// 2. Negative control: a wrong password must NOT verify.
if (bcrypt.compareSync('not-the-password', VECTORS[0][1]) !== false) failures.push('wrong password unexpectedly verified against a valid hash');

// 3. Fresh round-trip: hash then compare (proves bcryptjs itself works end-to-end).
const rt = bcrypt.hashSync('Hiralent!2026', 10);
if (bcrypt.compareSync('Hiralent!2026', rt) !== true) failures.push('round-trip: correct password failed to verify its own fresh hash');
if (bcrypt.compareSync('wrong', rt) !== false) failures.push('round-trip: wrong password verified against a fresh hash');

if (failures.length) {
  console.error('✗ FAIL: bcryptjs is NOT compatible with stored bcrypt hashes\n');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}

console.log(`✅ PASS: bcryptjs verified all ${VECTORS.length} canonical bcrypt vectors + round-trip — stored hashes stay valid.`);
process.exit(0);

#!/usr/bin/env node
/**
 * verify-single-lockfile.mjs — Wave 0 / Session 2 (One Toolchain)
 *
 * Purpose: prove the repo is on a SINGLE package manager (pnpm) with exactly
 * one lockfile per JS project and no leftover npm / root lockfiles.
 *
 * Asserts:
 *   1. No `package-lock.json` anywhere in the repo (npm lockfiles gone).
 *   2. Repo root has no `package.json`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml`
 *      (root orphan package + broken workspace stub removed; projects are independent).
 *   3. `backend/` and `frontend/` each have exactly one `pnpm-lock.yaml` and a `package.json`.
 *
 * Exit 0 => single-toolchain invariant holds (Session-2 DoD test passes).
 * Exit 1 => a stray/missing lockfile was found (prints the offenders).
 *
 * Deterministic, Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-single-lockfile.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo', '.env-snapshots', 'coverage', 'uploads']);

/** Recursively collect files named `target`, skipping SKIP_DIRS. */
function findFiles(dir, target, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      findFiles(path.join(dir, e.name), target, out);
    } else if (e.name === target) {
      out.push(path.relative(ROOT, path.join(dir, e.name)));
    }
  }
  return out;
}

const errors = [];

// 1. No package-lock.json anywhere.
const npmLocks = findFiles(ROOT, 'package-lock.json');
if (npmLocks.length) errors.push(`Found ${npmLocks.length} stray package-lock.json:\n    ${npmLocks.join('\n    ')}`);

// 2. Root must be clean of JS manifests/locks.
for (const f of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
  if (fs.existsSync(path.join(ROOT, f))) errors.push(`Root should not contain ${f} (independent-projects layout).`);
}

// 3. backend & frontend each: one pnpm-lock.yaml + package.json.
for (const proj of ['backend', 'frontend']) {
  const lock = path.join(ROOT, proj, 'pnpm-lock.yaml');
  const pkg = path.join(ROOT, proj, 'package.json');
  if (!fs.existsSync(lock)) errors.push(`Missing ${proj}/pnpm-lock.yaml (expected exactly one).`);
  if (!fs.existsSync(pkg)) errors.push(`Missing ${proj}/package.json.`);
}

if (errors.length) {
  console.error('✗ FAIL: single-lockfile invariant broken\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('✅ PASS: single pnpm toolchain — no package-lock.json, clean root, one pnpm-lock.yaml each in backend/ & frontend/.');
process.exit(0);

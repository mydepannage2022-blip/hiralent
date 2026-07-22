#!/usr/bin/env node
/**
 * verify-backend-build.mjs — Wave 0 / Session 3 (Backend Build Green, R-04)
 *
 * Purpose: prove the backend TypeScript project both TYPE-CHECKS clean and EMITS.
 *
 * Asserts:
 *   1. `tsc --noEmit` in backend/ exits 0 with ZERO `error TS` lines (build gate).
 *   2. `tsc` (emit) exits 0 (noEmitOnError:true => emit only happens when clean).
 *   3. Key compiled files exist under backend/dist/src/ (real JS was produced).
 *
 * Note: tsconfig uses `rootDir: "."`, so `src/server.ts` emits to
 *       `dist/src/server.js` (not `dist/server.js`). Paths below match reality.
 *
 * Exit 0 => backend builds green and emits (Session-3 DoD test passes).
 * Exit 1 => type errors remain or expected output is missing (prints details).
 *
 * Deterministic, Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-backend-build.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const TSC = path.join(BACKEND, 'node_modules', 'typescript', 'bin', 'tsc');

const errors = [];

function runTsc(args) {
  // Run the project's own TypeScript compiler (a JS file) via node → cross-platform.
  return spawnSync(process.execPath, [TSC, ...args], {
    cwd: BACKEND,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

if (!fs.existsSync(TSC)) {
  console.error('✗ FAIL: backend/node_modules/typescript not found — run `pnpm install` in backend/ first.');
  process.exit(1);
}

// 1. Type-check gate: tsc --noEmit must be clean.
const check = runTsc(['--noEmit']);
const checkOut = `${check.stdout || ''}${check.stderr || ''}`;
const errLines = checkOut.split(/\r?\n/).filter((l) => l.includes('error TS'));
if (check.status !== 0 || errLines.length > 0) {
  errors.push(`tsc --noEmit reported ${errLines.length} error line(s) (exit ${check.status}):\n    ${errLines.slice(0, 20).join('\n    ')}`);
}

// 2 + 3. Emit build (only run if the gate passed, to keep failure output focused).
if (errors.length === 0) {
  const build = runTsc([]);
  if (build.status !== 0) {
    const buildOut = `${build.stdout || ''}${build.stderr || ''}`.trim();
    errors.push(`tsc (emit) exited ${build.status}:\n    ${buildOut.slice(0, 2000)}`);
  }

  const KEY_OUTPUTS = [
    'dist/src/server.js',
    'dist/src/controller/question/question.controller.js',
    'dist/src/routes/questions/question.routes.js',
    'dist/src/types/subscription.types.js',
    'dist/src/services/candidate.service.js',
    'dist/src/controller/candidate.controller.js',
  ];
  for (const rel of KEY_OUTPUTS) {
    if (!fs.existsSync(path.join(BACKEND, rel))) {
      errors.push(`Expected emitted file missing: backend/${rel}`);
    }
  }
}

if (errors.length) {
  console.error('✗ FAIL: backend build is not green\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('✅ PASS: backend tsc --noEmit = 0 errors and emit produced dist/src/*.js (R-04 build green).');
process.exit(0);

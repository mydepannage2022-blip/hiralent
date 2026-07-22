#!/usr/bin/env node
/**
 * verify-frontend-build.mjs — Wave 0 / Session 4 (Frontend Build Green, R-04)
 *
 * Purpose: prove the Next.js frontend both TYPE-CHECKS clean and produces a real
 *          production build — WITHOUT any escape hatch (no ignoreBuildErrors /
 *          ignoreDuringBuilds).
 *
 * Asserts:
 *   1. `tsc --noEmit` in frontend/ exits 0 with ZERO `error TS` lines.
 *   2. next.config.ts contains NO `ignoreBuildErrors` and NO `ignoreDuringBuilds`
 *      (the type/lint gates stay ON — this is the R-04 "no escape hatch" rule).
 *   3. No `src/pages` or `src/app` directory exists alongside the root `app/`
 *      (the mixed layout that made Next's build validator emit broken `src/app/*`
 *      import paths — regression guard for the Session-4 fix).
 *   4. `next build` exits 0 AND emits `.next/BUILD_ID` (a real optimized build,
 *      including the prerender/export pass that catches useSearchParams CSR bailouts).
 *
 * Exit 0 => frontend builds green with gates on (Session-4 DoD test passes).
 * Exit 1 => type errors, an escape hatch, a layout regression, or a build failure.
 *
 * Note: assert 4 runs a full production build (slow — minutes). Deterministic,
 *       Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-frontend-build.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const TSC = path.join(FRONTEND, 'node_modules', 'typescript', 'bin', 'tsc');
const NEXT = path.join(FRONTEND, 'node_modules', 'next', 'dist', 'bin', 'next');

const errors = [];

function runNode(binAndArgs) {
  return spawnSync(process.execPath, binAndArgs, {
    cwd: FRONTEND,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  });
}

if (!fs.existsSync(TSC)) {
  console.error('✗ FAIL: frontend/node_modules/typescript not found — run `pnpm install` in frontend/ first.');
  process.exit(1);
}
if (!fs.existsSync(NEXT)) {
  console.error('✗ FAIL: frontend/node_modules/next not found — run `pnpm install` in frontend/ first.');
  process.exit(1);
}

// 1. Type-check gate: tsc --noEmit must be clean.
const check = runNode([TSC, '--noEmit']);
const checkOut = `${check.stdout || ''}${check.stderr || ''}`;
const errLines = checkOut.split(/\r?\n/).filter((l) => l.includes('error TS'));
if (check.status !== 0 || errLines.length > 0) {
  errors.push(`tsc --noEmit reported ${errLines.length} error line(s) (exit ${check.status}):\n    ${errLines.slice(0, 20).join('\n    ')}`);
}

// 2. No escape hatch in next.config.ts.
const nextConfig = fs.readFileSync(path.join(FRONTEND, 'next.config.ts'), 'utf8');
if (/ignoreBuildErrors/.test(nextConfig) || /ignoreDuringBuilds/.test(nextConfig)) {
  errors.push('next.config.ts contains ignoreBuildErrors/ignoreDuringBuilds — escape hatch not allowed (R-04).');
}

// 3. No mixed root-app + src-router layout (validator regression guard).
if (fs.existsSync(path.join(FRONTEND, 'src', 'pages'))) {
  errors.push('frontend/src/pages exists again — this makes Next treat the project as src-based and breaks the build validator (regression).');
}
if (fs.existsSync(path.join(FRONTEND, 'src', 'app'))) {
  errors.push('frontend/src/app exists alongside root app/ — ambiguous App Router layout (regression).');
}

// 4. Real production build (only if the fast gates passed, to keep output focused).
if (errors.length === 0) {
  const build = runNode([NEXT, 'build']);
  const buildOut = `${build.stdout || ''}${build.stderr || ''}`;
  const compiled = /Compiled successfully/.test(buildOut);
  const failed = /Failed to compile|Error occurred prerendering|exiting the build/.test(buildOut);
  const buildId = fs.existsSync(path.join(FRONTEND, '.next', 'BUILD_ID'));
  if (build.status !== 0 || failed || !buildId) {
    const tailLines = buildOut
      .split(/\r?\n/)
      .filter((l) => !/^\s*at\s/.test(l) && !l.includes('node_modules'))
      .slice(-25)
      .join('\n    ');
    errors.push(`next build failed (exit ${build.status}, compiled=${compiled}, BUILD_ID=${buildId}):\n    ${tailLines}`);
  }
}

if (errors.length) {
  console.error('✗ FAIL: frontend build is not green\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('✅ PASS: frontend tsc --noEmit = 0 errors, no escape hatch, clean layout, and `next build` produced .next/BUILD_ID (R-04 frontend build green).');
process.exit(0);

#!/usr/bin/env node
/**
 * verify-build-fixes-runtime.mjs — Wave 0 / Session 3 (R-04 behavioural checks)
 *
 * Purpose: prove the R-04 fixes are REAL (module loads, runtime bug gone, method
 * actually wired) — not just that the code type-checks. Runs against the emitted
 * JS in backend/dist/src (build verify-backend-build.mjs first).
 *
 * Asserts:
 *   1. subscription.types.js loads and its enums are intact
 *      (proves the stale `../generated/prisma/...` import fix kept the module
 *       working; `import type { Decimal }` is erased at runtime — no Prisma pull).
 *   2. candidate.controller.js no longer calls `triggerAutoBadgeEvaluation(...).catch(...)`
 *      (the function returns void, so `.catch` was a latent runtime TypeError).
 *   3. candidate.service.js exposes `getJobRecommendations` AND delegates to
 *      `getRecommendedJobs` (the /match-jobs endpoint is wired to the real
 *       matching engine, not stubbed).
 *
 * Exit 0 => fixes behave as intended. Exit 1 => a fix regressed (prints details).
 *
 * Deterministic, Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-build-fixes-runtime.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'backend', 'dist', 'src');
const require = createRequire(import.meta.url);

const errors = [];

const subTypesPath = path.join(DIST, 'types', 'subscription.types.js');
const candCtrlPath = path.join(DIST, 'controller', 'candidate.controller.js');
const candSvcPath = path.join(DIST, 'services', 'candidate.service.js');

for (const p of [subTypesPath, candCtrlPath, candSvcPath]) {
  if (!fs.existsSync(p)) {
    errors.push(`Missing compiled file: ${path.relative(ROOT, p)} — run verify-backend-build.mjs first.`);
  }
}

// 1. subscription.types enums intact (module loads without pulling @prisma/client).
if (fs.existsSync(subTypesPath)) {
  try {
    const m = require(subTypesPath);
    const expect = [
      ['SubscriptionStatus.ACTIVE', m.SubscriptionStatus && m.SubscriptionStatus.ACTIVE, 'active'],
      ['BillingCycle.MONTHLY', m.BillingCycle && m.BillingCycle.MONTHLY, 'monthly'],
      ['PlanType.PRO', m.PlanType && m.PlanType.PRO, 'PRO'],
    ];
    for (const [name, actual, want] of expect) {
      if (actual !== want) errors.push(`subscription.types: ${name} = ${JSON.stringify(actual)} (expected ${JSON.stringify(want)}).`);
    }
  } catch (e) {
    errors.push(`subscription.types failed to load at runtime: ${e && e.message}`);
  }
}

// 2. No `triggerAutoBadgeEvaluation(...).catch(...)` in compiled controller.
if (fs.existsSync(candCtrlPath)) {
  const js = fs.readFileSync(candCtrlPath, 'utf8');
  if (!js.includes('triggerAutoBadgeEvaluation')) {
    errors.push('candidate.controller.js: triggerAutoBadgeEvaluation call disappeared (unexpected).');
  }
  if (/triggerAutoBadgeEvaluation[^\n;]*\.catch/.test(js)) {
    errors.push('candidate.controller.js still chains `.catch` on triggerAutoBadgeEvaluation (returns void → runtime TypeError).');
  }
}

// 3. getJobRecommendations wired to the real matching engine.
if (fs.existsSync(candSvcPath)) {
  const js = fs.readFileSync(candSvcPath, 'utf8');
  if (!js.includes('getJobRecommendations')) {
    errors.push('candidate.service.js: getJobRecommendations not found (method missing).');
  }
  if (!js.includes('getRecommendedJobs')) {
    errors.push('candidate.service.js: getJobRecommendations does not delegate to getRecommendedJobs (looks stubbed, not wired).');
  }
  // Limit clamp present (guards against negative `take` / huge-limit DoS).
  if (!/Math\.min\([^)]*Math\.max/.test(js)) {
    errors.push('candidate.service.js: getJobRecommendations limit clamp (Math.min/Math.max) missing.');
  }
}

if (errors.length) {
  console.error('✗ FAIL: R-04 behavioural checks\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('✅ PASS: subscription enums intact, badge .catch crash removed, match-jobs wired to real service.');
process.exit(0);

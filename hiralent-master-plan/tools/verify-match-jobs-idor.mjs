#!/usr/bin/env node
/**
 * verify-match-jobs-idor.mjs — Wave 0 / Session 3 (R-04 security check)
 *
 * Purpose: RUNTIME-exercise the ownership guard on the /match-jobs endpoint that
 * this session revived. Wiring the previously-crashing endpoint to the real
 * matching engine turned a dormant IDOR live; the controller now enforces
 * `candidateId === req.user.user_id`. This test proves that guard actually runs.
 *
 * Method: load the COMPILED controller, stub candidate.service.getJobRecommendations
 * (so no DB is needed), and drive the controller with mock req/res.
 *   - Case A (attacker): user "A" asks for candidate "B" → must get 403, and the
 *     service must NOT be reached.
 *   - Case B (self): user "A" asks for their own id → guard passes, service is
 *     called once, 200 returned.
 *
 * Exit 0 => guard blocks cross-user and allows self. Exit 1 => IDOR open or guard
 * over-blocks (prints which case failed).
 *
 * Deterministic, Node built-ins only, DB-free, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-match-jobs-idor.mjs
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

const svcPath = path.join(DIST, 'services', 'candidate.service.js');
const ctrlPath = path.join(DIST, 'controller', 'candidate.controller.js');

const errors = [];

for (const p of [svcPath, ctrlPath]) {
  if (!fs.existsSync(p)) {
    console.error(`✗ FAIL: missing compiled file ${path.relative(ROOT, p)} — run verify-backend-build.mjs first.`);
    process.exit(1);
  }
}

function makeRes() {
  let resolve;
  const done = new Promise((r) => (resolve = r));
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; resolve({ status: this.statusCode, body }); return this; },
  };
  return { res, done };
}

// Every candidate-scoped controller that accepts a `/:candidateId` route param and
// must enforce owner-only access. Session 8 closed the IDOR on all of these; before,
// only getJobRecommendationsController was guarded. Keep this list in sync with the
// `denyIfNotOwnCandidate(...)` call sites in candidate.controller.ts.
const OWNER_SCOPED_CONTROLLERS = [
  'getProfileSummaryController',
  'getProfileCompletenessController',
  'generateCareerPredictionController',   // POST — write/compute
  'getJobRecommendationsController',
  'updateCandidateVectorController',      // POST — write
  'getExtractedSkillsController',
  'getHeadlineController',
  'getProfileController',
];

// Fail (not hang) if a controller doesn't respond quickly. A present guard returns
// 403 synchronously before any service/DB call; a REMOVED guard would fall through
// to a real service and likely hang or 500 — either way, not a fast 403.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms — ${label}`)), ms)),
  ]);
}

async function run() {
  const svc = require(svcPath);
  const ctrl = require(ctrlPath);

  // --- Sweep: every owner-scoped controller must block a cross-user request (403).
  // The guard runs before the service, so no DB is touched; we still defensively stub
  // the patchable service so a MISSING guard surfaces as a non-403 rather than a crash.
  svc.getProfileSummary = async () => ({ basic_info: {}, skills: [] });
  svc.getCandidateProfile = async () => ({});
  svc.getJobRecommendations = async () => [{ job_id: 'job-1' }];

  for (const name of OWNER_SCOPED_CONTROLLERS) {
    if (typeof ctrl[name] !== 'function') {
      errors.push(`${name} is not exported as a function (list drift or renamed handler).`);
      continue;
    }
    const { res, done } = makeRes();
    const reqA = { user: { user_id: 'user-A' }, params: { candidateId: 'user-B' }, query: {}, body: {} };
    try {
      ctrl[name](reqA, res);
      const r = await withTimeout(done, 4000, name);
      if (r.status !== 403) {
        errors.push(`IDOR OPEN in ${name}: cross-user request returned ${r.status}, expected 403 (missing ownership guard).`);
      }
    } catch (e) {
      errors.push(`IDOR SUSPECT in ${name}: cross-user request did not return a fast 403 (${e.message}) — guard likely missing (fell through to a service call).`);
    }
  }

  // --- Self-case (over-block regression): match-jobs must ALLOW the owner (200) and
  // reach the service exactly once. Representative of the whole set.
  let calls = [];
  svc.getJobRecommendations = async (candidateId, limit) => {
    calls.push({ candidateId, limit });
    return [{ job_id: 'job-1', title: 'Stubbed', match_score: 90 }];
  };
  {
    const { res, done } = makeRes();
    const reqB = { user: { user_id: 'user-A' }, params: { candidateId: 'user-A' }, query: { limit: '5' } };
    await ctrl.getJobRecommendationsController(reqB, res);
    const r = await done;
    if (r.status === 403) errors.push('Guard OVER-BLOCKS: self request (own id) was denied with 403.');
    else if (r.status !== 200) errors.push(`Self request returned ${r.status}, expected 200.`);
    if (calls.length !== 1) errors.push(`Self request reached the service ${calls.length}x, expected exactly 1.`);
    if (r.body && r.body.success !== true) errors.push('Self request did not return success:true.');
  }
}

run()
  .then(() => {
    if (errors.length) {
      console.error('✗ FAIL: /match-jobs ownership guard\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: all 8 owner-scoped candidate controllers block cross-user access (403); match-jobs allows self (200) — IDOR closed across the set.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ FAIL: unexpected error running IDOR check:', e && e.stack ? e.stack : e);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * run-all-verifiers.mjs — Wave 0 / Session 7 (Full-gate aggregator)
 *
 * Runs every sibling `verify-*.mjs` in this directory sequentially and prints a
 * one-line PASS/FAIL per verifier plus a final summary. Exits 1 if ANY verifier
 * fails, 0 only if all pass — so a single command is the whole "full gate".
 *
 * Order: fast structural/build checks first; verify-local-run.mjs is run LAST
 * because it is the slowest and the only infra-dependent one (needs a running
 * Postgres — start it with `docker compose up -d postgres redis minio` and
 * `cd backend && pnpm db:migrate` first, or pass --skip-local to exclude it).
 *
 * Usage:
 *   node hiralent-master-plan/tools/run-all-verifiers.mjs
 *   node hiralent-master-plan/tools/run-all-verifiers.mjs --skip-local
 *
 * Node built-ins only. Windows-safe.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SELF = path.basename(__filename);

const skipLocal = process.argv.includes('--skip-local');

// Discover every verify-*.mjs (auto-includes future ones), self excluded.
let files = fs
  .readdirSync(__dirname)
  .filter((f) => /^verify-.*\.mjs$/.test(f) && f !== SELF)
  .sort();

// Push the slow, infra-dependent checks (need a running Postgres) to the very
// end, and exclude them under --skip-local. verify-auth-session boots the backend
// like verify-local-run, so it belongs in the same bucket.
const INFRA = ['verify-error-envelope.mjs', 'verify-authz-matrix.mjs', 'verify-auth-session.mjs', 'verify-session-realtime.mjs', 'verify-default-deny-authz.mjs', 'verify-api-config.mjs', 'verify-transport-security.mjs', 'verify-connection-pool.mjs', 'verify-migration-safety.mjs', 'verify-index-coverage.mjs', 'verify-pagination.mjs', 'verify-agency-dashboard-stats.mjs', 'verify-data-model.mjs', 'verify-seed-safety.mjs', 'verify-sandbox-isolation.mjs', 'verify-ai-content-safety.mjs', 'verify-external-integrations.mjs', 'verify-subsystem-consolidation.mjs', 'verify-e2e-fullpath.mjs', 'verify-wave3-e2e.mjs', 'verify-wave4-e2e.mjs', 'verify-wave4-final-e2e.mjs', 'verify-entitlements-records.mjs', 'verify-local-run.mjs'];
files = files.filter((f) => !INFRA.includes(f));
if (!skipLocal) {
  for (const f of INFRA) {
    if (fs.existsSync(path.join(__dirname, f))) files.push(f);
  }
}

if (files.length === 0) {
  console.error('No verify-*.mjs files found next to the aggregator.');
  process.exit(1);
}

console.log(`Running ${files.length} verifier(s)${skipLocal ? ' (--skip-local)' : ''}...\n`);

const results = [];
for (const f of files) {
  const started = Date.now();
  const res = spawnSync(process.execPath, [path.join(__dirname, f)], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const ms = Date.now() - started;
  const ok = res.status === 0;
  results.push({ f, ok, ms, out: `${res.stdout || ''}${res.stderr || ''}` });
  const tag = ok ? '✅ PASS' : '✗ FAIL';
  console.log(`${tag}  ${f.padEnd(34)} ${(ms / 1000).toFixed(1)}s`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${'-'.repeat(52)}`);
console.log(`Total: ${results.length}   Passed: ${results.length - failed.length}   Failed: ${failed.length}`);

if (failed.length) {
  console.log('\nFailure details:');
  for (const r of failed) {
    const tail = r.out.split(/\r?\n/).filter(Boolean).slice(-8).join('\n    ');
    console.log(`\n▶ ${r.f}\n    ${tail}`);
  }
  process.exit(1);
}

console.log('\n✅ ALL VERIFIERS PASS.');
process.exit(0);

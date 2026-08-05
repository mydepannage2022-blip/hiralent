#!/usr/bin/env node
/**
 * verify-mock-dev-surface.mjs — Wave 1 / Phase 1.6 (Kill prod-reachable dev/mock surface; R-23)
 *
 * Proves the integrity-bypass surfaces are gone and the surviving dev-only endpoint is
 * gated. Two layers:
 *
 *   BEHAVIOUR: the devOnly middleware (which now guards compete .../simulate) is exercised
 *     in-process via tsx against the REAL middleware source — it 404s in production and in
 *     dev without ENABLE_DEV_MINT, and only calls next() in dev WITH the flag. This is the
 *     gate that stops a logged-in user from forging leaderboard results in prod.
 *
 *   STATIC: the dummy-admin middleware and the unauthenticated mock-assessment route are
 *     deleted, app.ts no longer mounts the mock route, internalAuth no longer logs, and
 *     compete wires devOnly BEFORE checkAuth.
 *
 * Why not boot the backend and probe the routes over HTTP? job.routes.ts mounts a global
 * `router.use(checkAuth)` at `/api/v1/`, so an anonymous probe to ANY /api/v1/* path is
 * answered 401 by that wall before the deleted route (→ would be 404) or devOnly (→ 404)
 * is ever reached. That shadow makes an HTTP probe assert the auth wall, not this phase's
 * change. Testing the gate in isolation is the honest, unambiguous signal.
 *
 * Exit 0 => every assertion holds. Exit 1 => a check failed.
 * Node built-ins only. Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-mock-dev-surface.mjs
 * Prereq: `cd backend && pnpm install` (uses backend's tsx to load the TS middleware).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); else console.log('  ok:', msg); };
const read = (rel) => { try { return fs.readFileSync(path.join(BACKEND, rel), 'utf8'); } catch { return ''; } };

function staticChecks() {
  ok(!fs.existsSync(path.join(BACKEND, 'src/middlewares/auth.ts')),
    '[static] dummy-admin middlewares/auth.ts is deleted.');
  ok(!fs.existsSync(path.join(BACKEND, 'src/routes/mockAssessment.routes.ts')),
    '[static] mockAssessment.routes.ts is deleted.');
  ok(!fs.existsSync(path.join(BACKEND, 'src/controller/company/mockAssessmentResult.controller.ts')),
    '[static] mockAssessmentResult.controller.ts is deleted.');

  const app = read('src/app.ts');
  ok(app !== '' && !/mockAssessmentRoutes/.test(app), '[static] app.ts no longer imports/mounts mockAssessmentRoutes.');

  const internalAuth = read('src/middlewares/internalAuth.middleware.ts');
  ok(internalAuth !== '' && !/console\.log/.test(internalAuth),
    '[static] internalAuth.middleware.ts contains no console.log (no plaintext-secret risk).');

  const compete = read('src/routes/compete.routes.ts');
  ok(/simulate["'`]\s*,\s*devOnly\s*,\s*checkAuth/.test(compete),
    '[static] compete simulate is guarded by devOnly BEFORE checkAuth.');
  ok(fs.existsSync(path.join(BACKEND, 'src/middlewares/devOnly.ts')),
    '[static] middlewares/devOnly.ts exists.');
}

const PROBE_SRC = `
import { devOnly } from './src/middlewares/devOnly';
function call() {
  let code = 0, nexted = false;
  const req: any = {};
  const res: any = { status(c: number) { code = c; return this; }, json() { return this; } };
  devOnly(req, res, () => { nexted = true; });
  return { code, nexted };
}
const out: any = {};
process.env.NODE_ENV = 'production'; delete process.env.ENABLE_DEV_MINT;
out.prod = call();
process.env.NODE_ENV = 'development'; delete process.env.ENABLE_DEV_MINT;
out.devNoFlag = call();
process.env.NODE_ENV = 'development'; process.env.ENABLE_DEV_MINT = '1';
out.devFlag = call();
console.log(JSON.stringify(out));
`;

function behaviourChecks() {
  if (!fs.existsSync(TSX_CLI)) { errors.push('tsx not found — run `pnpm install` in backend/.'); return; }
  // Written inside backend/ so the probe's `./src/...` import resolves; removed in finally.
  const probe = path.join(BACKEND, `_devonly_probe_${process.pid}.ts`);
  fs.writeFileSync(probe, PROBE_SRC);
  try {
    const r = spawnSync(process.execPath, [TSX_CLI, probe], { cwd: BACKEND, encoding: 'utf8', timeout: 60000 });
    if (r.status !== 0) { errors.push(`[behaviour] devOnly probe failed:\n${(r.stdout || '') + (r.stderr || '')}`.slice(0, 900)); return; }
    const line = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
    let out;
    try { out = JSON.parse(line); } catch { errors.push(`[behaviour] unparseable probe output: ${r.stdout}`); return; }
    ok(out.prod && out.prod.code === 404, `[behaviour] devOnly -> 404 in production (got ${out.prod && out.prod.code}).`);
    ok(out.devNoFlag && out.devNoFlag.code === 404, `[behaviour] devOnly -> 404 in dev without ENABLE_DEV_MINT (got ${out.devNoFlag && out.devNoFlag.code}).`);
    ok(out.devFlag && out.devFlag.nexted === true, '[behaviour] devOnly calls next() in dev WITH ENABLE_DEV_MINT=1 (endpoint still usable locally).');
  } finally {
    try { fs.unlinkSync(probe); } catch { /* ignore */ }
  }
}

console.log('verify-mock-dev-surface — Phase 1.6\n');
console.log('STATIC checks:');
staticChecks();
console.log('\nBEHAVIOUR checks (real devOnly middleware via tsx):');
behaviourChecks();

console.log('\n' + '─'.repeat(60));
if (errors.length) {
  console.log(`❌ verify-mock-dev-surface FAIL (${errors.length}):`);
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log('✅ verify-mock-dev-surface PASS — mock/dummy-admin surface gone, simulate prod-gated.');
process.exit(0);

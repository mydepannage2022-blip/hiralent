#!/usr/bin/env node
/**
 * verify-wave4-e2e.mjs — Wave 4 / Session 8 (gate) — INFRA — ADMIN LEG
 *
 * Proves the four previously-dead admin sidebar pages (Admins / Settings / Analytics /
 * Security Log) are real, mounted, guarded, and behave correctly — end to end on a fresh
 * throwaway DB (`hiralent_w4_e2e`); the primary `hiralent` is NEVER touched.
 *
 *   [A] empty DB → migrate deploy → prod seed (exactly 1 loginable superadmin, no demo data).
 *   [B] boot the REAL backend; readiness IS GET /health returning {db:"up"}.
 *
 * Then, against the live server, via a REAL superadmin MFA login (login → setup-mfa →
 * speakeasy TOTP → verify-mfa → session token):
 *   [M0] no-404 wall: every new route (GET /admin/{admins,me,settings/platform,
 *        analytics/overview,audit-logs}) returns 200 {success:true} WITH the session token,
 *        and 401 WITHOUT one — i.e. mounted before the /api/v1 jobRoutes catch-all, not a
 *        404-shadow, and default-deny guarded.
 *   [M1] Admins CRUD round-trip: POST /admin/admins (201) → GET /admin/admins contains it →
 *        DELETE /admin/admins/:id (200) → GET no longer contains it. Validation: short
 *        password → 400; duplicate email → 409.
 *   [M2] delete-guard (DATA-LOSS): deleting your OWN admin id → 400 (never self-delete).
 *        Fail-provable: dropping the self-guard in deleteAdmin turns this 400 into a 200.
 *   [M3] Settings persist: PUT /admin/me {full_name} → GET /admin/me reflects it. PUT
 *        /admin/settings/platform {allow_new_registrations:false} → GET reflects it AND a
 *        public signup is then REFUSED 403 (the setting is really enforced in auth.service);
 *        flip back true → signup 201 again.
 *   [M4] Security Log is real: the CREATE_ADMIN + DELETE_ADMIN actions from [M1] appear in
 *        GET /admin/audit-logs with the acting admin's name (read of the existing
 *        AdminAuditLog table — no fabrication).
 *
 * Static teeth also assert the new controller identifies the actor via req.admin (NOT the
 * pre-existing req.user bug), emits the envelope via sendSuccess, the router uses
 * adminSecurityStack, app.ts mounts it, and auth.service enforces allow_new_registrations.
 *
 * Probes are tsx files written INTO backend/ (pnpm resolves @prisma/client), run via the
 * backend's own tsx; results parsed from a `__RESULT__` sentinel — the shared idiom of
 * verify-wave3-e2e / verify-e2e-fullpath. Throwaway DB dropped in `finally`. AI +
 * doc-validator services are NOT booted (URLs point at a local stub).
 *
 * Exit 0 => the whole admin leg holds. Exit 1 => prints the exact failing stage. Node
 * built-ins + backend speakeasy (createRequire) only. Windows-safe.
 *
 * Usage: node hiralent-master-plan/tools/verify-wave4-e2e.mjs
 * Prereq: native/docker Postgres on 5432 + `cd backend && pnpm install`.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const PRISMA_CLI = path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const HTTP_PORT = 5096; // free slot (wave3 uses 5095)
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const THROWAWAY_DB = 'hiralent_w4_e2e'; // NEVER the primary `hiralent`

const ADMIN_EMAIL = 'admin@hiralent.com';
const ADMIN_PASSWORD = 'hiralent1234@';

const backendRequire = createRequire(path.join(BACKEND, 'package.json'));

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

function tcpReachable(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (v) => { if (!done) { done = true; socket.destroy(); resolve(v); } };
    socket.setTimeout(ms);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
}

function readBaseUrl() {
  try {
    const raw = fs.readFileSync(path.join(BACKEND, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue;
      const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return v.split('?')[0];
      }
    }
  } catch { /* ignore */ }
  return 'postgresql://postgres:huzaifa@localhost:5432/hiralent';
}
const withDbName = (base, db) => base.slice(0, base.lastIndexOf('/')) + '/' + db;

/** Write a tsx probe INTO backend/ (pnpm module resolution), run it, return parsed __RESULT__ JSON. */
function runProbe(fileName, source, extraEnv, timeoutMs) {
  const probePath = path.join(BACKEND, fileName);
  try {
    fs.writeFileSync(probePath, source);
    const r = spawnSync(process.execPath, [TSX_CLI, fileName], {
      cwd: BACKEND, encoding: 'utf8', timeout: timeoutMs,
      env: { ...process.env, ...extraEnv }, maxBuffer: 32 * 1024 * 1024,
    });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const line = out.split(/\r?\n/).find((l) => l.includes('__RESULT__'));
    if (!line) return { ok: false, error: `no __RESULT__ (exit ${r.status}): ${out.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}` };
    return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length));
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  } finally {
    try { fs.unlinkSync(probePath); } catch { /* ignore */ }
  }
}

function prisma(args, env, timeout = 180000) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND, encoding: 'utf8', timeout,
    env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024,
  });
}

function seedProd(targetUrl) {
  const binDir = path.join(BACKEND, 'node_modules', '.bin');
  return prisma(['db', 'seed'], {
    DATABASE_URL: targetUrl,
    DIRECT_DATABASE_URL: targetUrl,
    NODE_ENV: 'production',
    PATH: binDir + path.delimiter + (process.env.PATH || process.env.Path || ''),
    SUPERADMIN_EMAIL: ADMIN_EMAIL,
    SUPERADMIN_PASSWORD: ADMIN_PASSWORD,
  });
}

// ---- probe sources ----------------------------------------------------------
const PROBE_DDL = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const admin = new PrismaClient({ datasources: { db: { url: process.env.ADMIN_URL } } });
const DB = process.env.DDL_DB, ACT = process.env.DDL_ACTION;
(async () => {
  const out = {};
  try {
    await admin.$connect();
    try { await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '" WITH (FORCE)'); }
    catch { await admin.$executeRawUnsafe("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='" + DB + "' AND pid<>pg_backend_pid()"); await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '"'); }
    if (ACT === 'create') await admin.$executeRawUnsafe('CREATE DATABASE "' + DB + '"');
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await admin.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

const PROBE_SUPERADMIN_COUNT = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    out.superadmins = await db.user.count({ where: { role: 'superadmin' } });
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// ---- static source teeth ----------------------------------------------------
function runStaticChecks() {
  const read = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };

  const ctrl = read('src/controller/superadmin/admin.management.controller.ts');
  ok(!!ctrl, '[static] admin.management.controller.ts missing.');
  ok(/req\.admin/.test(ctrl) && !/\(req as any\)\.user/.test(ctrl),
    '[static] admin.management.controller must identify the actor via req.admin (NOT the pre-existing (req as any).user bug).');
  ok(/sendSuccess\(/.test(ctrl),
    '[static] admin.management.controller must emit the { success:true, data } envelope via sendSuccess.');
  ok(/adminAuditLog\.create/.test(ctrl),
    '[static] admin.management.controller must append AdminAuditLog rows (Security Log feed).');

  const routes = read('src/routes/admin.management.routes.ts');
  ok(/adminSecurityStack/.test(routes),
    '[static] admin.management.routes must guard with adminSecurityStack.');

  const app = read('src/app.ts');
  ok(/adminManagementRoutes/.test(app),
    '[static] app.ts must mount adminManagementRoutes.');

  const authSvc = read('src/services/auth/auth.service.ts');
  ok(/allow_new_registrations/.test(authSvc) && /platformSettings/.test(authSvc),
    '[static] auth.service.signup must enforce PlatformSettings.allow_new_registrations.');

  // The kill-switch must ALSO gate Google OAuth new-user creation, else it is bypassable via
  // "Continue with Google" (the enforcement would be a lie).
  const googleSvc = read('src/services/auth/googleAuth.service.ts');
  ok(/allow_new_registrations/.test(googleSvc) && /platformSettings/.test(googleSvc),
    '[static] googleAuth.service must ALSO enforce allow_new_registrations on brand-new OAuth users (else the kill-switch is bypassable).');
}

// ---- HTTP helpers ------------------------------------------------------------
const H = (t) => (t ? { authorization: `Bearer ${t}` } : {});
const jget = (p, t) => fetch(`${BASE}${p}`, { headers: H(t), signal: AbortSignal.timeout(15000) });
const jpost = (p, body, t) => fetch(`${BASE}${p}`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...H(t) },
  body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20000),
});
const jput = (p, body, t) => fetch(`${BASE}${p}`, {
  method: 'PUT', headers: { 'content-type': 'application/json', ...H(t) },
  body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20000),
});
const jdelete = (p, t) => fetch(`${BASE}${p}`, { method: 'DELETE', headers: H(t), signal: AbortSignal.timeout(15000) });
const readJson = async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) });

let signupSeq = 0;
async function signup(role = 'candidate') {
  const email = `w4e2e+${Date.now()}_${signupSeq++}@local.test`;
  const password = 'secret123';
  const res = await jpost('/api/v1/auth/signup', { email, password, full_name: 'W4 E2E', role });
  const body = await res.json().catch(() => ({}));
  return { email, password, status: res.status, token: body?.data?.token || null };
}

/** Full superadmin MFA login → session token (mirrors verify-wave3-e2e). */
async function superadminLogin() {
  let speakeasy;
  try { speakeasy = backendRequire('speakeasy'); } catch { errors.push('[setup] speakeasy not resolvable from backend.'); return null; }
  const login = await readJson(await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
  const tempToken = login.body?.data?.tempToken;
  if (login.status !== 200 || !tempToken) { errors.push(`[setup] superadmin login failed (status ${login.status}).`); return null; }
  const setup = await readJson(await jpost('/api/v1/admin/auth/setup-mfa', { tempToken }));
  const secret = setup.body?.data?.secret;
  if (!secret) { errors.push(`[setup] admin setup-mfa did not return a secret (status ${setup.status}).`); return null; }
  const mfaToken = speakeasy.totp({ secret, encoding: 'base32' });
  const verify = await readJson(await jpost('/api/v1/admin/auth/verify-mfa', { tempToken, mfaToken }));
  const sessionToken = verify.body?.data?.sessionToken;
  if (verify.status !== 200 || !sessionToken) { errors.push(`[setup] admin verify-mfa failed (status ${verify.status}).`); return null; }
  return sessionToken;
}

async function bootServer(targetUrl, stubUrl) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    RETENTION_ENABLED: 'false',
    PORT: String(HTTP_PORT),
    DATABASE_URL: `${targetUrl}?connection_limit=5&pool_timeout=20&application_name=${THROWAWAY_DB}`,
    DIRECT_DATABASE_URL: targetUrl,
    ADMIN_JWT_SECRET: 'w4-e2e-admin-secret',
    BACKEND_URL: BASE,
    AI_SERVICE_URL: stubUrl,
    DOC_VALIDATOR_URL: stubUrl,
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
    RATE_LIMIT_FORCE_MEMORY: '1', RATE_LIMIT_AUTH_MAX: '1000', RATE_LIMIT_GLOBAL_MAX: '5000',
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false; child.on('exit', () => { exitedEarly = true; });

  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    if (exitedEarly) break;
    try {
      const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200 && (await res.json().catch(() => ({})))?.db === 'up') { ready = true; break; }
    } catch { /* not up yet */ }
    await sleep(600);
  }
  return { child, ready, getLog: () => log };
}

// ---- main --------------------------------------------------------------------
async function main() {
  runStaticChecks();

  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found — run pnpm install in backend.`); return; }
  if (!fs.existsSync(TSX_CLI)) { errors.push(`tsx not found — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`); return; }
  if (await tcpReachable('127.0.0.1', HTTP_PORT, 500)) { errors.push(`port ${HTTP_PORT} already in use (stale test server?).`); return; }
  if (errors.length) return; // static failures are terminal

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);

  const stub = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', ok: true }));
  });
  await new Promise((r) => stub.listen(0, '127.0.0.1', r));
  const stubUrl = `http://127.0.0.1:${stub.address().port}`;

  let created = false;
  let server = null;
  try {
    // ===== [A] empty DB → migrate deploy → seed =====
    const c = runProbe('.__w4_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`[A] create ${THROWAWAY_DB} failed: ${c.error}`); return; }
    created = true;

    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) { errors.push(`[A] migrate deploy FAILED: ${`${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }

    const s = seedProd(targetUrl);
    if (s.status !== 0) { errors.push(`[A] prod seed failed: ${`${s.stdout || ''}${s.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); return; }
    const cnt = runProbe('.__w4_counts.ts', PROBE_SUPERADMIN_COUNT, { TARGET_URL: targetUrl }, 60000);
    if (!cnt.ok || cnt.superadmins !== 1) { errors.push(`[A] expected exactly 1 loginable superadmin after prod seed, got ${JSON.stringify(cnt)}.`); return; }
    console.log('  [A] empty DB → migrate deploy → prod seed OK (1 superadmin, no demo).');

    // ===== [B] boot + /health db:up =====
    server = await bootServer(targetUrl, stubUrl);
    if (!server.ready) {
      errors.push(`[B] backend did not become healthy on ${BASE}. Log tail:\n    ${server.getLog().split(/\r?\n/).filter(Boolean).slice(-12).join('\n    ')}`);
      return;
    }
    console.log('  [B] boot OK — GET /health returns 200 {db:"up"}.');

    const token = await superadminLogin();
    if (!token) return; // setup errors already pushed
    console.log('  [setup] superadmin MFA login OK — session token minted.');

    // ===== [M0] no-404 wall: mounted + guarded + enveloped =====
    {
      const routes = ['/api/v1/admin/admins', '/api/v1/admin/me', '/api/v1/admin/settings/platform', '/api/v1/admin/analytics/overview', '/api/v1/admin/audit-logs'];
      for (const r of routes) {
        const withTok = await readJson(await jget(r, token));
        const noTok = await jget(r, null);
        ok(withTok.status === 200 && withTok.body?.success === true,
          `[M0] ${r} with token expected 200 {success:true}, got ${withTok.status} ${JSON.stringify(withTok.body).slice(0, 120)}.`);
        ok(noTok.status === 401,
          `[M0] ${r} without a token expected 401 (mounted+guarded, not a 404-shadow), got ${noTok.status}.`);
      }
      if (!errors.some((e) => e.startsWith('[M0]'))) console.log('  [M0] OK — all 4 admin pages reachable (200 enveloped) + default-deny (401). No 404 dead-ends.');
    }

    // ===== [M1] Admins CRUD round-trip + validation =====
    let createdId = null;
    {
      const email = `w4-new-admin+${Date.now()}@local.test`;
      const create = await readJson(await jpost('/api/v1/admin/admins', { email, full_name: 'New Admin', password: 'supersecret1' }, token));
      ok(create.status === 201 && create.body?.data?.user_id, `[M1] create admin expected 201 + data.user_id, got ${create.status} ${JSON.stringify(create.body).slice(0, 140)}.`);
      createdId = create.body?.data?.user_id || null;
      ok(create.body?.data?.password_hash === undefined, '[M1] create admin response must NOT leak password_hash.');

      const list1 = await readJson(await jget('/api/v1/admin/admins', token));
      ok(Array.isArray(list1.body?.data) && list1.body.data.some((a) => a.user_id === createdId),
        '[M1] newly-created admin must appear in GET /admin/admins.');

      // validation: short password → 400; duplicate email → 409
      const shortPw = await readJson(await jpost('/api/v1/admin/admins', { email: `w4-short+${Date.now()}@local.test`, full_name: 'X', password: 'abc' }, token));
      ok(shortPw.status === 400, `[M1] short password expected 400, got ${shortPw.status}.`);
      const dup = await readJson(await jpost('/api/v1/admin/admins', { email, full_name: 'Dup', password: 'supersecret1' }, token));
      ok(dup.status === 409, `[M1] duplicate email expected 409, got ${dup.status}.`);

      if (createdId) {
        const del = await readJson(await jdelete(`/api/v1/admin/admins/${createdId}`, token));
        ok(del.status === 200 && del.body?.data?.deleted === true, `[M1] delete admin expected 200 {deleted:true}, got ${del.status}.`);
        const list2 = await readJson(await jget('/api/v1/admin/admins', token));
        ok(Array.isArray(list2.body?.data) && !list2.body.data.some((a) => a.user_id === createdId),
          '[M1] deleted admin must NO LONGER appear in GET /admin/admins.');
      }
      if (!errors.some((e) => e.startsWith('[M1]'))) console.log('  [M1] OK — Admins create→list→delete round-trip; short-pw 400; dup-email 409.');
    }

    // ===== [M2] delete-guard (DATA-LOSS): cannot delete self =====
    // Create a SECOND admin first so ≥2 admins exist — this isolates the self-guard from the
    // last-admin guard (with 2 admins, only the self-check can produce the 400). Fail-provable:
    // dropping the `id === actor.user_id` check in deleteAdmin turns this 400 into a 200 (the
    // logged-in admin actually deletes their own account → self-lockout).
    {
      const bEmail = `w4-guard-peer+${Date.now()}@local.test`;
      const peer = await readJson(await jpost('/api/v1/admin/admins', { email: bEmail, full_name: 'Peer Admin', password: 'supersecret1' }, token));
      const peerId = peer.body?.data?.user_id;
      ok(peer.status === 201 && !!peerId, '[M2] precondition: failed to create a 2nd admin (needed to isolate the self-guard).');

      const me = await readJson(await jget('/api/v1/admin/me', token));
      const selfId = me.body?.data?.user_id;
      ok(!!selfId, '[M2] GET /admin/me did not return own user_id (precondition).');
      if (selfId) {
        const selfDel = await readJson(await jdelete(`/api/v1/admin/admins/${selfId}`, token));
        ok(selfDel.status === 400 && selfDel.body?.success === false,
          `[M2] deleting your OWN admin id MUST be refused 400 (self-lockout guard, with a 2nd admin present so last-admin guard is inactive), got ${selfDel.status} ${JSON.stringify(selfDel.body).slice(0, 140)}.`);
        // prove it was NOT deleted: still authorized
        const still = await readJson(await jget('/api/v1/admin/me', token));
        ok(still.status === 200, '[M2] own account must remain intact after a refused self-delete.');
      }
      // clean up the peer so the audit/list state stays tidy for [M4]
      if (peerId) await jdelete(`/api/v1/admin/admins/${peerId}`, token);
      if (!errors.some((e) => e.startsWith('[M2]'))) console.log('  [M2] OK — self-delete refused 400 (isolated self-guard); own account intact (fail-provable data-loss guard).');
    }

    // ===== [M3] Settings persist + platform setting really enforced =====
    {
      const newName = `Renamed Admin ${Date.now()}`;
      const upd = await readJson(await jput('/api/v1/admin/me', { full_name: newName }, token));
      ok(upd.status === 200, `[M3] PUT /admin/me expected 200, got ${upd.status}.`);
      const meAfter = await readJson(await jget('/api/v1/admin/me', token));
      ok(meAfter.body?.data?.full_name === newName, `[M3] profile name did not persist (expected "${newName}", got "${meAfter.body?.data?.full_name}").`);

      // platform: turn OFF registrations → a real signup must be refused 403; then back ON.
      const off = await readJson(await jput('/api/v1/admin/settings/platform', { allow_new_registrations: false }, token));
      ok(off.status === 200 && off.body?.data?.allow_new_registrations === false, `[M3] PUT settings {allow_new_registrations:false} did not persist, got ${JSON.stringify(off.body).slice(0, 140)}.`);
      const getOff = await readJson(await jget('/api/v1/admin/settings/platform', token));
      ok(getOff.body?.data?.allow_new_registrations === false, '[M3] platform setting did not read back false.');

      const blocked = await signup('candidate');
      ok(blocked.status === 403, `[M3] with registrations OFF, a public signup MUST be refused 403 (enforced in auth.service), got ${blocked.status}.`);

      const on = await readJson(await jput('/api/v1/admin/settings/platform', { allow_new_registrations: true }, token));
      ok(on.status === 200 && on.body?.data?.allow_new_registrations === true, '[M3] failed to re-enable registrations.');
      const allowed = await signup('candidate');
      ok(allowed.status === 201, `[M3] with registrations back ON, signup must 201, got ${allowed.status}.`);
      if (!errors.some((e) => e.startsWith('[M3]'))) console.log('  [M3] OK — profile name persists; allow_new_registrations toggle is really enforced (403 off → 201 on).');
    }

    // ===== [M4] Security Log is real (reads AdminAuditLog; shows [M1] actions) =====
    {
      const logs = await readJson(await jget('/api/v1/admin/audit-logs?limit=100', token));
      ok(logs.status === 200 && Array.isArray(logs.body?.data?.items), `[M4] audit-logs expected 200 + data.items[], got ${logs.status}.`);
      const items = logs.body?.data?.items || [];
      ok(items.some((i) => i.action_type === 'CREATE_ADMIN'), '[M4] audit trail missing the CREATE_ADMIN action from [M1].');
      ok(items.some((i) => i.action_type === 'DELETE_ADMIN'), '[M4] audit trail missing the DELETE_ADMIN action from [M1].');
      ok(items.some((i) => i.admin && i.admin.email === ADMIN_EMAIL), '[M4] audit rows must carry the acting admin (joined name/email).');
      if (!errors.some((e) => e.startsWith('[M4]'))) console.log('  [M4] OK — Security Log reads real AdminAuditLog rows (CREATE_ADMIN/DELETE_ADMIN with acting admin).');
    }
  } finally {
    if (server && server.child) killTree(server.child.pid);
    try { stub.close(); } catch { /* ignore */ }
    if (created) {
      const d = runProbe('.__w4_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000);
      if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop ${THROWAWAY_DB}: ${d.error}`);
    }
  }

  if (errors.length && server && typeof server.getLog === 'function') {
    const tail = server.getLog().split(/\r?\n/).filter(Boolean).slice(-14).join('\n    ');
    if (tail.trim()) errors.push(`--- backend log tail ---\n    ${tail}`);
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error(`\n❌ verify-wave4-e2e FAILED (${errors.length}):`);
      for (const e of errors) console.error('  • ' + e);
      process.exit(1);
    }
    console.log('\n✅ verify-wave4-e2e PASSED — admin sidebar leg (Admins/Settings/Analytics/Security Log) is real, mounted, guarded, persistent.');
    process.exit(0);
  })
  .catch((e) => { console.error('verify-wave4-e2e ERROR', e); process.exit(1); });

#!/usr/bin/env node
/**
 * verify-wave3-e2e.mjs — Wave 3 / Session 6 (gate) — INFRA
 *
 * The COMPOSED Wave-3 correctness/wiring journey on ONE fresh throwaway DB, in one
 * continuous flow — proving the canonical journeys this wave fixed have NO silent
 * dead-ends and speak a consistent response envelope. Everything runs on a self-created
 * throwaway (`hiralent_w3_e2e`); the primary `hiralent` is NEVER touched.
 *
 *   [A] empty DB → migrate deploy → prod seed (loginable superadmin, no demo data).
 *   [B] boot the REAL backend; readiness IS GET /health returning {db:"up"}.
 *
 * Then, against the live server:
 *   [refresh] The confirmed silent bug: POST /auth/refresh returns the new token under
 *             `data.token` (envelope R-36). A candidate signs up, refreshes, and the NEW
 *             token authorizes GET /auth/me. A garbage refresh token → 401. (If the backend
 *             regressed to a top-level `token`, the frontend `refresh.ts` read breaks and
 *             users are logged out every ~15m — this asserts the shape that fix depends on.)
 *   [J1]      Admin → agency approve (R-22 path): superadmin full MFA login → a PENDING
 *             agency (seeded) is approved with the session token → 200, {success:true,
 *             data.status:'APPROVED'}. NEGATIVE: approve with NO token → 401 (guarded).
 *             ENVELOPE: approving an unknown id → {success:false, error:{code,message}}.
 *   [J4]      Sign out other devices (R-25): a 2nd MFA session terminates the 1st →
 *             terminated_count>=1 and the 1st token then 401s. (Live socket receipts are
 *             separately proven by verify-session-realtime; here it rides the composed flow.)
 *   [J3]      Chat wiring: create conversation + send message → 201 with data.conversation_id
 *             / data.message_id (envelope). (Live socket round-trip: verify-session-realtime.)
 *   [J2]      Resume → autofill (R-24): the autofill-preview route is mounted + auth-guarded
 *             (no token → 401, i.e. a REAL endpoint, not the dangling dead-end R-24 implied).
 *             STATIC: the dead `triggerResumeExtraction` / `/resume/extract` call is gone.
 *   [J5]      Deep document-validation webhook (R-26): the callback receiver is mounted at
 *             /api/v1/webhooks/document-validation and enforces the internal token —
 *             no header → 401, wrong token → 403, correct token → 200 (result reaches the
 *             backend). STATIC: the client builds the callback from getBackendUrl (:5000).
 *
 * Static teeth also assert admin.agency now emits the envelope via sendSuccess. Probes are
 * tsx files written INTO backend/ (pnpm resolves @prisma/client), run via the backend's own
 * tsx, results parsed from a `__RESULT__` sentinel — the shared idiom of verify-e2e-fullpath /
 * verify-seed-safety. Throwaway DB dropped in `finally`. AI + doc-validator services are NOT
 * booted; their URLs point at a local stub so no real network call escapes.
 *
 * Exit 0 => the whole path holds. Exit 1 => prints the exact failing stage. Node built-ins +
 * backend speakeasy (createRequire) only. Windows-safe. Fails loudly if Postgres / prisma CLI /
 * tsx / port 5095 is unavailable.
 *
 * Usage: node hiralent-master-plan/tools/verify-wave3-e2e.mjs
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
const HTTP_PORT = 5095; // free slot (5090..5099: 5095 unused)
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const THROWAWAY_DB = 'hiralent_w3_e2e'; // NEVER the primary `hiralent`

const ADMIN_EMAIL = 'admin@hiralent.com';
const ADMIN_PASSWORD = 'hiralent1234@';
const INTERNAL_TOKEN = 'w3-e2e-internal-token';

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

// Create ONE pending RELOCATION agency and return its id — the subject of the J1 approve journey.
const PROBE_CREATE_AGENCY = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    const a = await db.agency.create({
      data: { name: process.env.AG_NAME, email: process.env.AG_EMAIL, type: 'RELOCATION', status: 'PENDING' },
      select: { agency_id: true, status: true },
    });
    out.agency_id = a.agency_id; out.status = a.status; out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// ---- static source teeth ----------------------------------------------------
function runStaticChecks() {
  const read = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };

  // R-24: the dangling resume-extract dead code must be gone.
  const profileSvc = read('src/services/profile.service.ts');
  ok(!/triggerResumeExtraction/.test(profileSvc),
    '[static] R-24: triggerResumeExtraction still present in profile.service.ts (dead /resume/extract not removed).');
  ok(!/\/resume\/extract/.test(profileSvc),
    '[static] R-24: a /resume/extract call still exists in profile.service.ts.');

  // R-36 (journey slice): admin.agency now emits the envelope via sendSuccess.
  const adminAgency = read('src/controller/superadmin/admin.agency.controller.ts');
  ok(/sendSuccess\(/.test(adminAgency),
    '[static] admin.agency.controller does not use sendSuccess (envelope normalization missing).');
  ok(!/success:\s*false,\s*\n\s*message:/.test(adminAgency) || /throw new (Bad|Not)/.test(adminAgency),
    '[static] admin.agency.controller still hand-rolls {success:false,message} instead of typed errors.');

  // R-26: the doc-validator client builds its callback from getBackendUrl (the :5000 fix).
  const docClient = read('src/clients/document-validator.client.ts');
  ok(/getBackendUrl\(\)/.test(docClient) && /\/api\/v1\/webhooks\/document-validation/.test(docClient),
    '[static] R-26: document-validator.client no longer builds the callback from getBackendUrl()/webhooks path.');
}

// ---- HTTP helpers ------------------------------------------------------------
const H = (t) => (t ? { authorization: `Bearer ${t}` } : {});
const jget = (p, t) => fetch(`${BASE}${p}`, { headers: H(t), signal: AbortSignal.timeout(15000) });
const jpost = (p, body, t) => fetch(`${BASE}${p}`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...H(t) },
  body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20000),
});
const jdelete = (p, t) => fetch(`${BASE}${p}`, { method: 'DELETE', headers: H(t), signal: AbortSignal.timeout(15000) });
const readJson = async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) });

let signupSeq = 0;
async function signup(role = 'candidate') {
  const email = `w3e2e+${Date.now()}_${signupSeq++}@local.test`;
  const password = 'secret123';
  const res = await jpost('/api/v1/auth/signup', { email, password, full_name: 'W3 E2E', role });
  const body = await res.json().catch(() => ({}));
  return {
    email, password, status: res.status,
    token: body?.data?.token || null,
    refreshToken: body?.data?.refreshToken || null,
    userId: body?.data?.user?.user_id || body?.data?.user?.id || null,
  };
}

/** Real first-time 2FA login for an existing user → a NEW session's access token. */
async function mfaLogin(email, password) {
  let speakeasy;
  try { speakeasy = backendRequire('speakeasy'); }
  catch { errors.push('[setup] speakeasy not resolvable from backend.'); return null; }
  const login = await readJson(await jpost('/api/v1/auth/login', { email, password }));
  const tempToken = login.body?.data?.tempToken;
  if (!tempToken) { errors.push(`[setup] candidate login did not return tempToken (status ${login.status}).`); return null; }
  const setup = await readJson(await jpost('/api/v1/auth/2fa/setup-with-token', { tempToken }));
  const secret = setup.body?.data?.manualCode;
  if (!secret) { errors.push(`[setup] 2fa/setup-with-token did not return manualCode (status ${setup.status}).`); return null; }
  const code = speakeasy.totp({ secret, encoding: 'base32' });
  const verify = await readJson(await jpost('/api/v1/auth/2fa/verify-login', { tempToken, mfaToken: code }));
  return verify.body?.data?.token || null;
}

/** Full superadmin MFA login → session token (mirrors verify-e2e-fullpath [D]). */
async function superadminLogin() {
  let speakeasy;
  try { speakeasy = backendRequire('speakeasy'); } catch { return null; }
  const login = await readJson(await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
  const tempToken = login.body?.data?.tempToken;
  if (login.status !== 200 || !tempToken) { errors.push(`[J1] superadmin login failed (status ${login.status}).`); return null; }
  const setup = await readJson(await jpost('/api/v1/admin/auth/setup-mfa', { tempToken }));
  const secret = setup.body?.data?.secret;
  if (!secret) { errors.push(`[J1] admin setup-mfa did not return a secret (status ${setup.status}).`); return null; }
  const mfaToken = speakeasy.totp({ secret, encoding: 'base32' });
  const verify = await readJson(await jpost('/api/v1/admin/auth/verify-mfa', { tempToken, mfaToken }));
  const sessionToken = verify.body?.data?.sessionToken;
  if (verify.status !== 200 || !sessionToken) { errors.push(`[J1] admin verify-mfa failed (status ${verify.status}).`); return null; }
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
    ADMIN_JWT_SECRET: 'w3-e2e-admin-secret',
    // R-26: the webhook is guarded by the internal token; set it so the receiver can be exercised.
    BACKEND_INTERNAL_TOKEN: INTERNAL_TOKEN,
    // Backend self URL (callback base) + external services point at a local stub — nothing real is contacted.
    BACKEND_URL: BASE,
    AI_SERVICE_URL: stubUrl,
    DOC_VALIDATOR_URL: stubUrl,
    // Dead SMTP so email is fire-and-forget (never blocks approve/signup).
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
    // Neutralise rate limiting so the journey's bursts reach the handlers.
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

  // A local stub stands in for ai-service + document-validator-service (never boot Python).
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
    const c = runProbe('.__w3_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`[A] create ${THROWAWAY_DB} failed: ${c.error}`); return; }
    created = true;

    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) { errors.push(`[A] migrate deploy FAILED: ${`${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }

    const s = seedProd(targetUrl);
    if (s.status !== 0) { errors.push(`[A] prod seed failed: ${`${s.stdout || ''}${s.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); return; }
    const cnt = runProbe('.__w3_counts.ts', PROBE_SUPERADMIN_COUNT, { TARGET_URL: targetUrl }, 60000);
    if (!cnt.ok || cnt.superadmins !== 1) { errors.push(`[A] expected exactly 1 loginable superadmin after prod seed, got ${JSON.stringify(cnt)}.`); return; }
    console.log('  [A] empty DB → migrate deploy → prod seed OK (1 superadmin, no demo).');

    // ===== [B] boot + /health db:up =====
    server = await bootServer(targetUrl, stubUrl);
    if (!server.ready) {
      errors.push(`[B] backend did not become healthy on ${BASE}. Log tail:\n    ${server.getLog().split(/\r?\n/).filter(Boolean).slice(-12).join('\n    ')}`);
      return;
    }
    console.log('  [B] boot OK — GET /health returns 200 {db:"up"}.');

    // ===== [refresh] the confirmed silent bug: token rotates under data.token =====
    {
      const u = await signup('candidate');
      ok(u.status === 201 && !!u.token, `[refresh] candidate signup expected 201 + token, got ${u.status}.`);
      ok(!!u.refreshToken, '[refresh] signup did not return a refreshToken (the rotation input).');
      if (u.refreshToken) {
        const r = await readJson(await jpost('/api/v1/auth/refresh', { refreshToken: u.refreshToken }));
        ok(r.status === 200, `[refresh] POST /auth/refresh expected 200, got ${r.status}.`);
        const newToken = r.body?.data?.token;
        ok(!!newToken, '[refresh] refresh response has no data.token — the exact shape frontend refresh.ts reads (regression = silent logout every ~15m).');
        if (newToken) {
          const meNew = await jget('/api/v1/auth/me', newToken);
          ok(meNew.status === 200, `[refresh] the rotated token did NOT authorize /auth/me (status ${meNew.status}).`);
        }
        const bad = await readJson(await jpost('/api/v1/auth/refresh', { refreshToken: 'not-a-real-token' }));
        ok(bad.status === 401, `[refresh] a garbage refresh token must 401, got ${bad.status} (negative control).`);
      }
      if (!errors.some((e) => e.startsWith('[refresh]'))) console.log('  [refresh] OK — token rotates under data.token; new token authorizes /me; bad token → 401.');
    }

    // ===== [J1] admin → agency approve (R-22 path) =====
    {
      const sessionToken = await superadminLogin();
      if (sessionToken) {
        const ag = runProbe('.__w3_agency.ts', PROBE_CREATE_AGENCY,
          { TARGET_URL: targetUrl, AG_NAME: 'E2E Relocation Agency', AG_EMAIL: `w3agency+${Date.now()}@local.test` }, 60000);
        if (!ag.ok || !ag.agency_id) { errors.push(`[J1] failed to seed a PENDING agency: ${JSON.stringify(ag)}`); }
        else {
          // NEGATIVE: no token → guarded (not a 404 dead-end).
          const noTok = await jpost(`/api/v1/admin/agencies/${ag.agency_id}/approve`, {}, null);
          ok(noTok.status === 401 || noTok.status === 403, `[J1] approve without a token must be 401/403, got ${noTok.status}.`);

          // Approve with the real session token.
          const appr = await readJson(await jpost(`/api/v1/admin/agencies/${ag.agency_id}/approve`, {}, sessionToken));
          ok(appr.status === 200, `[J1] approve expected 200, got ${appr.status} body=${JSON.stringify(appr.body).slice(0, 160)}.`);
          ok(appr.body?.success === true && appr.body?.data?.status === 'APPROVED',
            `[J1] approve envelope wrong: expected {success:true,data.status:'APPROVED'}, got ${JSON.stringify(appr.body).slice(0, 160)}.`);

          // ENVELOPE: unknown id → typed error envelope.
          const missing = await readJson(await jpost('/api/v1/admin/agencies/00000000-0000-0000-0000-000000000000/approve', {}, sessionToken));
          ok(missing.status === 404, `[J1] approve unknown id expected 404, got ${missing.status}.`);
          ok(missing.body?.success === false && !!missing.body?.error?.code && !!missing.body?.error?.message,
            `[J1] error envelope wrong: expected {success:false,error:{code,message}}, got ${JSON.stringify(missing.body).slice(0, 160)}.`);

          // SECURITY (account-takeover guard): a PENDING agency whose email ALREADY belongs to
          // a different existing account must NOT be approvable — otherwise approve would silently
          // escalate that account's role to agency_admin and reset its password (hijack/lockout).
          // Fail-provable: reverting the guard in approveAgency turns this 400 into a 200.
          const victim = await signup('candidate'); // a real existing user with a known email
          if (victim.email) {
            const clash = runProbe('.__w3_clash_agency.ts', PROBE_CREATE_AGENCY,
              { TARGET_URL: targetUrl, AG_NAME: 'E2E Clash Agency', AG_EMAIL: victim.email }, 60000);
            if (!clash.ok || !clash.agency_id) {
              errors.push(`[J1] failed to seed the email-clash agency: ${JSON.stringify(clash)}`);
            } else {
              const hijack = await readJson(await jpost(`/api/v1/admin/agencies/${clash.agency_id}/approve`, {}, sessionToken));
              ok(hijack.status === 400 && hijack.body?.success === false,
                `[J1] approving an agency whose email collides with an existing account MUST be refused (400), got ${hijack.status} ${JSON.stringify(hijack.body).slice(0, 160)}.`);
              // And prove the victim's account was NOT mutated: their original login still works.
              const stillCandidate = await mfaLogin(victim.email, victim.password);
              ok(!!stillCandidate, `[J1] the colliding account must remain intact after a refused approve (its original login must still succeed).`);
            }
          }
          if (!errors.some((e) => e.startsWith('[J1]'))) console.log('  [J1] OK — approves a pending agency (200, APPROVED); no-token 401; unknown-id 404 envelope; email-clash approve refused 400 + victim account intact.');
        }
      }
    }

    // ===== [J4] sign out other devices (R-25) rides the composed flow =====
    {
      const u = await signup('candidate');
      ok(!!u.token, '[J4] candidate signup did not return a token (precondition — a vacuous skip would hide a broken signup).');
      if (u.token) {
        const tokenC = await mfaLogin(u.email, u.password); // 2nd session
        ok(!!tokenC, '[J4] mfaLogin did not yield a 2nd-session token (precondition).');
        if (tokenC) {
          ok((await jget('/api/v1/auth/me', u.token)).status === 200, '[J4] session #1 should be live before terminate.');
          const term = await readJson(await jdelete('/api/v1/auth/sessions/others/terminate', tokenC));
          ok(term.status === 200, `[J4] terminate-others expected 200, got ${term.status}.`);
          ok((term.body?.terminated_count ?? 0) >= 1, '[J4] terminate-others should report terminated_count >= 1.');
          ok((await jget('/api/v1/auth/me', u.token)).status === 401, '[J4] session #1 token MUST 401 after sign-out-other-devices.');
          if (!errors.some((e) => e.startsWith('[J4]'))) console.log('  [J4] OK — 2nd session revokes the 1st (R-25).');
        }
      }
    }

    // ===== [J3] chat wiring (envelope) =====
    {
      const a = await signup('candidate');
      const b = await signup('candidate');
      ok(!!a.token && !!b.userId, '[J3] chat signups did not yield token + userId (precondition — a vacuous skip would hide broken signup/messaging).');
      if (a.token && b.userId) {
        const conv = await readJson(await jpost('/api/v1/messages/conversations', { participant_id: b.userId, initial_message: 'hi' }, a.token));
        const convId = conv.body?.data?.conversation_id;
        ok(conv.status === 201 && !!convId, `[J3] create conversation expected 201 + data.conversation_id, got ${conv.status}.`);
        if (convId) {
          const msg = await readJson(await jpost(`/api/v1/messages/conversations/${convId}/messages`, { content: 'hello', message_type: 'text' }, a.token));
          ok(msg.status === 201 && !!msg.body?.data?.message_id, `[J3] send message expected 201 + data.message_id, got ${msg.status}.`);
        }
        if (!errors.some((e) => e.startsWith('[J3]'))) console.log('  [J3] OK — conversation + message create return the envelope.');
      }
    }

    // ===== [J2] resume → autofill route is real + guarded (R-24) =====
    {
      const noTok = await jpost('/api/v1/candidates/profile/autofill/preview', { document_id: 'x' }, null);
      ok(noTok.status === 401, `[J2] autofill-preview without a token must 401 (a real, guarded endpoint — not the dangling dead-end), got ${noTok.status}.`);
      if (!errors.some((e) => e.startsWith('[J2]'))) console.log('  [J2] OK — autofill-preview mounted + auth-guarded; dead /resume/extract removed (static).');
    }

    // ===== [J5] deep-validation webhook (R-26) =====
    {
      const wh = '/api/v1/webhooks/document-validation';
      const payload = { validation_job_id: 'job-e2e', document_id: 'doc-unknown-e2e', status: 'completed', overall_status: 'passed' };
      const noHdr = await fetch(`${BASE}${wh}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      ok(noHdr.status === 401, `[J5] webhook without Authorization must 401, got ${noHdr.status}.`);
      const wrong = await jpost(wh, payload, 'the-wrong-internal-token');
      ok(wrong.status === 403, `[J5] webhook with a wrong internal token must 403, got ${wrong.status} (negative control).`);
      const good = await readJson(await jpost(wh, payload, INTERNAL_TOKEN));
      // HONEST SCOPE (do not overclaim): this proves the receiver is reachable, auth-guarded,
      // and that its handler BODY actually executed the DB-lookup path — the `doc-unknown-e2e`
      // id is intentionally absent, so a correct 200 whose message mentions "not found" is proof
      // the handler ran its prisma lookup (not a blanket ack). It does NOT exercise the real
      // persistence path (seeded CaseDocument → status/ai_validation fields updated), nor does it
      // boot the Python document-validator. Those remain unverified-live here; see the J5 note.
      const ranHandler = good.status === 200 && good.body?.ok === true &&
        /not found/i.test(String(good.body?.message || ''));
      ok(ranHandler, `[J5] webhook with the correct internal token must 200 {ok:true} AND hit the document-lookup path (message ~ "not found"), got ${good.status} ${JSON.stringify(good.body).slice(0, 120)}.`);
      if (!errors.some((e) => e.startsWith('[J5]'))) console.log('  [J5] OK — webhook mounted at the R-26 path; no-header 401, wrong-token 403, correct-token 200 + handler ran DB lookup. NOTE: real CaseDocument persistence + live Python validator NOT exercised here.');
    }
  } finally {
    if (server && server.child) killTree(server.child.pid);
    try { stub.close(); } catch { /* ignore */ }
    if (created) {
      const d = runProbe('.__w3_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000);
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
      console.error('\n✗ FAIL: Wave-3 composed journey did not hold:');
      for (const e of errors) console.error(`  - ${e}`);
      console.error(`\n${errors.length} problem(s).`);
      process.exit(1);
    }
    console.log('\n✅ PASS: one fresh DB, one continuous flow — migrate+seed → boot (/health db:up) → token refresh rotates under data.token → superadmin approves a pending agency (envelope + guarded + typed-error) → sign-out-other-devices revokes the 1st session → chat conversation/message envelope → autofill route guarded + dead /resume/extract gone → deep-validation webhook mounted & internal-token-guarded + handler DB-lookup path. Canonical journeys have no silent dead-ends. Primary DB untouched.');
    console.log('   SCOPE CAVEAT (not overclaimed): J2 (autofill) verifies the route is mounted+guarded, NOT that extraction populates fields; J5 (webhook) verifies reach+auth+handler-ran, NOT real CaseDocument persistence. Neither boots the Python services — their live cross-service wiring is not proven by this gate.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });

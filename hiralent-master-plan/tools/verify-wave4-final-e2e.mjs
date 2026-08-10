#!/usr/bin/env node
/**
 * verify-wave4-final-e2e.mjs — Wave 4 / Session 9 (final composed gate) — INFRA
 *
 * The COMPOSED cross-role journey for the Wave-4 feature set, on ONE fresh throwaway DB, in one
 * continuous boot. Where the per-slice Wave-4 verifiers each prove one thing, this proves the roles
 * INTERLOCK: a superadmin action (close registrations) actually blocks the candidate/company/agency
 * onboarding path, and the admin dead-end pages + audit trail are real end-to-end. Everything runs
 * on a self-created throwaway (`hiralent_w4_final_e2e`); the primary `hiralent` is NEVER touched.
 *
 *   [A] empty DB → migrate deploy       — provision + `prisma migrate deploy` the whole chain.
 *   [B] → prod-seed (1 superadmin)       — NODE_ENV=production + SUPERADMIN_PASSWORD → exactly one
 *                                          loginable superadmin, no demo data.
 *   [C] → boot + /health db:up           — boot the REAL backend (FORCE_INMEMORY for the queue,
 *                                          rate-limits neutralised) and wait for {db:"up"}.
 *   [D] 4-role onboarding                 — public signup for candidate + company_admin + agency_admin
 *                                          each → 201 with a token (superadmin signup is separately
 *                                          proven blocked by the role enum — not re-tested here).
 *   [E] candidate journey leg             — the authed candidate browses relocation agencies → 200
 *                                          enveloped array (the real search/list read path).
 *   [F] admin journey — MFA + 4 pages     — superadmin login→setup-mfa→verify-mfa (TOTP) → the four
 *                                          previously-dead pages (admins/me/analytics/settings/audit)
 *                                          each 200-enveloped; no-token → 401 (default-deny). Wrong
 *                                          password issues NO credential (negative control).
 *   [G] cross-role kill-switch (H2)       — admin PUT settings {allow_new_registrations:false} → a
 *                                          fresh candidate signup is REFUSED 403 → admin re-enables →
 *                                          signup 201 again. Then the audit trail's latest settings row
 *                                          DESCRIBES the change ("allow_new_registrations=false").
 *   [H] admins CRUD + H2 empty-body guard — POST /admins → 201; PUT settings {} → 400 (no no-op write);
 *                                          DELETE the created admin → 200.
 *
 * COVERED here = the backend-reachable Wave-4 backbone across all four roles. HONESTLY NOT covered
 * (need services that are down in this environment — flagged, not faked): AI assessment/coding/
 * interview (ai-service + runner-python), company OCR verification, agency document validation +
 * embassy/housing (doc-validator + external providers). Those are proven by their own slice verifiers
 * (verify-ai-content-safety, verify-sandbox-isolation, verify-external-integrations) — not re-claimed.
 *
 * Probe/boot idioms mirror verify-e2e-fullpath.mjs (throwaway DB, tsx probes into backend/, __RESULT__
 * sentinel). Exit 0 => the whole cross-role path holds. Exit 1 => prints the exact failing stage.
 * Node built-ins + global fetch only. Windows-safe. Fails loudly if Postgres / prisma / tsx / the port
 * is unavailable.
 *
 * Usage: node hiralent-master-plan/tools/verify-wave4-final-e2e.mjs
 */

import fs from 'node:fs';
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
const HTTP_PORT = 5096; // distinct from other INFRA verifiers
const HTTP_BASE = `http://127.0.0.1:${HTTP_PORT}`;
const THROWAWAY_DB = 'hiralent_w4_final_e2e'; // NEVER the primary `hiralent`

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
      if (m) { let v = m[1].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return v.split('?')[0]; }
    }
  } catch { /* ignore */ }
  return 'postgresql://postgres:postgres@localhost:5432/hiralent';
}
const withDbName = (base, db) => base.slice(0, base.lastIndexOf('/')) + '/' + db;

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
  } finally { try { fs.unlinkSync(probePath); } catch { /* ignore */ } }
}
function prisma(args, env, timeout = 180000) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND, encoding: 'utf8', timeout, env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024,
  });
}
function seedProd(targetUrl, extraEnv = {}) {
  const binDir = path.join(BACKEND, 'node_modules', '.bin');
  return prisma(['db', 'seed'], {
    DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl, NODE_ENV: 'production',
    PATH: binDir + path.delimiter + (process.env.PATH || process.env.Path || ''), ...extraEnv,
  });
}

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

const PROBE_COUNTS = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
(async () => {
  const out = {};
  try { await db.$connect();
    out.superadmins = await db.user.count({ where: { role: 'superadmin' } });
    out.candidates = await db.user.count({ where: { role: 'candidate' } });
    out.jobs = await db.companyJob.count();
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// Seed a handful of APPROVED relocation agencies so the candidate browse leg returns real rows.
const PROBE_SEED_AGENCIES = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
(async () => {
  const out = {};
  try { await db.$connect();
    await db.agency.createMany({ data: Array.from({ length: 5 }, (_, i) => ({ name: 'W4 Agency ' + i, type: 'RELOCATION', status: 'APPROVED' })) });
    out.agencies = await db.agency.count({ where: { type: 'RELOCATION', status: 'APPROVED' } });
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

async function bootServer(targetUrl) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_INMEMORY: '1',
    FORCE_SKIP_MONGO: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    RETENTION_ENABLED: 'false',
    PORT: String(HTTP_PORT),
    DATABASE_URL: `${targetUrl}?connection_limit=10&pool_timeout=20`,
    DIRECT_DATABASE_URL: targetUrl,
    ADMIN_JWT_SECRET: 'w4-final-e2e-admin-secret',
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
    RATE_LIMIT_FORCE_MEMORY: '1', RATE_LIMIT_AUTH_MAX: '5000', RATE_LIMIT_GLOBAL_MAX: '20000',
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], { cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false; child.on('exit', () => { exitedEarly = true; });
  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    if (exitedEarly) break;
    try {
      const res = await fetch(`${HTTP_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200) { const body = await res.json().catch(() => ({})); if (body.db === 'up') { ready = true; break; } }
    } catch { /* not up yet */ }
    await sleep(600);
  }
  return { child, ready, getLog: () => log };
}

// ---- HTTP helpers ----
async function jpost(p, body, token) {
  const res = await fetch(`${HTTP_BASE}${p}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function jput(p, body, token) {
  const res = await fetch(`${HTTP_BASE}${p}`, {
    method: 'PUT', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function jget(p, token) {
  const res = await fetch(`${HTTP_BASE}${p}`, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(20000) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function jdel(p, token) {
  const res = await fetch(`${HTTP_BASE}${p}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(20000) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function signup(role, tag) {
  return jpost('/api/v1/auth/signup', { email: `w4_${role}_${tag}@local.test`, password: 'secret123', full_name: `W4 ${role}`, role });
}

async function main() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found — run pnpm install in backend.`); return; }
  if (!fs.existsSync(TSX_CLI)) { errors.push(`tsx not found — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it before this gate.`); return; }
  if (await tcpReachable('127.0.0.1', HTTP_PORT, 500)) { errors.push(`port ${HTTP_PORT} already in use — free it before running this gate.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);
  const tag = String(Date.now());
  let created = false, server = null;

  try {
    // [A] create + migrate
    const c = runProbe('.__w4_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`[A] create ${THROWAWAY_DB} failed: ${c.error}`); return; }
    created = true;
    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) { errors.push(`[A] migrate deploy FAILED: ${`${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }
    console.log('  [A] empty DB → migrate deploy OK.');

    // [B] prod seed
    const s = seedProd(targetUrl, { SUPERADMIN_EMAIL: ADMIN_EMAIL, SUPERADMIN_PASSWORD: ADMIN_PASSWORD });
    if (s.status !== 0) { errors.push(`[B] prod seed failed: ${`${s.stdout || ''}${s.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); return; }
    const cnt = runProbe('.__w4_counts.ts', PROBE_COUNTS, { TARGET_URL: targetUrl }, 60000);
    if (!cnt.ok) { errors.push(`[B] counts probe failed: ${cnt.error}`); return; }
    if (cnt.superadmins !== 1) errors.push(`[B] expected exactly 1 superadmin after prod seed, got ${cnt.superadmins}.`);
    if (cnt.candidates !== 0 || cnt.jobs !== 0) errors.push(`[B] prod seed created demo data (candidates=${cnt.candidates}, jobs=${cnt.jobs}).`);
    if (errors.length) return;
    console.log('  [B] prod seed OK — 1 superadmin, no demo.');

    // [C] boot
    server = await bootServer(targetUrl);
    if (!server.ready) { errors.push(`[C] backend did not become healthy. Log tail:\n    ${server.getLog().split(/\r?\n/).filter(Boolean).slice(-12).join('\n    ')}`); return; }
    console.log('  [C] boot OK — /health {db:"up"}.');

    // [D] 4-role onboarding
    const roles = ['candidate', 'company_admin', 'agency_admin'];
    const tokens = {};
    for (const r of roles) {
      const su = await signup(r, tag);
      if (su.status !== 201 || !su.body?.data?.token) errors.push(`[D] ${r} signup failed: status=${su.status} body=${JSON.stringify(su.body).slice(0, 160)}.`);
      else tokens[r] = su.body.data.token;
    }
    if (errors.length) return;
    console.log('  [D] 4-role onboarding OK — candidate + company_admin + agency_admin each 201 with a token.');

    // [E] candidate search leg
    const seedA = runProbe('.__w4_seed_agencies.ts', PROBE_SEED_AGENCIES, { TARGET_URL: targetUrl }, 60000);
    if (!seedA.ok || seedA.agencies < 5) { errors.push(`[E] agency seed failed: ${JSON.stringify(seedA)}`); return; }
    const browse = await jget('/api/v1/candidates/agencies/browse?type=RELOCATION&limit=50', tokens.candidate);
    if (browse.status !== 200 || !Array.isArray(browse.body?.data) || browse.body.data.length < 1) {
      errors.push(`[E] candidate agency browse failed: status=${browse.status} len=${Array.isArray(browse.body?.data) ? browse.body.data.length : 'n/a'}.`);
    }
    if (errors.length) return;
    console.log(`  [E] candidate search OK — browse returned ${browse.body.data.length} agencies (enveloped array).`);

    // [F] admin MFA + 4 pages
    let sessionToken = null;
    const bad = await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: 'wrong-password' });
    if (bad.body?.data?.tempToken) errors.push(`[F] wrong-password admin login issued a credential — auth not enforced.`);
    const login = await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (login.status !== 200 || !login.body?.data?.tempToken) {
      errors.push(`[F] admin login failed: status=${login.status} body=${JSON.stringify(login.body).slice(0, 160)}.`);
    } else {
      const setup = await jpost('/api/v1/admin/auth/setup-mfa', { tempToken: login.body.data.tempToken });
      if (setup.status !== 200 || !setup.body?.data?.secret) errors.push(`[F] setup-mfa failed: status=${setup.status}.`);
      else {
        const speakeasy = backendRequire('speakeasy');
        const mfaToken = speakeasy.totp({ secret: setup.body.data.secret, encoding: 'base32' });
        const verify = await jpost('/api/v1/admin/auth/verify-mfa', { tempToken: login.body.data.tempToken, mfaToken });
        sessionToken = verify.body?.data?.sessionToken;
        if (verify.status !== 200 || !sessionToken) errors.push(`[F] verify-mfa failed: status=${verify.status}.`);
      }
    }
    if (errors.length || !sessionToken) { if (!errors.length) errors.push('[F] no admin session token.'); return; }

    const pages = ['/api/v1/admin/admins', '/api/v1/admin/me', '/api/v1/admin/analytics/overview', '/api/v1/admin/settings/platform', '/api/v1/admin/audit-logs'];
    for (const p of pages) {
      const noTok = await jget(p);
      if (noTok.status !== 401) errors.push(`[F] ${p} served WITHOUT a token (status=${noTok.status}) — missing guard.`);
      const withTok = await jget(p, sessionToken);
      if (withTok.status !== 200 || withTok.body?.success !== true) errors.push(`[F] ${p} not 200-enveloped for a valid admin (status=${withTok.status}).`);
    }
    if (errors.length) return;
    console.log(`  [F] admin journey OK — wrong-pw rejected (${bad.status}), MFA login issued a session, all 4 pages 200-enveloped + 401 without token.`);

    // [G] cross-role kill-switch + descriptive audit (Session 9 H2)
    const off = await jput('/api/v1/admin/settings/platform', { allow_new_registrations: false }, sessionToken);
    if (off.status !== 200 || off.body?.data?.allow_new_registrations !== false) errors.push(`[G] disabling registrations failed: status=${off.status}.`);
    const blocked = await signup('candidate', `blocked_${tag}`);
    if (blocked.status !== 403) errors.push(`[G] kill-switch NOT enforced — candidate signup returned ${blocked.status}, expected 403 while registrations disabled.`);
    const on = await jput('/api/v1/admin/settings/platform', { allow_new_registrations: true }, sessionToken);
    if (on.status !== 200 || on.body?.data?.allow_new_registrations !== true) errors.push(`[G] re-enabling registrations failed: status=${on.status}.`);
    const reopened = await signup('candidate', `reopened_${tag}`);
    if (reopened.status !== 201) errors.push(`[G] signup did not recover after re-enabling: status=${reopened.status}.`);
    // audit describes WHAT changed (H2)
    const logs = await jget('/api/v1/admin/audit-logs?limit=50', sessionToken);
    const settingsRow = (logs.body?.data?.items || []).find((r) => r.action_type === 'UPDATE_PLATFORM_SETTINGS' && /allow_new_registrations=false/.test(r.description || ''));
    if (!settingsRow) errors.push(`[G] audit trail has no UPDATE_PLATFORM_SETTINGS row describing "allow_new_registrations=false" (H2 descriptive audit missing).`);
    if (errors.length) return;
    console.log('  [G] cross-role kill-switch OK — admin OFF → candidate signup 403 → admin ON → 201; audit row describes the change.');

    // [H] admins CRUD + H2 empty-body guard
    const createAdmin = await jpost('/api/v1/admin/admins', { email: `w4_newadmin_${tag}@local.test`, full_name: 'W4 New Admin', password: 'longenough1' }, sessionToken);
    if (createAdmin.status !== 201 || createAdmin.body?.data?.role !== 'superadmin') errors.push(`[H] create admin failed: status=${createAdmin.status}.`);
    const emptyPut = await jput('/api/v1/admin/settings/platform', {}, sessionToken);
    if (emptyPut.status !== 400) errors.push(`[H] empty settings PUT should be 400 (H2 no-op guard), got ${emptyPut.status}.`);
    const newAdminId = createAdmin.body?.data?.user_id;
    if (newAdminId) {
      const del = await jdel(`/api/v1/admin/admins/${newAdminId}`, sessionToken);
      if (del.status !== 200) errors.push(`[H] delete created admin failed: status=${del.status}.`);
    }
    if (errors.length) return;
    console.log('  [H] admins CRUD + empty-body guard OK — create 201, empty settings PUT 400, delete 200.');
  } finally {
    if (server && server.child) killTree(server.child.pid);
    if (created) {
      const d = runProbe('.__w4_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000);
      if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop ${THROWAWAY_DB}: ${d.error}`);
    }
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: Wave-4 composed cross-role E2E not proven:');
      for (const e of errors) console.error(`  - ${e}`);
      console.error(`\n${errors.length} problem(s).`);
      process.exit(1);
    }
    console.log('\n✅ PASS: one fresh DB, one boot — migrate → prod-seed → all 4 roles onboard → candidate search → admin MFA + 4 real pages → cross-role kill-switch (admin OFF blocks signup 403, ON restores 201, audit describes it) → admins CRUD + empty-body guard. Primary DB untouched. (AI/OCR/doc-validate/embassy legs need down services → covered by their slice verifiers, honestly not re-run here.)');
    process.exit(0);
  })
  .catch((e) => { console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`); process.exit(1); });

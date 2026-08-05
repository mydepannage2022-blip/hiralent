#!/usr/bin/env node
/**
 * verify-seed-safety.mjs — Wave 2 / Session 3 (Phase 2.3, R-21) — INFRA
 *
 * LIVE proof that a fresh DB becomes immediately usable via `migrate deploy` + `db seed`,
 * that the seed is idempotent, and that it is prod-safe (no destructive / no demo ops in
 * production). Everything runs on self-created throwaway DBs — the primary `hiralent` is
 * NEVER touched.
 *
 *   [A] Fresh bootstrap — create empty DB, migrate deploy, `prisma db seed` (dev). Assert the
 *       core dataset lands: subscription plans, badges, the full RolePermission matrix
 *       (4 roles × 12 modules = 48), exactly one superadmin, plus demo candidates/jobs.
 *   [B] Superadmin login 2xx — boot the real backend against that DB and POST the seeded
 *       superadmin creds to /api/v1/admin/auth/login. Assert HTTP 200 + tempToken + mfaSetup
 *       (proves the seeded row is a genuinely loginable admin with a matching bcrypt hash).
 *   [C] Idempotent — run `prisma db seed` a SECOND time on the same DB. Assert every count is
 *       unchanged (no duplicate superadmin; jobs stay N, not 2N — the old create-loop bug).
 *   [D] Prod-safe — on a separate fresh DB: (1) seed with NODE_ENV=production and assert NO
 *       demo data (candidates=jobs=0), core present, superadmin safely skipped (no known
 *       default shipped); then (2) seed dev to add demo, and (3) seed prod again and assert it
 *       neither wiped nor duplicated anything (no blind deleteMany).
 *
 * Seeds/migrations get the throwaway URL through spawn-injected DATABASE_URL/DIRECT_DATABASE_URL
 * (dotenv doesn't override existing env). Row counts are read via the Prisma client inside an
 * in-backend probe (pnpm resolves `@prisma/client` there). Throwaway DBs are created/dropped
 * via a Prisma raw probe against the `postgres` maintenance DB.
 *
 * Exit 0 => fresh-usable + idempotent + prod-safe. Exit 1 => prints why. Node built-ins + global
 * fetch only. Windows-safe. Fails loudly if Postgres / prisma CLI / port 5096 is unavailable.
 *
 * Usage: node hiralent-master-plan/tools/verify-seed-safety.mjs
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
const HTTP_PORT = 5096; // distinct from 5099 / 5098 / 5097 (other INFRA verifiers)
const HTTP_BASE = `http://127.0.0.1:${HTTP_PORT}`;
const SEED_DB = 'hiralent_s3_seedtest';
const PROD_DB = 'hiralent_s3_prodtest';
const PRIVESC_DB = 'hiralent_s3_privesctest';

// Resolve the backend's own speakeasy (for the admin TOTP flow) the way verify-auth-session does.
const backendRequire = createRequire(path.join(BACKEND, 'package.json'));

// superadmin dev defaults (must match seeds/superadmin.seed.ts DEV fallbacks)
const ADMIN_EMAIL = 'admin@hiralent.com';
const ADMIN_PASSWORD = 'hiralent1234@';
const EXPECTED_ROLE_PERMS = 48; // 4 roles × 12 modules (rolePermissions.seed.ts)
const MIN_BADGES = 5;

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function withDbName(base, dbName) {
  const i = base.lastIndexOf('/');
  return base.slice(0, i) + '/' + dbName;
}

function runProbe(fileName, source, extraEnv, timeoutMs) {
  const probePath = path.join(BACKEND, fileName);
  try {
    fs.writeFileSync(probePath, source);
    const r = spawnSync(process.execPath, [TSX_CLI, fileName], {
      cwd: BACKEND, encoding: 'utf8', timeout: timeoutMs,
      env: { ...process.env, ...extraEnv }, maxBuffer: 16 * 1024 * 1024,
    });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const line = out.split(/\r?\n/).find((l) => l.includes('__RESULT__'));
    if (!line) return { ok: false, error: `no __RESULT__ (exit ${r.status}): ${out.split(/\r?\n/).filter(Boolean).slice(-4).join(' | ')}` };
    return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length));
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  } finally {
    try { fs.unlinkSync(probePath); } catch { /* ignore */ }
  }
}

const PROBE_DDL = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const ADMIN = process.env.HIRALENT_ADMIN_URL;
const DB = process.env.HIRALENT_DDL_DB;
const ACTION = process.env.HIRALENT_DDL_ACTION; // 'create' | 'drop'
const admin = new PrismaClient({ datasources: { db: { url: ADMIN } } });
const dropDb = async () => {
  try {
    await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '" WITH (FORCE)');
  } catch (e) {
    await admin.$executeRawUnsafe("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='" + DB + "' AND pid<>pg_backend_pid()");
    await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '"');
  }
};
(async () => {
  const out = {};
  try {
    await admin.$connect();
    await dropDb();
    if (ACTION === 'create') await admin.$executeRawUnsafe('CREATE DATABASE "' + DB + '"');
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
const db = new PrismaClient({ datasources: { db: { url: process.env.HIRALENT_TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    out.plans = await db.subscriptionPlan.count();
    out.badges = await db.badge.count();
    out.rolePerms = await db.rolePermission.count();
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

// Insert a user with a given email+role (to prove the seed won't promote a pre-existing account).
const PROBE_INSERT_USER = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.HIRALENT_TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    await db.user.create({ data: { email: process.env.HIRALENT_U_EMAIL, password_hash: 'not-a-real-hash', full_name: 'Email Squatter', role: process.env.HIRALENT_U_ROLE, is_email_verified: false } });
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

const PROBE_USER_ROLE = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.HIRALENT_TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    const u = await db.user.findUnique({ where: { email: process.env.HIRALENT_U_EMAIL } });
    out.role = u ? u.role : null;
    out.superadmins = await db.user.count({ where: { role: 'superadmin' } });
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

function prisma(args, env, timeout = 180000) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND, encoding: 'utf8', timeout,
    env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024,
  });
}

function createDb(adminUrl, db) {
  return runProbe('.__seed_ddl.ts', PROBE_DDL, { HIRALENT_ADMIN_URL: adminUrl, HIRALENT_DDL_DB: db, HIRALENT_DDL_ACTION: 'create' }, 60000);
}
function dropDb(adminUrl, db) {
  return runProbe('.__seed_ddl.ts', PROBE_DDL, { HIRALENT_ADMIN_URL: adminUrl, HIRALENT_DDL_DB: db, HIRALENT_DDL_ACTION: 'drop' }, 60000);
}
function migrate(targetUrl) {
  return prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
}
function seed(targetUrl, { prod, extraEnv = {} }) {
  // `prisma db seed` shells out to `tsx prisma/seed.ts`; tsx lives in node_modules/.bin, which
  // a package manager would put on PATH. We invoke the prisma CLI directly (no PM), so prepend
  // it ourselves — otherwise the seed command fails with "'tsx' is not recognized".
  const binDir = path.join(BACKEND, 'node_modules', '.bin');
  return prisma(['db', 'seed'], {
    DATABASE_URL: targetUrl,
    DIRECT_DATABASE_URL: targetUrl,
    NODE_ENV: prod ? 'production' : 'development',
    PATH: binDir + path.delimiter + (process.env.PATH || process.env.Path || ''),
    ...extraEnv,
  });
}
function counts(targetUrl) {
  return runProbe('.__seed_counts.ts', PROBE_COUNTS, { HIRALENT_TARGET_URL: targetUrl }, 60000);
}

async function bootServer(targetUrl) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(HTTP_PORT),
    DATABASE_URL: targetUrl,
    DIRECT_DATABASE_URL: targetUrl,
    ADMIN_JWT_SECRET: 's3-seed-safety-admin-secret',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1',
    RATE_LIMIT_FORCE_MEMORY: '1',
    RATE_LIMIT_AUTH_MAX: '1000',
    RATE_LIMIT_GLOBAL_MAX: '5000',
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });

  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${HTTP_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200) {
        const body = await res.json().catch(() => ({}));
        if (body.db === 'up') { ready = true; break; }
      }
    } catch { /* not up yet */ }
    await sleep(600);
  }
  return { child, ready, getLog: () => log };
}

// ---- main --------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found at ${path.relative(ROOT, PRISMA_CLI)} — run pnpm install in backend.`); return; }
  if (!fs.existsSync(TSX_CLI)) { errors.push(`tsx not found at ${path.relative(ROOT, TSX_CLI)} — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it (docker compose up -d postgres) before this gate.`); return; }
  if (await tcpReachable('127.0.0.1', HTTP_PORT, 500)) { errors.push(`port ${HTTP_PORT} already in use — free it (stale test server?) before running this gate.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const seedUrl = withDbName(base, SEED_DB);
  const prodUrl = withDbName(base, PROD_DB);
  const privescUrl = withDbName(base, PRIVESC_DB);

  let seedCreated = false;
  let prodCreated = false;
  let privescCreated = false;
  let server = null;

  try {
    // ================= [A] fresh bootstrap =================
    let r = createDb(adminUrl, SEED_DB);
    if (!r.ok) { errors.push(`[A] create ${SEED_DB} failed: ${r.error}`); return; }
    seedCreated = true;

    let m = migrate(seedUrl);
    if (m.status !== 0) { errors.push(`[A] migrate deploy failed: ${`${m.stdout || ''}${m.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }

    let s = seed(seedUrl, { prod: false });
    if (s.status !== 0) { errors.push(`[A] dev seed failed: ${`${s.stdout || ''}${s.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); return; }

    const c1 = counts(seedUrl);
    if (!c1.ok) { errors.push(`[A] counts probe failed: ${c1.error}`); return; }
    if (c1.plans < 3) errors.push(`[A] expected >=3 subscription plans, got ${c1.plans}.`);
    if (c1.badges < MIN_BADGES) errors.push(`[A] expected >=${MIN_BADGES} badges, got ${c1.badges}.`);
    if (c1.rolePerms !== EXPECTED_ROLE_PERMS) errors.push(`[A] expected ${EXPECTED_ROLE_PERMS} RolePermission rows (4×12 matrix), got ${c1.rolePerms}.`);
    if (c1.superadmins !== 1) errors.push(`[A] expected exactly 1 superadmin after seed, got ${c1.superadmins}.`);
    if (c1.candidates < 1) errors.push(`[A] expected demo candidates in dev seed, got ${c1.candidates}.`);
    if (c1.jobs < 1) errors.push(`[A] expected demo jobs in dev seed, got ${c1.jobs}.`);
    if (!errors.length) console.log(`  [A] fresh bootstrap OK — plans=${c1.plans}, badges=${c1.badges}, rolePerms=${c1.rolePerms}, superadmins=${c1.superadmins}, candidates=${c1.candidates}, jobs=${c1.jobs}.`);

    // ================= [B] superadmin FULL auth flow (login → MFA setup → verify → guarded route) =================
    server = await bootServer(seedUrl);
    if (!server.ready) {
      errors.push(`[B] backend did not become healthy on ${HTTP_BASE}. Log tail:\n    ${server.getLog().split(/\r?\n/).filter(Boolean).slice(-10).join('\n    ')}`);
    } else {
      const jpost = async (p, body, token) => {
        const res = await fetch(`${HTTP_BASE}${p}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
        });
        return { status: res.status, body: await res.json().catch(() => ({})) };
      };
      try {
        // 1) login → tempToken (+ mfaSetup on first login)
        const login = await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        // Session 1: superadmin auth responses now use the standard envelope → fields under `data`.
        if (login.status !== 200 || !login.body.data?.tempToken || login.body.data?.mfaSetup !== true) {
          errors.push(`[B] login not a fresh seeded superadmin: status=${login.status} body=${JSON.stringify(login.body).slice(0, 200)}.`);
        } else {
          // 2) setup-mfa → TOTP secret
          const setup = await jpost('/api/v1/admin/auth/setup-mfa', { tempToken: login.body.data.tempToken });
          if (setup.status !== 200 || !setup.body.data?.secret) {
            errors.push(`[B] setup-mfa failed: status=${setup.status} body=${JSON.stringify(setup.body).slice(0, 200)}.`);
          } else {
            // 3) generate the current TOTP from the returned secret
            const speakeasy = backendRequire('speakeasy');
            const mfaToken = speakeasy.totp({ secret: setup.body.data.secret, encoding: 'base32' });
            // 4) verify-mfa → real session token
            const verify = await jpost('/api/v1/admin/auth/verify-mfa', { tempToken: login.body.data.tempToken, mfaToken });
            const sessionToken = verify.body.data?.sessionToken;
            if (verify.status !== 200 || !sessionToken) {
              errors.push(`[B] verify-mfa failed: status=${verify.status} body=${JSON.stringify(verify.body).slice(0, 200)}.`);
            } else {
              // 5) the session token must actually open a GUARDED admin route (proves the
              //    mount-order fix keeps guarded routes reachable with a valid admin session,
              //    and that the whole superadmin auth chain works end-to-end).
              const guarded = await fetch(`${HTTP_BASE}/api/v1/admin/verifications/stats`, {
                headers: { authorization: `Bearer ${sessionToken}` }, signal: AbortSignal.timeout(15000),
              });
              if (guarded.status === 401 || guarded.status === 403) {
                errors.push(`[B] guarded admin route rejected a valid superadmin session: status=${guarded.status}.`);
              } else {
                console.log(`  [B] superadmin full auth OK — login→setup-mfa→verify-mfa issued a session; guarded /admin/verifications/stats accepted it (status ${guarded.status}).`);
              }
            }
          }
        }
      } catch (e) { errors.push(`[B] admin auth flow threw: ${e && e.message ? e.message : e}`); }
    }
    if (server && server.child) { killTree(server.child.pid); server = null; }

    // ================= [C] idempotent (second seed run) =================
    let s2 = seed(seedUrl, { prod: false });
    if (s2.status !== 0) { errors.push(`[C] second dev seed failed: ${`${s2.stdout || ''}${s2.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); }
    else {
      const c2 = counts(seedUrl);
      if (!c2.ok) { errors.push(`[C] counts probe failed: ${c2.error}`); }
      else {
        // Every count must be unchanged. Jobs is the key one: the old create-loop bug would
        // have doubled it (N → 2N) — a stable count proves the create→upsert fix.
        for (const k of ['plans', 'badges', 'rolePerms', 'superadmins', 'candidates', 'jobs']) {
          if (c2[k] !== c1[k]) errors.push(`[C] NOT idempotent — ${k} changed on second seed: ${c1[k]} → ${c2[k]}.`);
        }
        if (c2.superadmins !== 1) errors.push(`[C] second seed produced ${c2.superadmins} superadmins (must stay 1).`);
        if (c2.plans === c1.plans && c2.jobs === c1.jobs && c2.superadmins === 1) {
          console.log(`  [C] idempotent OK — counts identical after a 2nd seed (jobs stable at ${c2.jobs}, superadmins=1).`);
        }
      }
    }

    // ================= [D] prod-safe =================
    r = createDb(adminUrl, PROD_DB);
    if (!r.ok) { errors.push(`[D] create ${PROD_DB} failed: ${r.error}`); }
    else {
      prodCreated = true;
      m = migrate(prodUrl);
      if (m.status !== 0) { errors.push(`[D] migrate deploy failed: ${`${m.stdout || ''}${m.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); }
      else {
        // D1 — production seed on a fresh DB: core present, NO demo, superadmin safely skipped.
        const sp = seed(prodUrl, { prod: true });
        if (sp.status !== 0) { errors.push(`[D1] production seed failed: ${`${sp.stdout || ''}${sp.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); }
        else {
          const d1 = counts(prodUrl);
          if (!d1.ok) errors.push(`[D1] counts probe failed: ${d1.error}`);
          else {
            if (d1.candidates !== 0 || d1.jobs !== 0) errors.push(`[D1] production seed created DEMO data (candidates=${d1.candidates}, jobs=${d1.jobs}) — must be 0 in prod.`);
            if (d1.plans < 3) errors.push(`[D1] production seed did not create core plans (got ${d1.plans}).`);
            if (d1.superadmins !== 0) errors.push(`[D1] production seed created a superadmin with a default password (got ${d1.superadmins}) — must skip when SUPERADMIN_PASSWORD is unset.`);
            if (!errors.some((e) => e.startsWith('[D1]'))) console.log(`  [D1] prod bootstrap OK — core present (plans=${d1.plans}), no demo (candidates=0, jobs=0), superadmin safely skipped.`);
          }

          // D2 — prod seed must not wipe/duplicate existing data. Add demo (dev), then re-seed prod.
          const sd = seed(prodUrl, { prod: false });
          if (sd.status !== 0) { errors.push(`[D2] dev seed (to populate demo) failed: ${`${sd.stdout || ''}${sd.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); }
          else {
            const before = counts(prodUrl);
            const sp2 = seed(prodUrl, { prod: true });
            if (sp2.status !== 0) { errors.push(`[D2] second production seed failed: ${`${sp2.stdout || ''}${sp2.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); }
            else {
              const after = counts(prodUrl);
              if (before.ok && after.ok) {
                for (const k of ['plans', 'badges', 'candidates', 'jobs']) {
                  if (after[k] !== before[k]) errors.push(`[D2] production seed WIPED or DUPLICATED data — ${k}: ${before[k]} → ${after[k]} (must be unchanged; no blind deleteMany).`);
                }
                if (before.candidates > 0 && after.candidates === before.candidates && after.plans === before.plans) {
                  console.log(`  [D2] prod non-destructive OK — re-seeding in prod left demo (candidates=${after.candidates}) and plans (${after.plans}) untouched.`);
                }
              } else {
                errors.push(`[D2] counts probe failed (before.ok=${before.ok}, after.ok=${after.ok}).`);
              }
            }
          }
        }
      }
    }

    // ================= [E] privesc-safety: seed must NOT promote a pre-existing account =================
    const SQUAT_EMAIL = 'squatter@hiralent.test';
    r = createDb(adminUrl, PRIVESC_DB);
    if (!r.ok) { errors.push(`[E] create ${PRIVESC_DB} failed: ${r.error}`); }
    else {
      privescCreated = true;
      m = migrate(privescUrl);
      if (m.status !== 0) { errors.push(`[E] migrate deploy failed: ${`${m.stdout || ''}${m.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); }
      else {
        // Squat the superadmin email with an ordinary candidate account BEFORE seeding.
        const ins = runProbe('.__seed_insert.ts', PROBE_INSERT_USER, { HIRALENT_TARGET_URL: privescUrl, HIRALENT_U_EMAIL: SQUAT_EMAIL, HIRALENT_U_ROLE: 'candidate' }, 60000);
        if (!ins.ok) { errors.push(`[E] could not insert squatter user: ${ins.error}`); }
        else {
          // Seed with SUPERADMIN_EMAIL pointed at the squatted email.
          const se = seed(privescUrl, { prod: false, extraEnv: { SUPERADMIN_EMAIL: SQUAT_EMAIL } });
          if (se.status !== 0) { errors.push(`[E] seed failed: ${`${se.stdout || ''}${se.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); }
          else {
            const chk = runProbe('.__seed_role.ts', PROBE_USER_ROLE, { HIRALENT_TARGET_URL: privescUrl, HIRALENT_U_EMAIL: SQUAT_EMAIL }, 60000);
            if (!chk.ok) { errors.push(`[E] role probe failed: ${chk.error}`); }
            else {
              if (chk.role !== 'candidate') errors.push(`[E] PRIVESC — seed promoted a pre-existing account (${SQUAT_EMAIL}) from candidate to '${chk.role}'.`);
              if (chk.superadmins !== 0) errors.push(`[E] PRIVESC — seed created ${chk.superadmins} superadmin(s) though the email was owned by a candidate (must be 0).`);
              if (chk.role === 'candidate' && chk.superadmins === 0) console.log(`  [E] privesc-safety OK — seed refused to promote the pre-existing ${SQUAT_EMAIL} account (still candidate, 0 superadmins).`);
            }
          }
        }
      }
    }
  } finally {
    if (server && server.child) killTree(server.child.pid);
    if (seedCreated) { const d = dropDb(adminUrl, SEED_DB); if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop ${SEED_DB}: ${d.error}`); }
    if (prodCreated) { const d = dropDb(adminUrl, PROD_DB); if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop ${PROD_DB}: ${d.error}`); }
    if (privescCreated) { const d = dropDb(adminUrl, PRIVESC_DB); if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop ${PRIVESC_DB}: ${d.error}`); }
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: seed is not fresh-usable / idempotent / prod-safe:');
      for (const e of errors) console.error(`  - ${e}`);
      console.error(`\n${errors.length} problem(s).`);
      process.exit(1);
    }
    console.log('\n✅ PASS: fresh DB → migrate deploy + seed yields plans/badges/RBAC-matrix + a superadmin who completes the FULL admin auth flow (login→MFA→session→guarded route); seed is idempotent (2nd run = identical counts), prod-safe (no demo/destructive/default-admin), and refuses to promote a pre-existing account (privesc-safe). Primary DB untouched.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });

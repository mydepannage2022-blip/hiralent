#!/usr/bin/env node
/**
 * verify-e2e-fullpath.mjs — Wave 2 / Session 7 (gate) — INFRA
 *
 * The COMPOSED end-to-end journey, on ONE fresh throwaway DB, in one continuous flow —
 * the thing the per-slice Wave-2 verifiers never prove together. Everything runs on a
 * self-created throwaway (`hiralent_s7_e2e`); the primary `hiralent` is NEVER touched.
 *
 *   [A] empty DB → migrate deploy      — provision an empty DB, `prisma migrate deploy`
 *                                        the whole chain (assert exit 0).
 *   [B] → seed (core, prod-mode)        — `prisma db seed` with NODE_ENV=production +
 *                                        SUPERADMIN_PASSWORD set → core dataset (plans,
 *                                        badges, 48-row RBAC matrix, exactly one loginable
 *                                        superadmin), NO demo data.
 *   [C] → boot + /health db:up          — boot the REAL backend against the DB with
 *                                        `connection_limit=L&application_name=hiralent_s7_e2e`;
 *                                        readiness IS `GET /health` returning {db:"up"}.
 *   [D] → superadmin login (full flow)  — real login → setup-mfa → verify-mfa (TOTP) →
 *                                        session token opens a guarded admin route.
 *                                        Wrong password at login → NOT 200 (negative control).
 *   [E] → concurrent paginated reads    — signup a candidate, seed 150 agencies, fire 30
 *       + connection count bounded        parallel `browse?limit=99999` reads: each 200,
 *                                        body clamped ≤ 100, `X-Total-Count` header == 150,
 *                                        and a pg_stat_activity sampler proves the server
 *                                        pool peak stays ≥1 and ≤ connection_limit under load.
 *   [F] → indexed reads at scale        — seed 20k messages (FK triggers off), ANALYZE, and
 *                                        EXPLAIN the hot query: assert an Index Scan on the
 *                                        expected index, with a Seq-Scan control on an
 *                                        unindexed column (proves the index is the differentiator).
 *   [G] → /health still db:up           — re-assert liveness after the load.
 *
 * Probes are tsx files written INTO backend/ (so pnpm resolves @prisma/client), run via the
 * backend's own tsx, results parsed from a `__RESULT__` sentinel line — the shared idiom of
 * verify-seed-safety / verify-connection-pool / verify-index-coverage. Throwaway DB dropped
 * in `finally` (`DROP DATABASE ... WITH (FORCE)`).
 *
 * Exit 0 => the whole path holds. Exit 1 => prints the exact failing stage. Node built-ins +
 * global fetch only. Windows-safe. Fails loudly if Postgres / prisma CLI / tsx / port 5090
 * is unavailable.
 *
 * Usage: node hiralent-master-plan/tools/verify-e2e-fullpath.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
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
const HTTP_PORT = 5090; // distinct from other INFRA verifiers (5091..5099 taken)
const HTTP_BASE = `http://127.0.0.1:${HTTP_PORT}`;
const THROWAWAY_DB = 'hiralent_s7_e2e'; // NEVER the primary `hiralent`
const APP_NAME = 'hiralent_s7_e2e';     // pg_stat_activity isolation for the server pool

// The connection bound is only MEANINGFUL if the enforced limit sits BELOW Prisma's default
// (num_cpus*2+1) — otherwise an ignored connection_limit would coincidentally cap at the
// default and "pass". Derive L strictly under the default on any core count (same idiom as
// verify-connection-pool).
const PRISMA_DEFAULT = os.cpus().length * 2 + 1;
const LIMIT = Math.min(5, Math.max(2, PRISMA_DEFAULT - 2));

// superadmin creds for this run — seed in prod-mode WITH a password so a loginable superadmin
// is created (verify-seed-safety proves prod-seed SKIPS the admin when no password is set;
// here we prove the complementary path: password provided => a real, loginable superadmin).
const ADMIN_EMAIL = 'admin@hiralent.com';
const ADMIN_PASSWORD = 'hiralent1234@';
const EXPECTED_ROLE_PERMS = 48; // 4 roles × 12 modules (rolePermissions.seed.ts)
const MIN_BADGES = 5;

const backendRequire = createRequire(path.join(BACKEND, 'package.json'));

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
const withDbName = (base, db) => base.slice(0, base.lastIndexOf('/')) + '/' + db;
const decodeJwtUserId = (tok) => { try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64').toString('utf8')); return p.user_id || p.userId || p.sub || null; } catch { return null; } };

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

function seedProd(targetUrl, extraEnv = {}) {
  // `prisma db seed` shells out to `tsx prisma/seed.ts`; tsx lives in node_modules/.bin which a
  // package manager would put on PATH. We invoke the prisma CLI directly, so prepend it ourselves.
  const binDir = path.join(BACKEND, 'node_modules', '.bin');
  return prisma(['db', 'seed'], {
    DATABASE_URL: targetUrl,
    DIRECT_DATABASE_URL: targetUrl,
    NODE_ENV: 'production',
    PATH: binDir + path.delimiter + (process.env.PATH || process.env.Path || ''),
    ...extraEnv,
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

const PROBE_COUNTS = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
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

// Seed the offset-paginated dataset (150 APPROVED relocation agencies) — mirrors verify-pagination.
const PROBE_SEED_AGENCIES = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    await db.agency.createMany({ data: Array.from({ length: 150 }, (_, i) => ({ name: 'Agency ' + i, type: 'RELOCATION', status: 'APPROVED' })) });
    out.agencies = await db.agency.count({ where: { type: 'RELOCATION', status: 'APPROVED' } });
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// Fire N concurrent paginated reads against the REAL server while a counter connection samples
// pg_stat_activity for the server pool (application_name isolation) — mirrors verify-connection-pool
// Test B, but on the offset+headers read path (X-Total-Count) instead of signups.
const PROBE_HTTP_BURST = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const PG_BASE = process.env.PG_BASE;
const HTTP = process.env.HTTP_BASE;
const TOKEN = process.env.CAND_TOKEN;
const LIMIT = Number(process.env.LIMIT || '5');
const APP = process.env.APP_NAME;
const N = 30;
const counter = new PrismaClient({ datasources: { db: { url: PG_BASE + '?connection_limit=1&application_name=hiralent_s7_probe' } } });
(async () => {
  const out = {};
  try {
    await counter.$connect();
    const sample = async () => {
      const r = await counter.$queryRawUnsafe("SELECT count(*)::int AS c FROM pg_stat_activity WHERE application_name='" + APP + "' AND state='active'");
      return Number(r[0].c);
    };
    const url = HTTP + '/api/v1/candidates/agencies/browse?type=RELOCATION&limit=99999';
    const reqs = [];
    for (let i = 0; i < N; i++) {
      reqs.push(
        fetch(url, { headers: { authorization: 'Bearer ' + TOKEN }, signal: AbortSignal.timeout(25000) })
          .then(async (r) => { const b = await r.json().catch(() => ({})); return { status: r.status, total: r.headers.get('x-total-count'), len: Array.isArray(b && b.data) ? b.data.length : -1 }; })
          .catch(() => ({ status: 0, total: null, len: -1 }))
      );
    }
    let settled = false;
    const done = Promise.allSettled(reqs).then(() => { settled = true; });
    let peak = 0, samples = 0;
    while (!settled) { const c = await sample(); if (c > peak) peak = c; samples++; await new Promise((r) => setTimeout(r, 15)); }
    const results = await Promise.all(reqs);
    await done;
    out.ok = true; out.peak = peak; out.samples = samples; out.limit = LIMIT; out.n = N;
    out.ok200 = results.filter((r) => r.status === 200).length;
    out.total = (results.find((r) => r.total != null) || {}).total ?? null;
    out.maxLen = Math.max(...results.map((r) => r.len));
    // Every read must have returned a bounded ARRAY (len in [0,100]) — guards the vacuous edge
    // where a 200 with a non-array/empty body (len -1) would slip past a bare max<=100 check.
    out.bounded = results.filter((r) => r.len >= 0 && r.len <= 100).length;
    out.statuses = results.map((r) => r.status);
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await counter.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// Seed 20k messages (FK triggers off), ANALYZE, EXPLAIN the hot query -> Index Scan on the
// expected index, with a Seq-Scan control on an unindexed column. Mirrors verify-index-coverage
// (messages slice) — proves the reads are genuinely index-backed at scale on THIS same DB.
const PROBE_INDEX = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
const N = 20000;
const IDX = 'messages_conversation_id_sent_at_idx';
const SEED = "INSERT INTO messages (message_id, conversation_id, sender_id, sent_at, content) SELECT gs::text, 'conv-'||(gs%200), 'user-'||(gs%50), TIMESTAMP '2026-01-01 00:00:00'+(gs||' seconds')::interval, 'msg-'||gs FROM generate_series(1," + N + ") gs";
const HOT = "SELECT message_id, sent_at FROM messages WHERE conversation_id='conv-7' ORDER BY sent_at DESC LIMIT 30";
const CONTROL = "SELECT message_id FROM messages WHERE content='msg-12345' ORDER BY sent_at DESC LIMIT 30";
const nodeList = (node, acc = []) => {
  if (!node) return acc;
  if (Array.isArray(node)) { node.forEach((n) => nodeList(n, acc)); return acc; }
  if (typeof node === 'object') {
    if (node['Node Type']) acc.push({ type: node['Node Type'], index: node['Index Name'] || null });
    for (const k of Object.keys(node)) if (typeof node[k] === 'object') nodeList(node[k], acc);
  }
  return acc;
};
const explain = async (sql) => { const rows = await db.$queryRawUnsafe('EXPLAIN (ANALYZE, FORMAT JSON) ' + sql); return nodeList(rows[0]['QUERY PLAN'][0].Plan); };
(async () => {
  const out = {};
  try {
    await db.$connect();
    await db.$transaction(async (t) => { await t.$executeRawUnsafe('SET LOCAL session_replication_role = replica'); await t.$executeRawUnsafe(SEED); }, { timeout: 120000 });
    await db.$executeRawUnsafe('ANALYZE messages');
    out.seeded = Number((await db.$queryRawUnsafe('SELECT count(*)::int AS c FROM messages'))[0].c);
    const hot = await explain(HOT);
    const ctl = await explain(CONTROL);
    out.usesIdx = hot.some((n) => /Index (Only )?Scan/.test(n.type) && n.index === IDX);
    out.hotTypes = hot.map((n) => n.type);
    out.controlIsSeq = ctl.some((n) => n.type === 'Seq Scan');
    out.controlTypes = ctl.map((n) => n.type);
    // indexed reads UNDER CONCURRENCY: fire N parallel executions of the SAME index-backed hot
    // query and require every one to return the correct bounded rows (LIMIT 30). This is what makes
    // the "indexed reads under concurrency" claim literal — the EXPLAIN proves the index is used,
    // and this proves that index-backed read path holds under concurrent load.
    const N_CONC = 30;
    const runs = await Promise.allSettled(Array.from({ length: N_CONC }, () => db.$queryRawUnsafe(HOT)));
    out.concOk = runs.filter((r) => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length === 30).length;
    out.concN = N_CONC;
    out.idx = IDX;
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
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    RETENTION_ENABLED: 'false',
    PORT: String(HTTP_PORT),
    // Server pool bounded + isolated by application_name so the sampler can count only ITS backends.
    DATABASE_URL: `${targetUrl}?connection_limit=${LIMIT}&pool_timeout=20&application_name=${APP_NAME}`,
    DIRECT_DATABASE_URL: targetUrl,
    ADMIN_JWT_SECRET: 's7-e2e-admin-secret',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'noreply@local.test',
    // Neutralise rate limiting so login + 30 parallel reads all reach the handlers.
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
  let exitedEarly = false; child.on('exit', () => { exitedEarly = true; });

  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    if (exitedEarly) break;
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

async function healthOk() {
  try {
    const res = await fetch(`${HTTP_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.status !== 200) return false;
    const body = await res.json().catch(() => ({}));
    return body.db === 'up';
  } catch { return false; }
}

// ---- main --------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found at ${path.relative(ROOT, PRISMA_CLI)} — run pnpm install in backend.`); return; }
  if (!fs.existsSync(TSX_CLI)) { errors.push(`tsx not found at ${path.relative(ROOT, TSX_CLI)} — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it (docker compose up -d postgres) before this gate.`); return; }
  if (await tcpReachable('127.0.0.1', HTTP_PORT, 500)) { errors.push(`port ${HTTP_PORT} already in use — free it (stale test server?) before running this gate.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);

  let created = false;
  let server = null;
  try {
    // ================= [A] empty DB → migrate deploy =================
    const c = runProbe('.__e2e_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`[A] create ${THROWAWAY_DB} failed: ${c.error}`); return; }
    created = true;

    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) { errors.push(`[A] migrate deploy FAILED: ${`${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }
    console.log('  [A] empty DB → migrate deploy OK (whole chain applied).');

    // ================= [B] → seed (core, prod-mode) =================
    const s = seedProd(targetUrl, { SUPERADMIN_EMAIL: ADMIN_EMAIL, SUPERADMIN_PASSWORD: ADMIN_PASSWORD });
    if (s.status !== 0) { errors.push(`[B] prod seed failed: ${`${s.stdout || ''}${s.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); return; }
    const cnt = runProbe('.__e2e_counts.ts', PROBE_COUNTS, { TARGET_URL: targetUrl }, 60000);
    if (!cnt.ok) { errors.push(`[B] counts probe failed: ${cnt.error}`); return; }
    if (cnt.plans < 3) errors.push(`[B] expected >=3 subscription plans, got ${cnt.plans}.`);
    if (cnt.badges < MIN_BADGES) errors.push(`[B] expected >=${MIN_BADGES} badges, got ${cnt.badges}.`);
    if (cnt.rolePerms !== EXPECTED_ROLE_PERMS) errors.push(`[B] expected ${EXPECTED_ROLE_PERMS} RolePermission rows (4×12), got ${cnt.rolePerms}.`);
    if (cnt.superadmins !== 1) errors.push(`[B] expected exactly 1 loginable superadmin after prod seed with password, got ${cnt.superadmins}.`);
    if (cnt.candidates !== 0 || cnt.jobs !== 0) errors.push(`[B] prod seed created DEMO data (candidates=${cnt.candidates}, jobs=${cnt.jobs}) — must be 0 in prod-mode.`);
    if (errors.length) return;
    console.log(`  [B] core seed OK — plans=${cnt.plans}, badges=${cnt.badges}, rolePerms=${cnt.rolePerms}, superadmins=1, no demo (candidates=0, jobs=0).`);

    // ================= [C] → boot + /health db:up =================
    server = await bootServer(targetUrl);
    if (!server.ready) {
      errors.push(`[C] backend did not become healthy on ${HTTP_BASE}. Log tail:\n    ${server.getLog().split(/\r?\n/).filter(Boolean).slice(-10).join('\n    ')}`);
      return;
    }
    console.log('  [C] boot OK — GET /health returns 200 {db:"up"} (connection_limit=' + LIMIT + ').');

    // ================= [D] → superadmin login (full flow) + negative =================
    const jpost = async (p, body, token) => {
      const res = await fetch(`${HTTP_BASE}${p}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    };
    try {
      // Negative control first: a wrong password must NOT issue a credential. Judge on the actual
      // grant (a tempToken), not merely status 200 — an error response can legitimately be 200-shaped.
      const bad = await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: 'definitely-the-wrong-password' });
      if (bad.body.data?.tempToken) errors.push(`[D] wrong-password login issued a credential (tempToken, status=${bad.status}) — auth not enforced.`);

      const login = await jpost('/api/v1/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      // Session 1: superadmin auth responses now use the standard envelope → fields under `data`.
      if (login.status !== 200 || !login.body.data?.tempToken || login.body.data?.mfaSetup !== true) {
        errors.push(`[D] superadmin login failed: status=${login.status} body=${JSON.stringify(login.body).slice(0, 200)}.`);
      } else {
        const setup = await jpost('/api/v1/admin/auth/setup-mfa', { tempToken: login.body.data.tempToken });
        if (setup.status !== 200 || !setup.body.data?.secret) {
          errors.push(`[D] setup-mfa failed: status=${setup.status} body=${JSON.stringify(setup.body).slice(0, 200)}.`);
        } else {
          const speakeasy = backendRequire('speakeasy');
          const mfaToken = speakeasy.totp({ secret: setup.body.data.secret, encoding: 'base32' });
          const verify = await jpost('/api/v1/admin/auth/verify-mfa', { tempToken: login.body.data.tempToken, mfaToken });
          const sessionToken = verify.body.data?.sessionToken;
          if (verify.status !== 200 || !sessionToken) {
            errors.push(`[D] verify-mfa failed: status=${verify.status} body=${JSON.stringify(verify.body).slice(0, 200)}.`);
          } else {
            // no-token → the guarded admin route must reject (default-deny), then a valid session must pass.
            const noTok = await fetch(`${HTTP_BASE}/api/v1/admin/verifications/stats`, { signal: AbortSignal.timeout(15000) });
            if (noTok.status !== 401 && noTok.status !== 403) errors.push(`[D] guarded admin route served WITHOUT a token (status=${noTok.status}) — missing auth guard.`);
            const guarded = await fetch(`${HTTP_BASE}/api/v1/admin/verifications/stats`, {
              headers: { authorization: `Bearer ${sessionToken}` }, signal: AbortSignal.timeout(15000),
            });
            if (guarded.status === 401 || guarded.status === 403) errors.push(`[D] guarded admin route rejected a valid superadmin session: status=${guarded.status}.`);
            else console.log(`  [D] superadmin login OK — wrong-pw rejected (${bad.status}), no-token guarded route → ${noTok.status}; login→setup-mfa→verify-mfa issued a session; guarded /admin/verifications/stats accepted the valid session (${guarded.status}).`);
          }
        }
      }
    } catch (e) { errors.push(`[D] admin auth flow threw: ${e && e.message ? e.message : e}`); }
    if (errors.length) return;

    // ================= [E] → concurrent paginated reads + connection bounded =================
    const email = `e2e_cand_${Date.now()}@local.test`;
    const su = await fetch(`${HTTP_BASE}/api/v1/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'secret123', full_name: 'E2E Candidate', role: 'candidate' }), signal: AbortSignal.timeout(20000) });
    const sb = await su.json().catch(() => ({}));
    const candToken = sb?.data?.token;
    if (su.status !== 201 || !candToken || !decodeJwtUserId(candToken)) { errors.push(`[E] candidate signup failed (status ${su.status}).`); return; }

    const seedA = runProbe('.__e2e_seed_agencies.ts', PROBE_SEED_AGENCIES, { TARGET_URL: targetUrl }, 60000);
    if (!seedA.ok || seedA.agencies !== 150) { errors.push(`[E] agency seed failed: ${JSON.stringify(seedA)}`); return; }

    const burst = runProbe('.__e2e_burst.ts', PROBE_HTTP_BURST, { PG_BASE: base, HTTP_BASE, CAND_TOKEN: candToken, LIMIT: String(LIMIT), APP_NAME }, 90000);
    if (!burst.ok) { errors.push(`[E] http burst probe failed: ${burst.error}`); }
    else {
      if (burst.ok200 !== burst.n) errors.push(`[E] not all concurrent reads returned 200: ${burst.ok200}/${burst.n} (statuses: ${JSON.stringify(burst.statuses)}).`);
      if (burst.bounded !== burst.n) errors.push(`[E] not all reads returned a bounded array in [0,100] under load: ${burst.bounded}/${burst.n} bounded (maxLen=${burst.maxLen}, seeded 150, cap 100).`);
      if (burst.total !== '150') errors.push(`[E] X-Total-Count header expected '150' under load, got '${burst.total}'.`);
      // NOTE: this proves the running server's pool stayed WITHIN the configured bound under real HTTP
      // concurrency. The rigorous "connection_limit actually binds" proof (flood past the limit with slow
      // queries, LIMIT derived below Prisma's default) lives in verify-connection-pool.mjs — not re-claimed here.
      if (burst.peak > LIMIT) errors.push(`[E] server pool EXCEEDED connection_limit under load: peak=${burst.peak} > ${LIMIT} (bound not enforced).`);
      if (burst.peak < 1) errors.push(`[E] no active server connections observed during ${burst.n} concurrent reads (measurement vacuous).`);
      if (!errors.some((e) => e.startsWith('[E]'))) console.log(`  [E] concurrent reads OK — ${burst.ok200}/${burst.n} 200s, body ≤100, X-Total-Count=150; server pool peak ${burst.peak}/${LIMIT} (bounded) across ${burst.n} parallel reads.`);
    }
    if (errors.length) return;

    // health still up after the load, then stop the server before the EXPLAIN probe
    const stillUp = await healthOk();
    if (!stillUp) errors.push('[G] GET /health not {db:"up"} after the concurrent-read load.');
    else console.log('  [G] /health still 200 {db:"up"} after load.');

    if (server && server.child) { killTree(server.child.pid); server = null; await sleep(500); }
    if (errors.length) return;

    // ================= [F] → indexed reads at scale (EXPLAIN) =================
    const idx = runProbe('.__e2e_index.ts', PROBE_INDEX, { TARGET_URL: targetUrl }, 180000);
    if (!idx.ok) { errors.push(`[F] index EXPLAIN probe failed: ${idx.error}`); }
    else {
      if (idx.seeded !== 20000) errors.push(`[F] messages seed count wrong: ${idx.seeded} (expected 20000) — the EXPLAIN would be meaningless on the wrong volume.`);
      if (!idx.usesIdx) errors.push(`[F] hot query did NOT naturally use index ${idx.idx} at 20k rows (plan: ${idx.hotTypes.join(' > ')}).`);
      if (!idx.controlIsSeq) errors.push(`[F] control query on unindexed column did NOT Seq Scan (plan: ${(idx.controlTypes || []).join(' > ')}) — index-vs-noindex differentiation unproven.`);
      if (idx.concOk !== idx.concN) errors.push(`[F] index-backed hot query failed under concurrency: only ${idx.concOk}/${idx.concN} of the parallel executions returned the expected 30 rows.`);
      if (!errors.some((e) => e.startsWith('[F]'))) console.log(`  [F] indexed reads under concurrency OK — hot query Index Scan on ${idx.idx} at 20k rows (Seq-Scan control), and ${idx.concOk}/${idx.concN} parallel executions each returned 30 rows.`);
    }
  } finally {
    if (server && server.child) killTree(server.child.pid);
    if (created) {
      const d = runProbe('.__e2e_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000);
      if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop ${THROWAWAY_DB}: ${d.error}`);
    }
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: end-to-end full-path not proven:');
      for (const e of errors) console.error(`  - ${e}`);
      console.error(`\n${errors.length} problem(s).`);
      process.exit(1);
    }
    console.log(`\n✅ PASS: one fresh DB, one continuous flow — empty → migrate deploy → core seed (loginable superadmin, no demo) → boot (/health db:up) → superadmin full MFA login (wrong-pw rejected) → 30 concurrent paginated reads (≤100 + X-Total-Count=150) with the server pool bounded at ≤${LIMIT} → index-backed hot query Index-Scan at 20k rows served under 30 concurrent executions (Seq-Scan control) → /health still db:up. Primary DB untouched.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });

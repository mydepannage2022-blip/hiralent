#!/usr/bin/env node
/**
 * verify-pagination.mjs — Wave 2 / Session 5 (Phase 2.4, R-20/R-30) — INFRA
 *
 * Proves the read-side bounding actually holds — not "it type-checks":
 *
 *   Unit (offline, tsx):
 *     Runs the REAL `parsePagination` helper and asserts the clamp: `?limit=99999` →
 *     MAX_LIMIT, omitted → defaults, page floored ≥ 1, skip computed. This is the single
 *     enforcement surface, so if it regresses every endpoint silently un-bounds.
 *
 *   Static (offline):
 *     Source-level regression guards on the priority list endpoints — each flagged
 *     `findMany` is now bounded (routes through the helper / has `take`), the helper is
 *     exported, CORS exposes the pagination headers, and the count-misuse site no longer
 *     pulls every row to Set-count.
 *
 *   Live (throwaway DB + booted backend — NEVER the primary `hiralent`):
 *     Create `hiralent_s5_pagination`, migrate deploy, boot the server pointed at it,
 *     signup a candidate, then:
 *       - seed 250 notifications  -> GET ?limit=99999 -> assert <= 100 (cursor path).
 *       - seed 150 approved agencies -> GET browse?limit=99999 -> assert <= 100 AND the
 *         `X-Total-Count` header is present and == 150 (NEW offset+headers path).
 *
 *   Retention mutation (throwaway DB):
 *     Seed usage_analytics with aged + fresh rows, run the REAL `applyRetentionPolicy`,
 *     assert ONLY the aged rows were deleted (fresh preserved) — proves the reaper reaps
 *     by age, not blindly.
 *
 * Exit 0 => bounded + headers + retention all proven. Exit 1 => prints why.
 * Node built-ins only. Windows-safe (no shell). `--skip-live` runs unit + static only.
 *
 * Usage: node hiralent-master-plan/tools/verify-pagination.mjs [--skip-live]
 */

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const PRISMA_CLI = path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5096; // distinct from verify-auth-session (5098) / verify-local-run (5099)
const BASE = `http://127.0.0.1:${PORT}`;
const THROWAWAY_DB = 'hiralent_s5_pagination'; // NEVER the primary `hiralent`

const skipLive = process.argv.includes('--skip-live');
const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const readBackend = (p) => read(path.join(BACKEND, p)) ?? '';

// ---- helpers (shared idiom with verify-index-coverage / verify-auth-session) --------
function tcpReachable(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const s = new net.Socket(); let done = false;
    const fin = (v) => { if (!done) { done = true; s.destroy(); resolve(v); } };
    s.setTimeout(ms); s.once('connect', () => fin(true)); s.once('timeout', () => fin(false)); s.once('error', () => fin(false)); s.connect(port, host);
  });
}
function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
}
function readBaseUrl() {
  const raw = read(path.join(BACKEND, '.env'));
  if (raw) for (const line of raw.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
    if (m) { let v = m[1].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return v.split('?')[0]; }
  }
  return 'postgresql://postgres:huzaifa@localhost:5432/hiralent';
}
const withDbName = (base, db) => base.slice(0, base.lastIndexOf('/')) + '/' + db;
const decodeJwtUserId = (tok) => { try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64').toString('utf8')); return p.user_id || p.userId || p.sub || null; } catch { return null; } };

function runProbe(fileName, source, extraEnv, timeoutMs) {
  const p = path.join(BACKEND, fileName);
  try {
    fs.writeFileSync(p, source);
    const r = spawnSync(process.execPath, [TSX_CLI, fileName], { cwd: BACKEND, encoding: 'utf8', timeout: timeoutMs, env: { ...process.env, ...extraEnv }, maxBuffer: 32 * 1024 * 1024 });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const line = out.split(/\r?\n/).find((l) => l.includes('__RESULT__'));
    if (!line) return { ok: false, error: `no __RESULT__ (exit ${r.status}): ${out.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}` };
    return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length));
  } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) }; } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
}
function prisma(args, env) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], { cwd: BACKEND, encoding: 'utf8', timeout: 180000, env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024 });
}

// ---- 1. UNIT: the real parsePagination clamp ----------------------------------------
const PROBE_UNIT = `
import { parsePagination, MAX_LIMIT, DEFAULT_LIMIT, MAX_PAGE } from './src/utils/pagination.util';
const out = {};
try {
  const hostile = parsePagination({ limit: '99999', page: '3' });
  const dflt = parsePagination({});
  const floored = parsePagination({ page: '0', limit: '-5' });
  const capped = parsePagination({ limit: '500' }, { max: 200 });
  const hugePage = parsePagination({ page: '99999999999', limit: '200' }, { max: 200 });
  const nan = parsePagination({ limit: 'abc', page: 'xyz' });
  out.ok = true;
  out.hostileLimit = hostile.limit; out.hostileSkip = hostile.skip; out.max = MAX_LIMIT; out.def = DEFAULT_LIMIT;
  out.dfltLimit = dflt.limit; out.dfltPage = dflt.page;
  out.flooredPage = floored.page; out.flooredLimit = floored.limit;
  out.cappedLimit = capped.limit;
  out.maxPage = MAX_PAGE; out.hugePage = hugePage.page; out.hugeSkip = hugePage.skip;
  out.nanLimit = nan.limit; out.nanPage = nan.page;
} catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
process.exit(0);
`;
function unitChecks() {
  if (!fs.existsSync(TSX_CLI)) { errors.push('tsx not found — run pnpm install in backend/.'); return; }
  const r = runProbe('.__pag_unit.ts', PROBE_UNIT, {}, 60000);
  if (!r.ok) { errors.push(`[unit] parsePagination probe failed: ${r.error}`); return; }
  ok(r.max === 100, `[unit] MAX_LIMIT expected 100, got ${r.max}.`);
  ok(r.hostileLimit === r.max, `[unit] ?limit=99999 should clamp to MAX_LIMIT(${r.max}), got ${r.hostileLimit}.`);
  ok(r.hostileSkip === (3 - 1) * r.max, `[unit] skip for page=3 wrong: got ${r.hostileSkip}.`);
  ok(r.dfltLimit === r.def && r.dfltPage === 1, `[unit] defaults wrong: limit ${r.dfltLimit}, page ${r.dfltPage}.`);
  ok(r.flooredPage === 1, `[unit] page=0 should floor to 1, got ${r.flooredPage}.`);
  ok(r.flooredLimit === r.def, `[unit] limit=-5 should fall back to default, got ${r.flooredLimit}.`);
  ok(r.cappedLimit === 200, `[unit] per-endpoint max:200 should allow 200, got ${r.cappedLimit}.`);
  ok(r.hugePage === r.maxPage, `[unit] pathological page should clamp to MAX_PAGE(${r.maxPage}), got ${r.hugePage}.`);
  ok(r.hugeSkip === (r.maxPage - 1) * 200 && Number.isSafeInteger(r.hugeSkip), `[unit] skip for a huge page not bounded/safe: ${r.hugeSkip}.`);
  ok(r.nanLimit === r.def && r.nanPage === 1, `[unit] non-numeric limit/page should fall back to defaults, got limit ${r.nanLimit} page ${r.nanPage}.`);
  if (!errors.length) console.log('  [unit] parsePagination clamps hostile limit + pathological page, floors, ignores non-numeric, honours per-endpoint cap.');
}

// ---- 2. STATIC: source-level regression guards --------------------------------------
function staticChecks() {
  const util = readBackend('src/utils/pagination.util.ts');
  ok(/export const MAX_LIMIT/.test(util), '[static] pagination.util missing `export const MAX_LIMIT`.');
  ok(/export const parsePagination/.test(util), '[static] pagination.util missing `export const parsePagination`.');
  ok(/export const setPaginationHeaders/.test(util), '[static] pagination.util missing `export const setPaginationHeaders`.');

  const appTs = readBackend('src/app.ts');
  for (const h of ['X-Total-Count', 'X-Page', 'X-Limit', 'X-Has-More']) {
    ok(appTs.includes(`'${h}'`) || appTs.includes(`"${h}"`), `[static] app.ts CORS exposedHeaders missing ${h}.`);
  }
  ok(/exposedHeaders/.test(appTs), '[static] app.ts CORS has no exposedHeaders.');

  // Priority endpoints — the flagged findMany are now bounded via the helper / take.
  const jobSvc = readBackend('src/services/company/job.service.ts');
  ok((jobSvc.match(/take:\s*pagination\.take/g) || []).length >= 3,
    '[static] job.service: getCompanyJobs/getCompanyJobsById/getJobApplicantsForJob not all bounded (take: pagination.take).');

  const msgSvc = readBackend('src/services/message.service.ts');
  ok(/getConversations/.test(msgSvc) && /take:\s*pagination\.take/.test(msgSvc),
    '[static] message.service.getConversations is not bounded (take: pagination.take).');

  const caseSvc = readBackend('src/services/agency/agency.case.service.ts');
  ok(/listCasesForAgency/.test(caseSvc) && /take:\s*pagination\.take/.test(caseSvc),
    '[static] agency.case.service.listCasesForAgency is not bounded (take: pagination.take).');

  const candCaseCtl = readBackend('src/controller/candidate/candidate.case.controller.ts');
  ok(/parsePagination\(req\.query/.test(candCaseCtl) && /take:\s*limit/.test(candCaseCtl),
    '[static] candidate.case.controller.getCandidateCases not bounded via parsePagination + take.');

  const candAgencyCtl = readBackend('src/controller/candidate/candidate.agency.controller.ts');
  ok(/parsePagination\(req\.query/.test(candAgencyCtl),
    '[static] candidate.agency.controller.browseAgencies not routed through parsePagination.');

  const jobCtl = readBackend('src/controller/company/job.controller.ts');
  ok((jobCtl.match(/parsePagination\(req\.query/g) || []).length >= 3,
    '[static] job.controller: the 3 paginated endpoints not all routed through parsePagination.');
  // IDOR guard: getCompanyJobsById must gate "see all jobs" on owning the company (or superadmin).
  ok(/getCompanyId\(req\)\s*===\s*req\.params\.companyId/.test(jobCtl),
    '[static] job.controller.getCompanyJobsById missing the company-ownership check (IDOR: any company could read another tenant\'s drafts).');
  // Count-misuse fixed: getDashboardStats groups DB-side, no longer Set-counts a findMany.
  ok(/groupBy\(\{\s*[\s\S]{0,120}by:\s*\['candidate_id'\]/.test(jobCtl),
    '[static] job.controller.getDashboardStats no longer uses groupBy for the distinct count.');
  ok(!/new Set\(rows\.map\(\(r\) => r\.candidate_id\)\)/.test(jobCtl),
    '[static] job.controller.getDashboardStats still Set-counts a full findMany (count-misuse not fixed).');

  // Legacy clamp sites now route through the shared helper (no cap drift).
  ok(/parsePagination/.test(readBackend('src/validation/candidate.jobs.validation.ts')),
    '[static] candidate.jobs.validation still hand-rolls its clamp (not using parsePagination).');
  ok(/parsePagination/.test(readBackend('src/services/notification.service.ts')),
    '[static] notification.service still hand-rolls its clamp (not using parsePagination).');

  // Retention wiring present + opt-in gated.
  const server = readBackend('src/server.ts');
  ok(/RETENTION_ENABLED\s*===\s*["']true["']/.test(server),
    '[static] retention scheduler not opt-in gated on RETENTION_ENABLED in server.ts.');
  ok(fs.existsSync(path.join(BACKEND, 'src/services/retention.service.ts')),
    '[static] retention.service.ts missing.');

  if (!errors.length) console.log('  [static] helper exported, CORS headers exposed, 7 endpoints bounded, count-misuse fixed, legacy clamps unified, retention opt-in.');
}

// ---- 3+4. LIVE + retention mutation --------------------------------------------------
const PROBE_DDL = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const admin = new PrismaClient({ datasources:{ db:{ url: process.env.ADMIN_URL } } });
const DB=process.env.DDL_DB, ACT=process.env.DDL_ACTION;
(async()=>{ const out={}; try{ await admin.$connect();
  try{ await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "'+DB+'" WITH (FORCE)'); }
  catch{ await admin.$executeRawUnsafe("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='"+DB+"' AND pid<>pg_backend_pid()"); await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "'+DB+'"'); }
  if(ACT==='create') await admin.$executeRawUnsafe('CREATE DATABASE "'+DB+'"');
  out.ok=true; }catch(e){ out.ok=false; out.error=String(e&&e.message?e.message:e);} finally{ try{await admin.$disconnect();}catch{} }
  process.stdout.write('\\n__RESULT__'+JSON.stringify(out)+'\\n'); process.exit(0); })();
`;

const PROBE_SEED = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources:{ db:{ url: process.env.TARGET_URL } } });
const uid = process.env.UID;
(async()=>{ const out={}; try{ await db.$connect();
  await db.notification.createMany({ data: Array.from({length:250},(_,i)=>({ recipient_id:uid, audience:'CANDIDATE', type:'GENERIC', title:'t'+i, message:'m'+i })) });
  await db.agency.createMany({ data: Array.from({length:150},(_,i)=>({ name:'Agency '+i, type:'RELOCATION', status:'APPROVED' })) });
  out.ok=true; out.notif=await db.notification.count({ where:{ recipient_id:uid } }); out.agencies=await db.agency.count({ where:{ type:'RELOCATION', status:'APPROVED' } });
  }catch(e){ out.ok=false; out.error=String(e&&e.stack?e.stack:e);} finally{ try{await db.$disconnect();}catch{} }
  process.stdout.write('\\n__RESULT__'+JSON.stringify(out)+'\\n'); process.exit(0); })();
`;

// Runs the REAL applyRetentionPolicy (via the lib/prisma singleton pointed at throwaway).
const PROBE_RETENTION = `
import prisma from './src/lib/prisma';
import { applyRetentionPolicy, RETENTION_POLICIES } from './src/services/retention.service';
const uid = process.env.UID;  // real user (usage_analytics.user_id has an FK to User)
(async()=>{ const out={}; try{
  const policy = RETENTION_POLICIES.find(p => p.model === 'usageAnalytics');
  const now = new Date('2026-07-27T00:00:00Z');
  const aged = new Date(now.getTime() - 200*24*3600*1000);   // older than 180d -> reap
  const fresh = new Date(now.getTime() - 1*24*3600*1000);    // 1 day old -> keep
  await prisma.usageAnalytics.createMany({ data: [
    ...Array.from({length:10},(_,i)=>({ user_id:uid, action_type:'aged'+i, timestamp: aged })),
    ...Array.from({length:10},(_,i)=>({ user_id:uid, action_type:'fresh'+i, timestamp: fresh })),
  ]});
  const before = await prisma.usageAnalytics.count();
  const deleted = await applyRetentionPolicy(policy, now, 1000);
  const after = await prisma.usageAnalytics.count();
  const remainingAged = await prisma.usageAnalytics.count({ where:{ timestamp:{ lt: new Date(now.getTime()-180*24*3600*1000) } } });
  out.ok=true; out.before=before; out.deleted=deleted; out.after=after; out.remainingAged=remainingAged;
  }catch(e){ out.ok=false; out.error=String(e&&e.stack?e.stack:e);} finally{ try{await prisma.$disconnect();}catch{} }
  process.stdout.write('\\n__RESULT__'+JSON.stringify(out)+'\\n'); process.exit(0); })();
`;

async function liveChecks() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push('prisma CLI not found — run pnpm install in backend.'); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`); return; }
  if (await tcpReachable('127.0.0.1', PORT, 600)) { errors.push(`Test port ${PORT} already in use.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);
  let created = false, child = null;
  try {
    const c = runProbe('.__pag_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`could not create throwaway DB: ${c.error}`); return; }
    created = true;

    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) { errors.push(`migrate deploy FAILED on throwaway (exit ${dep.status}): ${`${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }

    const env = { ...process.env, NODE_ENV: 'development', FORCE_SKIP_MONGO: '1', ENABLE_DEV_MINT: '1', SCRAPING_SCHEDULER_ENABLED: 'false', RETENTION_ENABLED: 'false', PORT: String(PORT), DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl, SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test' };
    child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], { cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
    let exitedEarly = false; child.on('exit', () => { exitedEarly = true; });

    const deadline = Date.now() + 45000; let ready = false;
    while (Date.now() < deadline) {
      if (exitedEarly) { errors.push('backend exited before ready.'); break; }
      try { const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) }); if (r.status === 200 && (await r.json().catch(() => ({})))?.db === 'up') { ready = true; break; } } catch { /* not up */ }
      await sleep(600);
    }
    if (!ready) { if (!errors.length) errors.push('backend did not become ready (GET /health) within 45s.'); errors.push(`log tail: ${log.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}`); return; }

    // signup a candidate
    const email = `pagver+${Date.now()}@local.test`;
    const su = await fetch(`${BASE}/api/v1/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'secret123', full_name: 'Pag Verify', role: 'candidate' }) });
    const sb = await su.json().catch(() => ({}));
    const token = sb?.data?.token; const uid = decodeJwtUserId(token);
    ok(su.status === 201 && !!token && !!uid, `[live] signup failed (status ${su.status}).`);
    if (!token || !uid) return;

    const seed = runProbe('.__pag_seed.ts', PROBE_SEED, { TARGET_URL: targetUrl, UID: uid }, 60000);
    ok(seed.ok && seed.notif === 250 && seed.agencies === 150, `[live] seed failed: ${JSON.stringify(seed)}`);
    if (!seed.ok) return;

    // cursor endpoint (notifications) — hostile limit must clamp to 100
    {
      const res = await fetch(`${BASE}/api/v1/candidate/notifications?limit=99999`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      const body = await res.json().catch(() => ({}));
      const items = body?.data?.items;
      ok(res.status === 200, `[live] notifications expected 200, got ${res.status}.`);
      ok(Array.isArray(items) && items.length <= 100, `[live] notifications NOT bounded: ${Array.isArray(items) ? items.length : '(not array)'} (seeded 250).`);
      if (Array.isArray(items) && items.length <= 100) console.log(`  [live] notifications (cursor): ${items.length} <= 100 with 250 seeded.`);
    }

    // offset endpoint (browse agencies) — NEW code path: bounded body + X-Total-Count header
    {
      const res = await fetch(`${BASE}/api/v1/candidates/agencies/browse?type=RELOCATION&limit=99999`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      const body = await res.json().catch(() => ({}));
      const data = body?.data;
      const totalHeader = res.headers.get('x-total-count');
      ok(res.status === 200, `[live] browse agencies expected 200, got ${res.status}.`);
      ok(Array.isArray(data) && data.length <= 100, `[live] browse agencies NOT bounded: ${Array.isArray(data) ? data.length : '(not array)'} (seeded 150).`);
      ok(totalHeader === '150', `[live] X-Total-Count header expected '150', got '${totalHeader}' (header not exposed / wrong).`);
      if (Array.isArray(data) && data.length <= 100 && totalHeader === '150') console.log(`  [live] browse agencies (offset): ${data.length} <= 100, X-Total-Count=150 with 150 seeded.`);
    }

    // kill the server before the retention probe (avoids two clients fighting over the DB)
    killTree(child.pid); child = null; await sleep(500);

    // retention mutation — aged reaped, fresh preserved
    const ret = runProbe('.__pag_retention.ts', PROBE_RETENTION, { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl, UID: uid }, 60000);
    ok(ret.ok, `[retention] probe failed: ${ret.error}`);
    if (ret.ok) {
      ok(ret.before === 20, `[retention] expected 20 seeded, got ${ret.before}.`);
      ok(ret.deleted === 10, `[retention] expected 10 aged rows deleted, got ${ret.deleted}.`);
      ok(ret.after === 10, `[retention] expected 10 fresh rows remaining, got ${ret.after}.`);
      ok(ret.remainingAged === 0, `[retention] aged rows survived the reaper (${ret.remainingAged} left).`);
      if (ret.deleted === 10 && ret.after === 10) console.log('  [retention] reaper deleted 10 aged rows, preserved 10 fresh rows.');
    }
  } finally {
    if (child) killTree(child.pid);
    if (created) { const d = runProbe('.__pag_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000); if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop throwaway DB: ${d.error}`); }
  }
}

// ---- main ---------------------------------------------------------------------------
(async () => {
  unitChecks();
  staticChecks();
  if (!skipLive) await liveChecks();

  if (errors.length) {
    console.error('\n✗ FAIL: pagination/retention bounding not proven:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log(`\n✅ PASS: parsePagination clamps the cap (unit); 7 priority endpoints bounded + count-misuse fixed + CORS headers exposed (static)${skipLive ? '' : '; hostile ?limit=99999 returns <= cap with X-Total-Count header (live); retention reaps aged-only (mutation)'}. Primary DB untouched. (R-20/R-30)`);
  process.exit(0);
})().catch((e) => { console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`); process.exit(1); });

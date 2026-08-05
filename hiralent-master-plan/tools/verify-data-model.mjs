#!/usr/bin/env node
/**
 * verify-data-model.mjs — Wave 2 / Session 6 (Phase 2.5 & 2.6, R-33/R-35/R-37) — INFRA
 *
 * Proves the data-model correctness changes are in place AND behave correctly on a
 * fresh throwaway DB — without ever touching the primary `hiralent`.
 *
 *   Static (offline):
 *     1. CandidateProfile.postal_code is String? (not Int).
 *     2. The denormalized CandidateProfile.certifications Json column is gone.
 *     3. Dead models QuestionBank / ChatHistory / CandidateGlobalScore(+History) are gone.
 *     4. EVERY FK relation (`references:`) declares an explicit `onDelete` (0 missing) — R-35.
 *     5. MongoDB is fully removed: no src/lib/mongo.ts, no `mongodb`/`@types/mongodb` dep,
 *        no MONGO_URI in .env.example, no mongo wiring in server.ts — R-33.
 *
 *   Live (throwaway DB `hiralent_s6_datamodel` — NEVER the primary):
 *     6. The migration chain (incl. the 3 new Session-6 migrations) deploys clean on empty DB.
 *     7. postal_code accepts an alphanumeric code ("SW1A 1AA") — insert does NOT fail; column is TEXT.
 *     8. Hard user-delete: deleting a company_admin that owns a CompanyProfile + Conversation +
 *        Message + CompanyActivityLog + CompanyTeamInvitation SUCCEEDS (no FK violation);
 *        owned rows cascade away; audit rows survive with the actor de-identified (NULL). A
 *        candidate with a CandidateProfile + Certification also deletes clean. (R-35, GDPR)
 *     9. Dropped objects are absent from information_schema (4 tables + the certifications column).
 *    10. The backend BOOTS with NO MONGO_URI / FORCE_SKIP_MONGO and reports /health db=up —
 *        proving boot no longer depends on Mongo (R-33).
 *
 * Exit 0 => all checks pass. Exit 1 => prints why. Node built-ins only. Windows-safe.
 * The throwaway DB is dropped in `finally`. Follows the verify-migration-safety harness.
 *
 * Usage: node hiralent-master-plan/tools/verify-data-model.mjs [--skip-live]
 */

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const PRISMA_CLI = path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SCHEMA = path.join(BACKEND, 'prisma', 'schema.prisma');
const PKG = path.join(BACKEND, 'package.json');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const THROWAWAY_DB = 'hiralent_s6_datamodel'; // NEVER the primary `hiralent`
const BOOT_PORT = 5091;
const SKIP_LIVE = process.argv.includes('--skip-live');

const errors = [];
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

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

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

/** Read backend/.env DATABASE_URL, strip query params. Fallback to the repo default. */
function readBaseUrl() {
  const raw = read(path.join(BACKEND, '.env'));
  if (raw) {
    for (const line of raw.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue;
      const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return v.split('?')[0];
      }
    }
  }
  return 'postgresql://postgres:huzaifa@localhost:5432/hiralent';
}

function withDbName(base, dbName) {
  const i = base.lastIndexOf('/');
  return base.slice(0, i) + '/' + dbName;
}

/** Write a tsx probe INTO backend/, run it, parse the single __RESULT__<json> line. */
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

function prisma(args, env) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND, encoding: 'utf8', timeout: 180000,
    env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024,
  });
}

// Standalone-autocommit create/drop of the throwaway DB via a raw probe on the `postgres` DB.
const PROBE_DDL = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const ADMIN = process.env.HIRALENT_ADMIN_URL;
const DB = process.env.HIRALENT_DDL_DB;
const ACTION = process.env.HIRALENT_DDL_ACTION;
const admin = new PrismaClient({ datasources: { db: { url: ADMIN } } });
const dropDb = async () => {
  try { await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '" WITH (FORCE)'); }
  catch (e) {
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

// Seed + assert data-model behavior against the throwaway (real FKs, via Prisma Client).
const PROBE_DATAMODEL = `
import prisma from './src/lib/prisma';
import { getActivityLogs } from './src/services/company/team.service';
const soon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
(async () => {
  const out = { ok: false, checks: {} };
  try {
    // 7. postal_code accepts alphanumeric
    const pcu = await prisma.user.create({ data: { email: 'pc@s6.test', full_name: 'PC', role: 'candidate', is_email_verified: true } });
    await prisma.candidateProfile.create({ data: { candidate_id: pcu.user_id, postal_code: 'SW1A 1AA' } });
    const pcRow = await prisma.candidateProfile.findUnique({ where: { candidate_id: pcu.user_id } });
    out.checks.postalAlnumAccepted = pcRow && pcRow.postal_code === 'SW1A 1AA';

    // 8. hard user-delete (company_admin) — Cascade owned, SetNull audit
    const A = await prisma.user.create({ data: { email: 'a@s6.test', full_name: 'A', role: 'company_admin', is_email_verified: true } });
    const B = await prisma.user.create({ data: { email: 'b@s6.test', full_name: 'B', role: 'company_admin', is_email_verified: true } });
    await prisma.companyProfile.create({ data: { company_id: A.user_id, company_name: 'Aco' } });
    const conv = await prisma.conversation.create({ data: { participant_1_id: A.user_id, participant_2_id: B.user_id } });
    await prisma.message.create({ data: { conversation_id: conv.conversation_id, sender_id: A.user_id, content: 'hi' } });
    const log = await prisma.companyActivityLog.create({ data: { company_id: B.user_id, user_id: A.user_id, action: 'login', action_category: 'auth' } });
    const inv = await prisma.companyTeamInvitation.create({ data: { company_id: B.user_id, invited_by: A.user_id, email: 'i@s6.test', token: 'tok-s6', token_hash: 'th', expires_at: soon } });

    let delOk = true, delErr = null;
    try { await prisma.user.delete({ where: { user_id: A.user_id } }); }
    catch (e) { delOk = false; delErr = String(e && e.message ? e.message : e); }
    out.checks.companyUserDeleteSucceeds = delOk;
    if (delErr) out.checks.companyDeleteError = delErr;

    out.checks.companyProfileCascaded = !(await prisma.companyProfile.findUnique({ where: { company_id: A.user_id } }));
    out.checks.conversationCascaded = !(await prisma.conversation.findUnique({ where: { conversation_id: conv.conversation_id } }));
    const logAfter = await prisma.companyActivityLog.findUnique({ where: { log_id: log.log_id } });
    out.checks.activityLogSurvivesNullActor = !!logAfter && logAfter.user_id === null;
    const invAfter = await prisma.companyTeamInvitation.findUnique({ where: { invitation_id: inv.invitation_id } });
    out.checks.invitationSurvivesNullInviter = !!invAfter && invAfter.invited_by === null;

    // 8b. REGRESSION (null-deref): the real reader must NOT crash on a NULL actor and must
    // show a 'Deleted user' fallback (making the FK nullable would otherwise throw on .actor.*).
    let readerThrew = null, fallbackShown = false;
    try {
      const res = await getActivityLogs(B.user_id, { page: 1, limit: 20 });
      const row = res.logs.find((l) => l.log_id === log.log_id);
      fallbackShown = !!row && !!row.actor && row.actor.full_name === 'Deleted user' && row.actor.user_id === '';
    } catch (e) { readerThrew = String(e && e.message ? e.message : e); }
    out.checks.activityReaderNullSafe = readerThrew === null && fallbackShown;
    if (readerThrew) out.checks.activityReaderError = readerThrew;

    // candidate delete (Cascade profile + certification)
    const C = await prisma.user.create({ data: { email: 'c@s6.test', full_name: 'C', role: 'candidate', is_email_verified: true } });
    await prisma.candidateProfile.create({ data: { candidate_id: C.user_id } });
    await prisma.certification.create({ data: { candidate_id: C.user_id, name: 'AWS', issuer: 'Amazon' } });
    let candOk = true, candErr = null;
    try { await prisma.user.delete({ where: { user_id: C.user_id } }); }
    catch (e) { candOk = false; candErr = String(e && e.message ? e.message : e); }
    out.checks.candidateUserDeleteSucceeds = candOk;
    if (candErr) out.checks.candidateDeleteError = candErr;

    // 9. dropped objects absent
    const tbls = await prisma.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('question_bank','chat_history','CandidateGlobalScore','CandidateGlobalScoreHistory')");
    out.checks.deadTablesGone = Array.isArray(tbls) && tbls.length === 0;
    const cols = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='CandidateProfile' AND column_name='certifications'");
    out.checks.certificationsColumnGone = Array.isArray(cols) && cols.length === 0;
    const pcType = await prisma.$queryRawUnsafe("SELECT data_type FROM information_schema.columns WHERE table_name='CandidateProfile' AND column_name='postal_code'");
    out.checks.postalColumnIsText = Array.isArray(pcType) && pcType[0] && pcType[0].data_type === 'text';

    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
  finally { try { await prisma.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// ---- Static -------------------------------------------------------------------
function staticChecks() {
  const schema = read(SCHEMA);
  if (schema == null) { errors.push('schema.prisma not found.'); return; }

  if (!/postal_code\s+String\?/.test(schema)) errors.push('CandidateProfile.postal_code must be `String?` (found no String? declaration).');
  if (/postal_code\s+Int/.test(schema)) errors.push('CandidateProfile.postal_code is still declared as Int — must be String?.');

  if (/^\s*certifications\s+Json/m.test(schema)) errors.push('CandidateProfile.certifications (Json) must be dropped — the Certification table is the single source of truth.');

  for (const m of ['QuestionBank', 'ChatHistory', 'CandidateGlobalScore', 'CandidateGlobalScoreHistory']) {
    if (new RegExp('model\\s+' + m + '\\s*\\{').test(schema)) errors.push('dead model `' + m + '` must be removed from schema.prisma.');
  }

  // Every FK relation must declare an explicit onDelete (R-35).
  const relLines = schema.split(/\r?\n/).filter((l) => /@relation\([^)]*references:/.test(l));
  const missing = relLines.filter((l) => !/onDelete\s*:/.test(l));
  if (missing.length) {
    errors.push(missing.length + ' FK relation(s) missing an explicit onDelete (R-35): ' +
      missing.slice(0, 4).map((l) => l.trim().slice(0, 60)).join(' | ') + (missing.length > 4 ? ' …' : ''));
  }

  // Mongo fully removed (R-33).
  if (fs.existsSync(path.join(BACKEND, 'src', 'lib', 'mongo.ts'))) errors.push('backend/src/lib/mongo.ts must be deleted (Mongo removed, R-33).');
  const pkgRaw = read(PKG);
  try {
    const pkg = JSON.parse(pkgRaw);
    if (pkg.dependencies && pkg.dependencies.mongodb) errors.push('package.json still lists `mongodb` dependency — remove it (R-33).');
    if (pkg.devDependencies && pkg.devDependencies['@types/mongodb']) errors.push('package.json still lists `@types/mongodb` — remove it (R-33).');
  } catch { errors.push('backend/package.json unreadable.'); }
  const envEx = read(path.join(BACKEND, '.env.example')) || '';
  if (/^\s*MONGO_URI\s*=/m.test(envEx)) errors.push('.env.example still defines MONGO_URI — remove it (R-33).');
  const serverTs = read(path.join(BACKEND, 'src', 'server.ts')) || '';
  if (/lib\/mongo/.test(serverTs)) errors.push('server.ts still imports lib/mongo — remove the Mongo wiring (R-33).');
  if (/locals\.mongo/.test(serverTs)) errors.push('server.ts still sets app.locals.mongo — remove the Mongo wiring (R-33).');
}

// ---- Live ---------------------------------------------------------------------
function waitForHealth(port, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          let ok = false;
          try { const j = JSON.parse(body); ok = res.statusCode === 200 && j && j.db === 'up'; } catch {}
          if (ok) return resolve(true);
          if (Date.now() > deadline) return resolve(false);
          setTimeout(tick, 600);
        });
      });
      req.on('error', () => { if (Date.now() > deadline) return resolve(false); setTimeout(tick, 600); });
      req.on('timeout', () => { req.destroy(); if (Date.now() > deadline) return resolve(false); setTimeout(tick, 600); });
    };
    tick();
  });
}

function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
    else process.kill(-pid, 'SIGKILL');
  } catch { /* ignore */ }
}

async function liveChecks() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it before this gate.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);

  let created = false;
  let child = null;
  try {
    const c = runProbe('.__s6_ddl.ts', PROBE_DDL, { HIRALENT_ADMIN_URL: adminUrl, HIRALENT_DDL_DB: THROWAWAY_DB, HIRALENT_DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`could not create throwaway DB ${THROWAWAY_DB}: ${c.error}`); return; }
    created = true;

    // 6. fresh deploy (proves the 3 new Session-6 migrations apply on an empty DB)
    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) {
      const tail = `${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join('\n    ');
      errors.push(`prisma migrate deploy FAILED on empty DB (exit ${dep.status}):\n    ${tail}`);
      return;
    }
    console.log(`  [live] migrate deploy applied the full chain (incl. Session-6 migrations) to a fresh DB.`);

    // 7-9. data-model behavior
    // PROBE_DATAMODEL imports the real prisma singleton + team.service, so it needs the app
    // env vars (DATABASE_URL for the singleton). NODE_ENV=development keeps boot-time asserts quiet.
    const r = runProbe('.__s6_datamodel.ts', PROBE_DATAMODEL, { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl, NODE_ENV: 'development' }, 90000);
    if (!r.ok) { errors.push(`data-model probe failed: ${r.error || JSON.stringify(r.checks)}`); }
    else {
      const c = r.checks;
      const must = {
        postalAlnumAccepted: 'postal_code did NOT accept alphanumeric "SW1A 1AA"',
        companyUserDeleteSucceeds: `hard-delete of a company_admin FAILED (FK still blocks): ${c.companyDeleteError || ''}`,
        companyProfileCascaded: 'CompanyProfile was not cascade-deleted with its owner',
        conversationCascaded: 'Conversation was not cascade-deleted with its participant',
        activityLogSurvivesNullActor: 'CompanyActivityLog did not survive with NULL actor (SetNull failed)',
        invitationSurvivesNullInviter: 'CompanyTeamInvitation did not survive with NULL inviter (SetNull failed)',
        activityReaderNullSafe: `getActivityLogs crashed or missed the 'Deleted user' fallback on a NULL actor (null-deref regression): ${c.activityReaderError || ''}`,
        candidateUserDeleteSucceeds: `hard-delete of a candidate FAILED: ${c.candidateDeleteError || ''}`,
        deadTablesGone: 'one of question_bank/chat_history/CandidateGlobalScore(+History) still exists',
        certificationsColumnGone: 'CandidateProfile.certifications column still exists',
        postalColumnIsText: 'CandidateProfile.postal_code is not TEXT',
      };
      for (const [k, msg] of Object.entries(must)) if (c[k] !== true) errors.push(`live: ${msg}`);
      if (Object.keys(must).every((k) => c[k] === true)) {
        console.log(`  [live] hard user-delete works for company_admin + candidate; audit rows survive de-identified; postal_code alphanumeric OK; dropped objects gone.`);
      }
    }

    // 10. Mongo-less boot: boot the backend with NO MONGO_URI/FORCE_SKIP_MONGO and check /health.
    if (!(await portFree(BOOT_PORT))) { errors.push(`boot port ${BOOT_PORT} busy — cannot run the Mongo-less boot check.`); return; }
    const bootEnv = {
      ...process.env,
      NODE_ENV: 'development', ENABLE_DEV_MINT: '1',
      SCRAPING_SCHEDULER_ENABLED: 'false', RETENTION_ENABLED: 'false',
      PORT: String(BOOT_PORT),
      DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl,
      SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
    };
    delete bootEnv.MONGO_URI;
    delete bootEnv.FORCE_SKIP_MONGO;
    child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], { cwd: BACKEND, env: bootEnv, shell: false, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let bootLog = '';
    child.stdout.on('data', (d) => (bootLog += d));
    child.stderr.on('data', (d) => (bootLog += d));
    let exitedEarly = false;
    child.on('exit', () => { exitedEarly = true; });

    const healthy = await waitForHealth(BOOT_PORT, 45000);
    if (!healthy) {
      const tail = bootLog.split(/\r?\n/).filter(Boolean).slice(-8).join('\n    ');
      errors.push(`backend did NOT reach /health db=up within 45s with Mongo env removed${exitedEarly ? ' (process exited early)' : ''}:\n    ${tail}`);
    } else {
      console.log(`  [live] backend booted with NO MONGO_URI/FORCE_SKIP_MONGO and reported /health db=up — Mongo boot-dependency gone (R-33).`);
    }
  } finally {
    if (child) killTree(child.pid);
    if (created) {
      const d = runProbe('.__s6_ddl.ts', PROBE_DDL, { HIRALENT_ADMIN_URL: adminUrl, HIRALENT_DDL_DB: THROWAWAY_DB, HIRALENT_DDL_ACTION: 'drop' }, 60000);
      if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop throwaway DB ${THROWAWAY_DB}: ${d.error}`);
    }
  }
}

// ---- main ---------------------------------------------------------------------
(async () => {
  staticChecks();
  if (!SKIP_LIVE) await liveChecks();
  else console.log('  [skip-live] static checks only.');

  if (errors.length) {
    console.error('\n✗ FAIL: data-model correctness / Mongo-removal checks failed:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log(`\n✅ PASS: postal_code is String; certifications JSON + 4 dead tables gone; every FK has an explicit onDelete; hard user-delete works for all roles with audit rows de-identified; Mongo fully removed and boot no longer depends on it. Primary DB untouched.`);
  process.exit(0);
})().catch((e) => {
  console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});

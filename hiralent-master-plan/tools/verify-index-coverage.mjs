#!/usr/bin/env node
/**
 * verify-index-coverage.mjs — Wave 2 / Session 4 (Phase 2.4, R-30) — INFRA
 *
 * Proves the curated hot/append-only tables are indexed AND that those indexes are
 * actually USED by the top hot queries — without ever touching the primary `hiralent`.
 *
 *   Static (offline):
 *     Parse schema.prisma and assert EVERY index in the curated REQUIRED set (the
 *     5 flagged tables + hot operational tables) is declared as an `@@index`. A missing
 *     one fails loud, so schema edits and the shipped migration can't silently drop an
 *     index. (This is "flagged tables' required indexes maujood", extended to the full set.)
 *
 *   Live (throwaway DB — NEVER the primary `hiralent`):
 *     Create `hiralent_s4_idxcov`, `prisma migrate deploy` the whole chain, seed the 5
 *     flagged tables with ~20k deterministic rows each (FK triggers disabled via
 *     session_replication_role=replica so no parent rows are needed), ANALYZE, then run
 *     each of the 5 top hot queries under `EXPLAIN (ANALYZE, FORMAT JSON)` and assert the
 *     plan uses an **Index Scan on the expected index**. A CONTROL query on an *unindexed*
 *     column at the same row count must fall back to **Seq Scan** — proving the index is the
 *     differentiator, not just small data. An `enable_seqscan=off` pass is accepted as a
 *     robustness fallback if the cost model ever wavers at this volume.
 *
 * The throwaway DB is created/dropped and seeded via Prisma raw probes written into
 * backend/ (so pnpm resolves @prisma/client), run with tsx, results parsed from a
 * __RESULT__ sentinel line — the same idiom as verify-migration-safety.mjs. The throwaway
 * DB is dropped in `finally`.
 *
 * Exit 0 => required indexes present AND proven used. Exit 1 => prints why.
 * Node built-ins only. Windows-safe (no shell).
 *
 * Usage: node hiralent-master-plan/tools/verify-index-coverage.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const PRISMA_CLI = path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SCHEMA = path.join(BACKEND, 'prisma', 'schema.prisma');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const THROWAWAY_DB = 'hiralent_s4_idxcov'; // NEVER the primary `hiralent`

const errors = [];
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

// The curated required-index set (source of truth). Keyed by model name; each value is a
// list of column-arrays (order-sensitive). Kept in lockstep with the shipped migration.
const REQUIRED = {
  // Tier 1 — the 5 flagged append-only/hot tables
  AdminAuditLog: [['admin_id', 'created_at'], ['target_table', 'target_id'], ['created_at']],
  CommunicationLog: [['recipient_id', 'created_at'], ['sender_id', 'created_at'], ['status'], ['campaign_id']],
  UsageAnalytics: [['user_id', 'timestamp'], ['action_type', 'timestamp'], ['timestamp']],
  Message: [['conversation_id', 'sent_at'], ['sender_id']],
  CodeSubmission: [['assessment_id', 'candidate_id', 'created_at'], ['candidate_id'], ['question_id'], ['status']],
  // Tier 2 — curated hot operational tables
  JobApplicationEventOutbox: [['created_at']],
  // CandidateGlobalScore dropped in Session 6 (write-only dead table, R-37) — no longer an index target.
  AIInterviewResult: [['candidate_id', 'created_at'], ['status']],
  SkillAssessment: [['candidate_id', 'created_at'], ['status']],
  RelocationCase: [['candidate_id'], ['agency_id', 'status']],
  CaseAssignment: [['agency_id', 'status']],
  CompanyAgencyInvitation: [['agency_id', 'status']],
  MatchingOutboxEvent: [['created_at']],
  CandidateDocument: [['candidate_id', 'created_at']],
  CandidateSkill: [['candidate_id']],
  SkillExtraction: [['candidate_id', 'status']],
  CareerPrediction: [['candidate_id']],
  InterviewSchedule: [['status', 'created_at']],
  HiringAnalytics: [['company_id', 'created_at']],
  RelocationAnalytics: [['agency_id', 'created_at']],
  EmbassySubmission: [['status', 'created_at']],
  SourcedCandidate: [['status', 'created_at']],
};

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
const withDbName = (base, dbName) => base.slice(0, base.lastIndexOf('/')) + '/' + dbName;

/** Write a tsx probe into backend/, run it, parse the __RESULT__ line. */
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

function prisma(args, env) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND, encoding: 'utf8', timeout: 180000,
    env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024,
  });
}

// ---- 1. Static: required indexes declared in schema.prisma --------------------
function staticChecks() {
  const src = read(SCHEMA);
  if (src == null) { errors.push('schema.prisma not found.'); return; }
  const lines = src.split(/\r?\n/);

  // Parse each model block -> set of index signatures ("col1,col2"). Closes a model on a
  // line that is only "}" (optionally indented) — tolerant of the anomalously-indented
  // CodeSubmission block.
  const modelIndexes = {};
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (m) { cur = m[1]; modelIndexes[cur] = new Set(); continue; }
    if (cur) {
      const idx = line.match(/@@index\(\[([^\]]+)\]/);
      if (idx) {
        const cols = idx[1].split(',').map((s) => s.trim().replace(/\(.*$/, '')); // strip (sort: ...) modifiers
        modelIndexes[cur].add(cols.join(','));
      }
      const uq = line.match(/@@unique\(\[([^\]]+)\]/);
      if (uq) {
        const cols = uq[1].split(',').map((s) => s.trim().replace(/\(.*$/, ''));
        modelIndexes[cur].add(cols.join(','));
      }
      if (/^\s*\}\s*$/.test(line)) cur = null;
    }
  }

  let present = 0, total = 0;
  for (const [model, idxList] of Object.entries(REQUIRED)) {
    const have = modelIndexes[model];
    if (!have) { errors.push(`model ${model} not found in schema.prisma (required-index target).`); continue; }
    for (const cols of idxList) {
      total += 1;
      if (have.has(cols.join(','))) present += 1;
      else errors.push(`missing @@index([${cols.join(', ')}]) on model ${model}.`);
    }
  }
  if (!errors.length) console.log(`  [static] all ${present}/${total} required indexes declared across ${Object.keys(REQUIRED).length} curated hot tables.`);
}

// ---- DDL probe: create/drop the throwaway (via postgres maintenance DB) --------
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

// ---- Seed + EXPLAIN probe (runs against the freshly-migrated throwaway) ---------
// SQL literals use single quotes; mixed-case identifiers ("AdminAuditLog", "timestamp")
// are concatenated so no JS-quote escaping is needed inside this template.
const N = 20000;
const PROBE_EXPLAIN = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
const N = ${N};

const nodeList = (node, acc = []) => {
  if (!node) return acc;
  if (Array.isArray(node)) { node.forEach((n) => nodeList(n, acc)); return acc; }
  if (typeof node === 'object') {
    if (node['Node Type']) acc.push({ type: node['Node Type'], index: node['Index Name'] || null });
    for (const k of Object.keys(node)) if (typeof node[k] === 'object') nodeList(node[k], acc);
  }
  return acc;
};
const explain = async (sql, forced) => {
  const run = (c) => c.$queryRawUnsafe('EXPLAIN (ANALYZE, FORMAT JSON) ' + sql);
  let rows;
  if (forced) rows = await db.$transaction(async (t) => { await t.$executeRawUnsafe('SET LOCAL enable_seqscan=off'); return run(t); });
  else rows = await run(db);
  return nodeList(rows[0]['QUERY PLAN'][0].Plan);
};

const SEED = [
  "INSERT INTO messages (message_id, conversation_id, sender_id, sent_at, content) SELECT gs::text, 'conv-'||(gs%200), 'user-'||(gs%50), TIMESTAMP '2026-01-01 00:00:00'+(gs||' seconds')::interval, 'msg-'||gs FROM generate_series(1," + N + ") gs",
  "INSERT INTO code_submissions (submission_id, assessment_id, candidate_id, question_id, language, code, status, created_at, updated_at) SELECT gs::text, 'a-'||(gs%200), 'c-'||(gs%200), 'q-'||(gs%50), 'py', 'x', 'done', TIMESTAMP '2026-01-01 00:00:00'+(gs||' seconds')::interval, NOW() FROM generate_series(1," + N + ") gs",
  'INSERT INTO usage_analytics (usage_id, user_id, action_type, "timestamp") SELECT gs::text, ' + "'user-'||(gs%200), 'act', TIMESTAMP '2026-01-01 00:00:00'+(gs||' seconds')::interval FROM generate_series(1," + N + ") gs",
  "INSERT INTO communication_logs (log_id, sender_id, recipient_id, message_type, content, status, created_at, updated_at) SELECT gs::text, 'user-s', 'user-'||(gs%200), 'email', 'c', 'sent', TIMESTAMP '2026-01-01 00:00:00'+(gs||' seconds')::interval, NOW() FROM generate_series(1," + N + ") gs",
  'INSERT INTO "AdminAuditLog" (log_id, admin_id, action_type, target_table, target_id, created_at) SELECT gs::text, ' + "'user-'||(gs%200), 'act', 't', 'x', TIMESTAMP '2026-01-01 00:00:00'+(gs||' seconds')::interval FROM generate_series(1," + N + ") gs",
];
const ANALYZE = ['ANALYZE messages', 'ANALYZE code_submissions', 'ANALYZE usage_analytics', 'ANALYZE communication_logs', 'ANALYZE "AdminAuditLog"'];

const QUERIES = [
  { name: 'messages',           idx: 'messages_conversation_id_sent_at_idx',                         sql: "SELECT message_id, sent_at FROM messages WHERE conversation_id='conv-7' ORDER BY sent_at DESC LIMIT 30" },
  { name: 'code_submissions',   idx: 'code_submissions_assessment_id_candidate_id_created_at_idx',   sql: "SELECT submission_id FROM code_submissions WHERE assessment_id='a-7' AND candidate_id='c-7' ORDER BY created_at DESC LIMIT 30" },
  { name: 'usage_analytics',    idx: 'usage_analytics_user_id_timestamp_idx',                        sql: 'SELECT usage_id FROM usage_analytics WHERE user_id=' + "'user-7'" + ' ORDER BY "timestamp" DESC LIMIT 30' },
  { name: 'communication_logs', idx: 'communication_logs_recipient_id_created_at_idx',               sql: "SELECT log_id FROM communication_logs WHERE recipient_id='user-7' ORDER BY created_at DESC LIMIT 30" },
  { name: 'AdminAuditLog',      idx: 'AdminAuditLog_admin_id_created_at_idx',                         sql: 'SELECT log_id FROM "AdminAuditLog" WHERE admin_id=' + "'user-7'" + ' ORDER BY created_at DESC LIMIT 30' },
];
// selective predicate on an UNINDEXED column at the same volume -> must Seq Scan
const CONTROL = "SELECT message_id FROM messages WHERE content='msg-12345' ORDER BY sent_at DESC LIMIT 30";

(async () => {
  const out = { ok: false, results: [] };
  try {
    await db.$connect();
    // Seed with FK triggers disabled (throwaway only) so no parent rows are needed.
    await db.$transaction(async (t) => {
      await t.$executeRawUnsafe('SET LOCAL session_replication_role = replica');
      for (const s of SEED) await t.$executeRawUnsafe(s);
    }, { timeout: 120000 });
    for (const a of ANALYZE) await db.$executeRawUnsafe(a);

    const usesIdx = (nodes, name) => nodes.some((n) => /Index (Only )?Scan/.test(n.type) && n.index === name);
    const hasSeq = (nodes) => nodes.some((n) => n.type === 'Seq Scan');

    for (const q of QUERIES) {
      const natural = await explain(q.sql, false);
      const forced = await explain(q.sql, true);
      out.results.push({ name: q.name, idx: q.idx, naturalUsesIdx: usesIdx(natural, q.idx), forcedUsesIdx: usesIdx(forced, q.idx), naturalTypes: natural.map((n) => n.type) });
    }
    const controlNodes = await explain(CONTROL, false);
    out.controlIsSeqScan = hasSeq(controlNodes);
    out.controlTypes = controlNodes.map((n) => n.type);
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

async function liveChecks() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found at ${path.relative(ROOT, PRISMA_CLI)} — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it (docker compose up -d postgres) before this gate.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);

  let created = false;
  try {
    const c = runProbe('.__idx_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`could not create throwaway DB ${THROWAWAY_DB}: ${c.error}`); return; }
    created = true;

    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) {
      const tail = `${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join('\n    ');
      errors.push(`prisma migrate deploy FAILED on throwaway (exit ${dep.status}):\n    ${tail}`);
      return;
    }

    const r = runProbe('.__idx_explain.ts', PROBE_EXPLAIN, { TARGET_URL: targetUrl }, 180000);
    if (!r.ok) { errors.push(`EXPLAIN probe failed: ${r.error}`); return; }

    // STRICT: the planner must choose the index NATURALLY at scale. Accepting an
    // enable_seqscan=off-only pass would green-light an index the planner never actually
    // uses (dead weight) — so `forced` is diagnostic only, never a substitute for natural.
    for (const res of r.results) {
      if (res.naturalUsesIdx) {
        console.log(`  [live] ${res.name}: Index Scan on ${res.idx} (naturally chosen${res.forcedUsesIdx ? '' : '; note: not usable when forced'}).`);
      } else {
        const hint = res.forcedUsesIdx
          ? ' — it IS usable with enable_seqscan=off, but the planner rejects it at scale, so it is not earning its keep (check column order / selectivity)'
          : '';
        errors.push(`hot query on ${res.name} did NOT naturally use index ${res.idx} (plan: ${res.naturalTypes.join(' > ')})${hint}.`);
      }
    }
    if (!r.controlIsSeqScan) {
      errors.push(`CONTROL query on unindexed column did NOT Seq Scan (plan: ${(r.controlTypes || []).join(' > ')}) — index-vs-noindex differentiation unproven.`);
    } else {
      console.log(`  [live] control (unindexed column) correctly Seq Scans — index is the differentiator.`);
    }
  } finally {
    if (created) {
      const d = runProbe('.__idx_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000);
      if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop throwaway DB ${THROWAWAY_DB}: ${d.error}`);
    }
  }
}

// ---- main --------------------------------------------------------------------
(async () => {
  staticChecks();
  await liveChecks();

  if (errors.length) {
    console.error('\n✗ FAIL: hot-table index coverage not proven:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  const idxCount = Object.values(REQUIRED).reduce((n, l) => n + l.length, 0);
  const proven = 5; // the 5 flagged tables are EXPLAIN-proven; the rest are static-only (FK/status indexes, standard usage)
  console.log(`\n✅ PASS: ${idxCount} curated hot-table indexes across ${Object.keys(REQUIRED).length} models are declared (static); the ${proven} flagged hot tables are additionally proven Index-Scan (naturally chosen) with a Seq-Scan control (live on throwaway). The other ${Object.keys(REQUIRED).length - proven} models are coverage-checked statically only. Primary DB untouched. (R-30)`);
  process.exit(0);
})().catch((e) => {
  console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});

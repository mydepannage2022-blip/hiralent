#!/usr/bin/env node
/**
 * verify-connection-pool.mjs — Wave 2 / Session 2 (Phase 2.1, R-06b) — INFRA
 *
 * LIVE proof that Prisma's connection pool is actually BOUNDED by the
 * `connection_limit` URL param (R-06). Two independent tests, both hitting a real
 * Postgres and measuring the pool through `pg_stat_activity`:
 *
 *   Test A (mechanism) — a hand-built Prisma client with `connection_limit=5` is
 *     flooded with 15 concurrent `pg_sleep` queries. A separate counter connection
 *     samples how many of ITS backends are active. Peak MUST hit the limit (proving
 *     the bound engages under pressure) and MUST NOT exceed it. If the param were
 *     ignored, Prisma's default (cpus*2+1, ~17 here) would blow past 5.
 *
 *   Test B (real server) — the actual backend is booted with
 *     `DATABASE_URL=...?connection_limit=5&application_name=hiralent_httptest` and hit
 *     with 30 parallel signups. The server's pool must stay <= the limit under real
 *     HTTP concurrency (proves the running process honors the env-configured bound).
 *
 * How it measures without a `pg` client: the repo has only Prisma, so both tests run
 * as tsx "probes" written INTO the backend dir (so pnpm resolves `@prisma/client`) and
 * talk to Postgres via `prisma.$queryRaw`. Connections are isolated by `application_name`
 * (confirmed to pass through Prisma 6.19) and `state='active'`.
 *
 * Exit 0 => both bounds hold + engage. Exit 1 => prints why. Node built-ins + global
 * fetch only. Windows-safe. Skips cleanly (fails with a clear message) if Postgres or
 * tsx is unavailable.
 *
 * Usage: node hiralent-master-plan/tools/verify-connection-pool.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const HTTP_PORT = 5097; // distinct from verify-local-run (5099) / verify-auth-session (5098)
const HTTP_BASE = `http://127.0.0.1:${HTTP_PORT}`;
// The test only PROVES the param binds if the enforced limit is BELOW Prisma's
// default (num_cpus*2+1) — otherwise an ignored connection_limit would coincidentally
// cap at the default and pass. So derive LIMIT from the current machine to stay
// strictly under the default on any core count (2-core default=5 would collide with a
// hardcoded 5; 1-core default=3 with a hardcoded 3). N (flood width) stays > LIMIT.
const PRISMA_DEFAULT = os.cpus().length * 2 + 1;      // e.g. 8 cores => 17, 2 cores => 5, 1 core => 3
const LIMIT = Math.min(5, Math.max(2, PRISMA_DEFAULT - 2)); // always < PRISMA_DEFAULT, >= 2

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

/** Read the base Postgres URL from backend/.env DATABASE_URL, stripping any query params. */
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

/** Write a tsx probe INTO backend/ (pnpm module resolution), run it, return parsed __RESULT__ JSON. */
function runProbe(fileName, source, extraEnv, timeoutMs) {
  const probePath = path.join(BACKEND, fileName);
  try {
    fs.writeFileSync(probePath, source);
    const r = spawnSync(process.execPath, [TSX_CLI, fileName], {
      cwd: BACKEND, encoding: 'utf8', timeout: timeoutMs,
      env: { ...process.env, ...extraEnv },
      maxBuffer: 16 * 1024 * 1024,
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

// ---- Probe sources ----------------------------------------------------------
const PROBE_A = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const BASE = process.env.HIRALENT_PG_BASE;
const LIMIT = Number(process.env.HIRALENT_LIMIT || '5');
const N = 15;
const mk = (p) => new PrismaClient({ datasources: { db: { url: BASE + '?' + p } } });
const loader = mk('connection_limit=' + LIMIT + '&pool_timeout=30&application_name=hiralent_pooltest');
const counter = mk('connection_limit=1&application_name=hiralent_probe');
(async () => {
  const out = {};
  try {
    await loader.$connect();
    await counter.$connect();
    const sample = async () => {
      const r = await counter.$queryRawUnsafe("SELECT count(*)::int AS c FROM pg_stat_activity WHERE application_name='hiralent_pooltest' AND state='active'");
      return Number(r[0].c);
    };
    const flood = [];
    for (let i = 0; i < N; i++) flood.push(loader.$queryRawUnsafe('SELECT pg_sleep(0.5)::text AS s'));
    let settled = false;
    const done = Promise.allSettled(flood).then(() => { settled = true; });
    let peak = 0, samples = 0;
    while (!settled) { const c = await sample(); if (c > peak) peak = c; samples++; await new Promise((r) => setTimeout(r, 15)); }
    await done;
    out.ok = true; out.peak = peak; out.samples = samples; out.limit = LIMIT; out.n = N;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await loader.$disconnect(); } catch {} try { await counter.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

const PROBE_B = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const PG_BASE = process.env.HIRALENT_PG_BASE;
const HTTP = process.env.HIRALENT_HTTP_BASE;
const LIMIT = Number(process.env.HIRALENT_LIMIT || '5');
const N = 30;
const counter = new PrismaClient({ datasources: { db: { url: PG_BASE + '?connection_limit=1&application_name=hiralent_probe' } } });
(async () => {
  const out = {};
  try {
    await counter.$connect();
    const sample = async () => {
      const r = await counter.$queryRawUnsafe("SELECT count(*)::int AS c FROM pg_stat_activity WHERE application_name='hiralent_httptest' AND state='active'");
      return Number(r[0].c);
    };
    const ts = Date.now();
    const reqs = [];
    for (let i = 0; i < N; i++) {
      const body = { email: 'pool_' + ts + '_' + i + '@local.test', password: 'secret123', full_name: 'Pool Test', role: 'candidate' };
      reqs.push(
        fetch(HTTP + '/api/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) })
          .then((r) => r.status).catch(() => 0)
      );
    }
    let settled = false;
    const allDone = Promise.allSettled(reqs).then(() => { settled = true; });
    let peak = 0, samples = 0;
    while (!settled) { const c = await sample(); if (c > peak) peak = c; samples++; await new Promise((r) => setTimeout(r, 15)); }
    const statuses = await Promise.all(reqs);
    await allDone;
    out.ok = true; out.peak = peak; out.samples = samples; out.limit = LIMIT; out.n = N;
    out.created = statuses.filter((s) => s === 201).length;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await counter.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// ---- Boot the real backend (Test B) -----------------------------------------
async function bootServer(base) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(HTTP_PORT),
    DATABASE_URL: `${base}?connection_limit=${LIMIT}&pool_timeout=20&application_name=hiralent_httptest`,
    DIRECT_DATABASE_URL: base,
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1',
    // Neutralise rate limiting so 30 parallel signups all reach the DB handler.
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

  // wait for /health db:up (45s deadline)
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

// ---- main -------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(TSX_CLI)) { errors.push(`tsx not found at ${path.relative(ROOT, TSX_CLI)} — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it (docker compose up -d postgres) before this gate.`); return; }
  // Test B boots a server on HTTP_PORT — if something is already there, our /health poll
  // would read a foreign process and the measurement would be meaningless. Fail loudly.
  if (await tcpReachable('127.0.0.1', HTTP_PORT, 500)) { errors.push(`port ${HTTP_PORT} already in use — free it (a stale test server?) before running this gate.`); return; }

  const base = readBaseUrl();

  // ---- Test A — pool bound engages at the limit under pressure --------------
  const a = runProbe('.__pool_probe_a.ts', PROBE_A, { HIRALENT_PG_BASE: base, HIRALENT_LIMIT: String(LIMIT) }, 60000);
  if (!a.ok) {
    errors.push(`[A] pool probe failed: ${a.error}`);
  } else {
    if (a.peak > LIMIT) errors.push(`[A] pool exceeded connection_limit: peak=${a.peak} > ${LIMIT} (bound NOT enforced).`);
    if (a.peak < LIMIT - 1) errors.push(`[A] bound did not engage: peak=${a.peak} under ${LIMIT} despite ${a.n} concurrent queries (param likely ignored; samples=${a.samples}).`);
    if (!errors.length) console.log(`  [A] pool bound OK — peak ${a.peak}/${LIMIT} active connections across ${a.n} concurrent queries (${a.samples} samples).`);
  }

  // ---- Test B — real booted server honors the bound under HTTP load ---------
  let server = null;
  try {
    server = await bootServer(base);
    if (!server.ready) {
      const tail = server.getLog().split(/\r?\n/).filter(Boolean).slice(-10).join('\n    ');
      errors.push(`[B] backend did not become healthy on ${HTTP_BASE}. Log tail:\n    ${tail}`);
    } else {
      const b = runProbe('.__pool_probe_b.ts', PROBE_B, { HIRALENT_PG_BASE: base, HIRALENT_HTTP_BASE: HTTP_BASE, HIRALENT_LIMIT: String(LIMIT) }, 90000);
      if (!b.ok) {
        errors.push(`[B] http probe failed: ${b.error}`);
      } else if (b.created < 1) {
        errors.push(`[B] no signups succeeded (created=${b.created}/${b.n}) — load never reached the DB, test invalid.`);
      } else if (b.peak > LIMIT) {
        errors.push(`[B] server pool exceeded connection_limit under load: peak=${b.peak} > ${LIMIT}.`);
      } else if (b.peak < 1) {
        errors.push(`[B] no active server connections observed during ${b.n} parallel signups (created=${b.created}).`);
      } else {
        console.log(`  [B] real server bound OK — peak ${b.peak}/${LIMIT} active connections under ${b.n} parallel signups (${b.created} created).`);
      }
    }
  } finally {
    if (server && server.child) killTree(server.child.pid);
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: connection-pool bound not proven:');
      for (const e of errors) console.error(`  - ${e}`);
      console.error(`\n${errors.length} problem(s).`);
      process.exit(1);
    }
    console.log(`\n✅ PASS: Prisma pool bounded by connection_limit=${LIMIT} (< machine default ${PRISMA_DEFAULT}, so a pass proves the param binds) — proven live (mechanism + real booted server) via pg_stat_activity.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * verify-error-envelope.mjs — Session 1 (Error / Health / Envelope backbone, R-36/R-32/P6)
 *
 * Proves the error/health/envelope contract HOLDS against a real running backend —
 * not just that the code type-checks:
 *
 *   1. Throwing routes → standard error envelope 500 (NO hang, NO stack leak in
 *      the response body), for BOTH the synchronous throw and the async-rejection
 *      path (Express 5 auto-forward). This is the crash-leak guarantee.
 *   2. Unknown route → standard 404 envelope.
 *   3. GET /health → 200 { db:"up" } (liveness, unchanged) and the NEW
 *      GET /health/ready → 200 { success:true, data:{ ready:true } } (readiness).
 *   4. POST /api/v1/auth/signup → 201 with the aggressive success envelope
 *      { success:true, data:{ token, user, emailDelivered } }.
 *   5. R-32: with SMTP pointed at a dead address, signup still returns 201 but
 *      data.emailDelivered === false — the delivery failure is SURFACED, not
 *      silently swallowed.
 *   6. DB-down path (second short boot, unreachable DATABASE_URL): /health → 503
 *      { db:"down" } AND /health/ready → 503 { success:false, error:{code:"NOT_READY"} }.
 *   7. Production stack-suppression (in-process, NODE_ENV=production): the
 *      errorHandler collapses an unknown error to a generic 500 envelope with NO
 *      stack / internal message — proven by importing the real handler via tsx.
 *
 * Exit 0 => the whole contract holds. Exit 1 => a precondition or assertion failed
 * (prints why + a captured server-log tail). Node built-ins only. Windows-safe.
 *
 * Usage:  node hiralent-master-plan/tools/verify-error-envelope.mjs
 * Prereq: Postgres reachable on 127.0.0.1:5432 + `pnpm install` (+ prisma generate)
 *         in backend/ (same as verify-local-run).
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
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5091; // off 5000/5099 so a running dev server or verify-local-run never collides
const BASE = `http://127.0.0.1:${PORT}`;

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tcpReachable(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => { if (!done) { done = true; socket.destroy(); resolve(ok); } };
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
  else { try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ } }
}

/** Spawn the backend with the given env overlay; resolve once /health responds (any status). */
async function bootBackend(envOverlay, waitForDbUp, deadlineMs = 50000) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1', // the boom probes + /dev routes are gated on this
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(PORT),
    // SMTP pointed at a guaranteed-refused address → sendEmail fast-fails, so
    // signup's emailDelivered flips false without hanging on a real mailserver.
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
    ...envOverlay,
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false;
  child.on('exit', (code) => { if (code !== null) exitedEarly = true; });

  const deadline = Date.now() + deadlineMs;
  let ready = false;
  while (Date.now() < deadline) {
    if (exitedEarly) break;
    try {
      const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.status) {
        if (!waitForDbUp) { ready = true; break; }
        const body = await r.json().catch(() => ({}));
        if (body?.db === 'up') { ready = true; break; }
      }
    } catch { /* not up yet */ }
    await sleep(600);
  }
  return { child, ready, getLog: () => log };
}

/** GET returning { status, text, body }. Short timeout doubles as the no-hang guard. */
async function get(pathname, timeoutMs = 6000) {
  const res = await fetch(`${BASE}${pathname}`, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = null; }
  return { status: res.status, text, body };
}

function assertErrorEnvelope(where, r, expectedStatus, expectedCode) {
  if (r.status !== expectedStatus) errors.push(`${where}: expected ${expectedStatus}, got ${r.status}.`);
  if (!r.body || r.body.success !== false || !r.body.error?.code || !r.body.error?.message) {
    errors.push(`${where}: not a standard error envelope → ${r.text.slice(0, 160)}`);
  } else if (expectedCode && r.body.error.code !== expectedCode) {
    errors.push(`${where}: expected error.code=${expectedCode}, got ${r.body.error.code}.`);
  }
}

async function main() {
  // --- Preconditions --------------------------------------------------------
  if (!fs.existsSync(TSX_CLI)) errors.push('tsx not found — run `pnpm install` in backend/.');
  if (!fs.existsSync(path.join(BACKEND, 'node_modules', '@prisma', 'client', 'default.js')))
    errors.push('@prisma/client not installed — run `pnpm install` (+ prisma generate) in backend/.');
  if (!(await tcpReachable(PG_HOST, PG_PORT))) errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`);
  if (await tcpReachable('127.0.0.1', PORT, 600)) errors.push(`Test port ${PORT} already in use.`);
  if (errors.length) return;

  // ===== Boot 1: DB up ======================================================
  let boot = await bootBackend({}, true);
  if (!boot.ready) {
    errors.push('backend did not report GET /health 200 {db:"up"} within 50s (boot 1).');
    const tail = boot.getLog().split(/\r?\n/).filter(Boolean).slice(-12).join('\n    ');
    if (tail) errors.push(`--- boot1 log tail ---\n    ${tail}`);
    killTree(boot.child.pid);
    return;
  }
  try {
    // 1. Throwing routes → 500 envelope, no hang (sync + async).
    for (const route of ['/dev/boom-sync', '/dev/boom-async']) {
      try {
        assertErrorEnvelope(route, await get(route, 6000), 500, 'INTERNAL');
      } catch (e) { errors.push(`${route}: request hung/failed (${e.message}).`); }
    }

    // 2. Unknown route → 404 envelope.
    assertErrorEnvelope('/__nope__', await get('/__nope__'), 404, 'NOT_FOUND');

    // 3. Health (liveness unchanged) + readiness (new, success envelope).
    {
      const h = await get('/health');
      if (h.status !== 200 || h.body?.db !== 'up') errors.push(`/health expected 200 {db:up}, got ${h.status} ${h.text.slice(0, 120)}.`);
      const ready = await get('/health/ready');
      if (ready.status !== 200 || ready.body?.success !== true || ready.body?.data?.ready !== true)
        errors.push(`/health/ready expected 200 {success:true,data:{ready:true}}, got ${ready.status} ${ready.text.slice(0, 140)}.`);
    }

    // 4 + 5. Signup → 201 success envelope; emailDelivered surfaced false (broken SMTP).
    {
      const email = `envelope+${Date.now()}@local.test`;
      const res = await fetch(`${BASE}/api/v1/auth/signup`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'secret123', full_name: 'Envelope Verify', role: 'candidate' }),
        signal: AbortSignal.timeout(25000),
      });
      const text = await res.text();
      let body; try { body = JSON.parse(text); } catch { body = null; }
      if (res.status !== 201) errors.push(`signup expected 201, got ${res.status} (${body?.error?.message || 'no message'}).`);
      if (!body || body.success !== true || !body.data?.token || !body.data?.user?.email)
        errors.push(`signup: not a success envelope with data.token/user → ${text.slice(0, 160)}`);
      if (body?.data && body.data.emailDelivered !== false)
        errors.push(`[R-32] signup data.emailDelivered should be false with broken SMTP, got ${JSON.stringify(body?.data?.emailDelivered)} (silent success?).`);
      // Security regression guard: the signup response must NEVER carry credential columns.
      if (/password_hash|mfa_secret/i.test(text))
        errors.push(`[LEAK] signup response exposed a credential column (password_hash/mfa_secret) → ${text.slice(0, 200)}`);
    }
  } finally {
    killTree(boot.child.pid);
  }

  // ===== DB-down → 503 on BOTH health routes (deterministic in-process probe) ==
  // Booting a whole second backend just to fail its DB is slow + flaky under load
  // (the server's 5×2s connect-retry + tsx cold-start). Instead mount ONLY the real
  // health router on an ephemeral express app with an unreachable DATABASE_URL —
  // prisma.$queryRaw then fails in ~connect_timeout, so /health→503{db:down} and
  // /health/ready→503 envelope, proven fast and reliably (no schedulers/socket/retry).
  if (!errors.length) {
    const deadUrl = 'postgresql://nouser:nopass@127.0.0.1:1/nodb?connection_limit=5&connect_timeout=2';
    const probe = `
import express from 'express';
import healthRoutes from ${JSON.stringify(path.join(BACKEND, 'src/routes/health.routes.ts'))};
import prisma from ${JSON.stringify(path.join(BACKEND, 'src/lib/prisma.ts'))};
const app = express();
app.use(healthRoutes);
const server = app.listen(0, async () => {
  const p = server.address().port;
  const out = {};
  try {
    const h = await fetch('http://127.0.0.1:' + p + '/health');
    out.hStatus = h.status; out.hBody = await h.json().catch(() => ({}));
    const r = await fetch('http://127.0.0.1:' + p + '/health/ready');
    out.rStatus = r.status; out.rBody = await r.json().catch(() => ({}));
  } catch (e) { out.error = String(e && e.message || e); }
  process.stdout.write('__RESULT__' + JSON.stringify(out));
  // Cleanly tear down the prisma engine BEFORE exit — abruptly process.exit()-ing
  // while its async handles are closing triggers a libuv assertion on Windows.
  try { await prisma.\$disconnect(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
});
`;
    const probePath = path.join(BACKEND, `.__envelope_dbdown_probe_${process.pid}.ts`);
    try {
      fs.writeFileSync(probePath, probe);
      const res = spawnSync(process.execPath, [TSX_CLI, probePath], {
        cwd: BACKEND, encoding: 'utf8', timeout: 60000,
        env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: deadUrl, DIRECT_URL: deadUrl, SHADOW_DATABASE_URL: deadUrl },
      });
      // NOTE: the result is written to stdout BEFORE teardown; a benign libuv
      // process-exit assertion on Windows can make the exit code non-zero AFTER
      // we already have the data, so trust the __RESULT__ marker, not res.status.
      const marker = (res.stdout || '').indexOf('__RESULT__');
      if (marker < 0) {
        errors.push(`[DB-down] probe failed to run: ${(res.stderr || res.stdout || '').split(/\r?\n/).filter(Boolean).slice(-4).join(' ')}`);
      } else {
        const out = JSON.parse(res.stdout.slice(marker + '__RESULT__'.length));
        if (out.hStatus !== 503 || out.hBody?.db !== 'down') errors.push(`[DB-down] /health expected 503 {db:down}, got ${out.hStatus} ${JSON.stringify(out.hBody).slice(0, 120)}.`);
        if (out.rStatus !== 503 || out.rBody?.success !== false || out.rBody?.error?.code !== 'NOT_READY')
          errors.push(`[DB-down] /health/ready expected 503 NOT_READY envelope, got ${out.rStatus} ${JSON.stringify(out.rBody).slice(0, 140)}.`);
      }
    } catch (e) {
      errors.push(`[DB-down] probe error: ${e.message}`);
    } finally {
      try { fs.unlinkSync(probePath); } catch { /* ignore */ }
    }
  }

  // ===== 7. Production stack-suppression (in-process, no full boot) ==========
  if (!errors.length) {
    const probe = `
import { errorHandler } from ${JSON.stringify(path.join(BACKEND, 'src/middlewares/errorHandler.middleware.ts'))};
function fakeRes(){ const r={statusCode:0,body:null,headersSent:false}; r.status=(s)=>{r.statusCode=s;return r}; r.json=(b)=>{r.body=b;return r}; return r; }
const r=fakeRes();
errorHandler(new Error('SUPER_SECRET_INTERNAL_DETAIL'), {method:'GET',originalUrl:'/x'}, r, ()=>{});
process.stdout.write(JSON.stringify({ status:r.statusCode, body:r.body }));
`;
    const probePath = path.join(BACKEND, `.__envelope_prod_probe_${process.pid}.ts`);
    try {
      fs.writeFileSync(probePath, probe);
      const res = spawnSync(process.execPath, [TSX_CLI, probePath], {
        cwd: BACKEND, encoding: 'utf8', timeout: 60000,
        env: { ...process.env, NODE_ENV: 'production' },
      });
      if (res.status !== 0) {
        errors.push(`[prod-suppress] probe failed to run: ${(res.stderr || '').split(/\r?\n/).slice(-4).join(' ')}`);
      } else {
        const out = JSON.parse(res.stdout.trim().split(/\r?\n/).pop());
        const s = JSON.stringify(out.body || {});
        if (out.status !== 500) errors.push(`[prod-suppress] expected 500, got ${out.status}.`);
        if (out.body?.success !== false || out.body?.error?.code !== 'INTERNAL') errors.push(`[prod-suppress] not a generic INTERNAL envelope → ${s.slice(0, 140)}.`);
        if (/SUPER_SECRET_INTERNAL_DETAIL|stack|\.ts:|debug/i.test(s)) errors.push(`[prod-suppress] LEAKED internal detail/stack in prod body → ${s.slice(0, 160)}.`);
      }
    } catch (e) {
      errors.push(`[prod-suppress] probe error: ${e.message}`);
    } finally {
      try { fs.unlinkSync(probePath); } catch { /* ignore */ }
    }
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: error/health/envelope backbone did not hold\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: throwing→500 envelope (sync+async, no hang), 404 envelope, /health + /health/ready (up→200 / down→503), signup success envelope + emailDelivered surfaced (R-32), prod stack-suppression (Session 1 DoD).');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ FAIL: verifier crashed:', err?.stack || err?.message || String(err));
    process.exit(1);
  });

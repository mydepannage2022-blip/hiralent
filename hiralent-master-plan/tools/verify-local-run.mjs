#!/usr/bin/env node
/**
 * verify-local-run.mjs — Wave 0 / Session 7 (Local Run Baseline, Phase 0.8)
 *
 * Purpose: prove the backend actually BOOTS and serves a real authenticated
 * request end-to-end — not just that it type-checks or module-loads.
 *
 * What it does (self-contained):
 *   1. Preconditions: Postgres reachable on 127.0.0.1:5432, backend deps + a
 *      generated Prisma client present, and the test port free.
 *   2. Spawns the backend (`node tsx/cli.mjs src/server.ts`) on PORT=5099 with
 *      FORCE_SKIP_MONGO=1 + ENABLE_DEV_MINT=1 (dev flags; no Mongo/SMTP needed).
 *   3. Polls GET /health until 200 { db: "up" }  → boot + DB reachable.
 *   4. POST /api/v1/auth/signup (role candidate) → asserts 201 + a JWT token.
 *      (login is intentionally NOT used for E2E: it is 2FA-gated and never
 *      returns a usable session token — signup issues the real 7-day JWT.)
 *   5. GET /api/v1/auth/me with that token → asserts 200 and the echoed email.
 *   6. GET /api/v1/auth/me with NO token → asserts 401 (the guard truly guards).
 *   7. Tears the backend down (Windows-safe process-tree kill).
 *
 * Exit 0 => app boots + signup→token→/me(200) + anon→401 all hold (Phase-0.8 DoD).
 * Exit 1 => a precondition or assertion failed (prints why + captured server log).
 *
 * Deterministic-ish: a unique signup email per run (timestamp) — the assertions
 * are on the HTTP responses, not on row counts, so re-runs never collide. Node
 * built-ins only. Windows-safe.
 *
 * Usage:  node hiralent-master-plan/tools/verify-local-run.mjs
 * Prereq: `docker compose up -d postgres redis minio` (or native Postgres) and
 *         `cd backend && pnpm install && pnpm db:migrate` done once.
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
const PORT = 5099; // off the default 5000 so a running `pnpm dev` never collides
const BASE = `http://127.0.0.1:${PORT}`;

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolve TCP connectivity to host:port within `ms`. */
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

/** Kill a process and its children — Windows uses taskkill /T, POSIX uses SIGKILL. */
function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
  }
}

async function main() {
  // --- 1. Preconditions -----------------------------------------------------
  if (!fs.existsSync(TSX_CLI)) {
    errors.push(`tsx not found at backend/node_modules/tsx/dist/cli.mjs — run \`pnpm install\` in backend/ first.`);
  }
  // @prisma/client package must be installed. If `prisma generate` was never run,
  // the client throws at boot with a clear message — surfaced via the log tail below.
  if (!fs.existsSync(path.join(BACKEND, 'node_modules', '@prisma', 'client', 'default.js'))) {
    errors.push(`@prisma/client not installed — run \`pnpm install\` (then \`pnpm exec prisma generate\`) in backend/.`);
  }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) {
    errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it (\`docker compose up -d postgres\` or native) and run \`pnpm db:migrate\`.`);
  }
  if (await tcpReachable('127.0.0.1', PORT, 600)) {
    errors.push(`Test port ${PORT} is already in use — stop whatever is bound to it and retry.`);
  }
  if (errors.length) return; // don't spawn if the environment isn't ready

  // --- 2. Spawn the backend -------------------------------------------------
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(PORT),
    // Point SMTP at a guaranteed-refused address so signup's verification email
    // fails FAST (instant ECONNREFUSED) instead of hanging on a real/slow SMTP.
    // sendEmail() swallows the failure, so signup still returns 201 — this keeps
    // the test deterministic and independent of mail-server latency. (dotenv does
    // not override vars already set here, so backend/.env SMTP is intentionally shadowed.)
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'noreply@local.test',
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND,
    env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false;
  child.on('exit', (code) => { if (code !== null) exitedEarly = true; });

  try {
    // --- 3. Wait for readiness (GET /health = 200) --------------------------
    const deadline = Date.now() + 45000;
    let ready = false;
    while (Date.now() < deadline) {
      if (exitedEarly) { errors.push('backend process exited before it became ready.'); break; }
      try {
        const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
        if (r.status === 200) {
          const body = await r.json().catch(() => ({}));
          if (body?.db === 'up') { ready = true; break; }
        }
      } catch { /* not up yet */ }
      await sleep(600);
    }
    if (!ready && !errors.length) {
      errors.push('backend did not report GET /health -> 200 {db:"up"} within 45s.');
    }

    if (ready) {
      // --- 4. Signup (candidate) -> 201 + token -----------------------------
      const email = `e2e+${Date.now()}@local.test`;
      let token = null;
      try {
        const res = await fetch(`${BASE}/api/v1/auth/signup`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password: 'secret123', full_name: 'E2E Local Run', role: 'candidate' }),
          // Generous: signup awaits a verification-email send that fast-fails then
          // retries with ~2s+4s backoff before giving up (~6s) — still well under this.
          signal: AbortSignal.timeout(20000),
        });
        const body = await res.json().catch(() => ({}));
        token = body?.token || null;
        if (res.status !== 201) errors.push(`signup expected 201, got ${res.status} (${body?.message || body?.error || 'no message'}).`);
        if (!token) errors.push('signup did not return a token.');
      } catch (e) {
        errors.push(`signup request failed: ${e.message}`);
      }

      // --- 5. Authenticated /me -> 200 + matching email ---------------------
      if (token) {
        try {
          const res = await fetch(`${BASE}/api/v1/auth/me`, {
            headers: { authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
          });
          const body = await res.json().catch(() => ({}));
          if (res.status !== 200) errors.push(`GET /me (authed) expected 200, got ${res.status}.`);
          if (body?.user?.email !== email) errors.push(`GET /me returned email "${body?.user?.email}", expected "${email}".`);
        } catch (e) {
          errors.push(`authed /me request failed: ${e.message}`);
        }
      }

      // --- 6. Anonymous /me -> 401 -----------------------------------------
      try {
        const res = await fetch(`${BASE}/api/v1/auth/me`, { signal: AbortSignal.timeout(10000) });
        if (res.status !== 401) errors.push(`GET /me (anon) expected 401, got ${res.status} — the auth guard is not guarding.`);
      } catch (e) {
        errors.push(`anon /me request failed: ${e.message}`);
      }
    }
  } finally {
    // --- 7. Teardown --------------------------------------------------------
    killTree(child.pid);
  }

  // Attach a slice of server output when something went wrong — makes failures diagnosable.
  if (errors.length && log.trim()) {
    const tail = log.split(/\r?\n/).filter(Boolean).slice(-12).join('\n    ');
    errors.push(`--- backend log tail ---\n    ${tail}`);
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: local run baseline did not hold\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: backend boots, GET /health=200{db:up}, signup→token→/me(200), anon /me→401 (Phase 0.8 local-run baseline).');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ FAIL: verifier crashed:', err?.stack || err?.message || String(err));
    process.exit(1);
  });

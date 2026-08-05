#!/usr/bin/env node
/**
 * verify-transport-security.mjs — Wave 1 / Phase 1.5 (Transport, headers, CORS, rate limiting; R-28)
 *
 * Proves — against a REAL booted backend + real Postgres — that the edge is hardened.
 * Not "it type-checks": HTTP responses/headers are asserted.
 *
 * Runtime DoD cases:
 *   1. Headers   GET /health carries helmet's HSTS, CSP, X-Content-Type-Options=nosniff,
 *                X-Frame-Options=DENY, and Cross-Origin-Resource-Policy=cross-origin
 *                (the last is required so the signed-file CV route / SSE keep working
 *                cross-origin).
 *   2. CORS      A disallowed Origin is NOT reflected in access-control-allow-origin;
 *                an allowlisted Origin IS reflected.
 *   3. Body      A JSON POST larger than JSON_BODY_LIMIT -> 413.
 *   4. Rate      Past the (tiny, test-injected) auth limit, requests -> 429.
 *   5. Shared    (INFRA, Redis only) Two backend instances sharing one Redis + key
 *                prefix enforce ONE budget: after instance A spends it, instance B's
 *                next request -> 429. This is the discriminator vs a per-process store.
 *
 * Static regression guards (run even without infra): the hardening must stay wired.
 *
 * Exit 0 => every applicable case holds. Exit 1 => a precondition/assertion failed.
 * Redis unreachable => case 5 is skipped (logged), not failed.
 *
 * Node built-ins only. Windows-safe. INFRA verifier (boots the backend; needs Postgres).
 * Usage:  node hiralent-master-plan/tools/verify-transport-security.mjs
 * Prereq: native/docker Postgres on 5432 + `cd backend && pnpm install`. Redis optional.
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
const AI_SERVICE = path.join(ROOT, 'ai-service');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT_A = 5093; // distinct from other verifiers (5096/5097/5098/5099)
const PORT_B = 5092;
const BASE_A = `http://127.0.0.1:${PORT_A}`;
const BASE_B = `http://127.0.0.1:${PORT_B}`;

// Where Redis would be (for the shared-store discriminator). Parsed from REDIS_URL.
function redisEndpoint() {
  const raw = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    const u = new URL(raw);
    return { host: u.hostname || '127.0.0.1', port: Number(u.port || 6379), url: raw };
  } catch {
    return { host: '127.0.0.1', port: 6379, url: 'redis://127.0.0.1:6379' };
  }
}

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => { if (!cond) errors.push(msg); else console.log('  ok:', msg); };

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

/** Cheap source-level regression guards — the hardening must stay wired. */
function runStaticChecks() {
  const readB = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };
  const readAi = (p) => { try { return fs.readFileSync(path.join(AI_SERVICE, p), 'utf8'); } catch { return ''; } };

  const app = readB('src/app.ts');
  ok(/import\s+helmet\s+from\s+['"]helmet['"]/.test(app), '[static] app.ts no longer imports helmet.');
  ok(/app\.use\(\s*\n?\s*helmet\(/.test(app), '[static] app.ts no longer mounts helmet().');
  ok(/crossOriginResourcePolicy:\s*\{\s*policy:\s*['"]cross-origin['"]/.test(app),
    '[static] app.ts helmet must set CORP cross-origin (else the signed-file CV route / SSE break).');
  ok(/CORS_ALLOWED_ORIGINS/.test(app), '[static] app.ts CORS is no longer env-driven (CORS_ALLOWED_ORIGINS).');
  ok(/express\.json\(\{\s*limit:/.test(app), '[static] app.ts express.json() has no size limit (unbounded body).');
  ok(/trust proxy/.test(app), "[static] app.ts no longer sets 'trust proxy' (rate-limit key would be the proxy IP).");
  ok(/globalLimiter/.test(app) && /authLimiter/.test(app), '[static] app.ts no longer wires the rate limiters.');

  const rl = readB('src/middlewares/rateLimit.ts');
  ok(/rate-limit-redis/.test(rl) && /RedisStore/.test(rl), '[static] rateLimit.ts no longer uses a Redis-backed store.');
  ok(/REDIS_URL/.test(rl) && /MemoryStore|in-memory|return undefined/.test(rl.replace(/\n/g, ' ')),
    '[static] rateLimit.ts must degrade to an in-memory store when REDIS_URL is unset (no boot crash).');
  ok(/export const globalLimiter/.test(rl) && /export const authLimiter/.test(rl) &&
     /export const ocrLimiter/.test(rl) && /export const submissionLimiter/.test(rl) && /export const aiLimiter/.test(rl),
    '[static] rateLimit.ts is missing one of the named limiters.');

  const aiMain = readAi('app/main.py');
  ok(/allow_origins\s*=\s*_?cors_?settings?\.CORS_ALLOW_ORIGINS|allow_origins\s*=\s*settings\.CORS_ALLOW_ORIGINS/.test(aiMain),
    '[static] ai-service main.py CORS is no longer env-driven (settings.CORS_ALLOW_ORIGINS).');
  ok(!/allow_origins\s*=\s*\[\s*["']\*["']\s*\]/.test(aiMain),
    '[static] ai-service main.py still uses allow_origins=["*"] (wildcard with credentials).');
}

/** Boot a backend instance; resolve when GET /health reports db=up, else reject. */
function bootBackend(port, extraEnv, base) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(port),
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
    // Edge knobs the assertions rely on:
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    JSON_BODY_LIMIT: '200b',
    RATE_LIMIT_GLOBAL_MAX: '1000',        // high, so /health readiness polling isn't throttled
    RATE_LIMIT_GLOBAL_WINDOW_MS: '60000',
    RATE_LIMIT_AUTH_MAX: '3',             // tiny, so the 429 case triggers fast
    RATE_LIMIT_AUTH_WINDOW_MS: '60000',
    ...extraEnv,
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false;
  child.on('exit', () => { exitedEarly = true; });

  return new Promise(async (resolve, reject) => {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (exitedEarly) return reject(new Error(`backend (:${port}) exited before ready.\n${log.slice(-800)}`));
      try {
        const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
        if (r.status === 200 && (await r.json().catch(() => ({})))?.db === 'up') return resolve(child);
      } catch { /* not up */ }
      await sleep(600);
    }
    reject(new Error(`backend (:${port}) did not become ready within 45s.\n${log.slice(-800)}`));
  });
}

const jfetch = (base, pathname, { method = 'GET', headers = {}, body } = {}) =>
  fetch(`${base}${pathname}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body !== undefined ? body : undefined,
    signal: AbortSignal.timeout(15000),
  });

async function main() {
  runStaticChecks();

  if (!fs.existsSync(TSX_CLI)) errors.push('tsx not found — run `pnpm install` in backend/.');
  if (!(await tcpReachable(PG_HOST, PG_PORT))) errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`);
  for (const p of [PORT_A, PORT_B]) {
    if (await tcpReachable('127.0.0.1', p, 600)) errors.push(`Test port ${p} already in use.`);
  }
  if (errors.length) return;

  let child = null;
  try {
    // --- Single instance: force the in-memory limiter store for determinism.
    // (REDIS_URL is left intact so the app's queue modules still import cleanly.) ---
    child = await bootBackend(PORT_A, { RATE_LIMIT_FORCE_MEMORY: '1' }, BASE_A);

    // Case 1: security headers on /health
    {
      const r = await jfetch(BASE_A, '/health');
      const h = r.headers;
      ok(!!h.get('strict-transport-security'), '[1] HSTS header present.');
      ok(!!h.get('content-security-policy'), '[1] Content-Security-Policy header present.');
      ok(h.get('x-content-type-options') === 'nosniff', '[1] X-Content-Type-Options: nosniff.');
      ok((h.get('x-frame-options') || '').toUpperCase() === 'DENY', '[1] X-Frame-Options: DENY.');
      ok(h.get('cross-origin-resource-policy') === 'cross-origin',
        '[1] Cross-Origin-Resource-Policy: cross-origin (CV/SSE stay reachable cross-origin).');
    }

    // Case 2: CORS allowlist
    {
      const evil = await jfetch(BASE_A, '/health', { headers: { Origin: 'https://evil.example' } });
      ok(evil.headers.get('access-control-allow-origin') !== 'https://evil.example',
        '[2] disallowed Origin is NOT reflected in access-control-allow-origin.');
      const good = await jfetch(BASE_A, '/health', { headers: { Origin: 'http://localhost:3000' } });
      ok(good.headers.get('access-control-allow-origin') === 'http://localhost:3000',
        '[2] allowlisted Origin IS reflected.');
    }

    // Case 3: oversized body -> 413 (JSON_BODY_LIMIT=200b)
    {
      const big = JSON.stringify({ blob: 'x'.repeat(600) });
      const r = await jfetch(BASE_A, '/api/v1/auth/login', { method: 'POST', body: big });
      ok(r.status === 413, `[3] oversized JSON body should be 413, got ${r.status}.`);
    }

    // Case 4: auth limiter -> 429 past the cap (max=3)
    {
      const small = JSON.stringify({ email: 'x@y.z', password: 'zzzzzz' });
      let got429 = false;
      for (let i = 0; i < 8; i++) {
        const r = await jfetch(BASE_A, '/api/v1/auth/login', { method: 'POST', body: small });
        if (r.status === 429) { got429 = true; break; }
      }
      ok(got429, '[4] auth limiter returns 429 once the per-window cap is exceeded.');
    }

    killTree(child.pid); child = null;
    await sleep(500);

    // --- Case 5 (INFRA/Redis): shared store across two instances -----------
    const redis = redisEndpoint();
    const redisUp = await tcpReachable(redis.host, redis.port, 1200);
    if (!redisUp) {
      console.log(`  skip: [5] shared-store test — Redis not reachable at ${redis.host}:${redis.port} (single-instance cases still cover the mechanism).`);
    } else {
      // Unique prefix so prior runs' counters can't poison this window.
      const runPrefix = `vts:${Date.now()}:`;
      const shared = { REDIS_URL: redis.url, RATE_LIMIT_PREFIX: runPrefix, RATE_LIMIT_AUTH_MAX: '3', RATE_LIMIT_AUTH_WINDOW_MS: '60000' };
      let a = null, b = null;
      try {
        a = await bootBackend(PORT_A, shared, BASE_A);
        b = await bootBackend(PORT_B, shared, BASE_B);
        const small = JSON.stringify({ email: 'x@y.z', password: 'zzzzzz' });

        // Spend the shared budget (3) on instance A.
        let aStatuses = [];
        for (let i = 0; i < 3; i++) {
          const r = await jfetch(BASE_A, '/api/v1/auth/login', { method: 'POST', body: small });
          aStatuses.push(r.status);
        }
        ok(!aStatuses.includes(429), `[5] instance A's first 3 requests should be within budget, got ${aStatuses.join(',')}.`);

        // Instance B's next request must be refused — proving ONE shared budget.
        const bResp = await jfetch(BASE_B, '/api/v1/auth/login', { method: 'POST', body: small });
        ok(bResp.status === 429,
          `[5] instance B should be 429 after instance A spent the shared budget (proves Redis-shared store), got ${bResp.status}.`);
      } finally {
        killTree(a && a.pid); killTree(b && b.pid);
      }
    }
  } catch (e) {
    errors.push(String((e && e.message) || e));
  } finally {
    killTree(child && child.pid);
  }
}

await main();

console.log('\n' + '─'.repeat(60));
if (errors.length) {
  console.log(`❌ verify-transport-security FAIL (${errors.length}):`);
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log('✅ verify-transport-security PASS — headers, CORS, body-limit, rate-limit all enforced.');
process.exit(0);

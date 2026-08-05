#!/usr/bin/env node
/**
 * verify-auth-session.mjs — Wave 1 / Phase 1.2 (AuthN & Session Hardening, R-29/R-28)
 *
 * Proves — against a REAL booted backend + real Postgres — that token/session
 * enforcement actually works. Not "it type-checks": the HTTP responses are asserted.
 *
 * DoD cases:
 *   1. Forged token (signed with the WRONG secret)            -> GET /me = 401
 *   2. Real-secret token WITHOUT session_id                    -> GET /me = 401  (no 'bypass')
 *   3. Real login issues a working access + refresh pair:
 *        3a. signup  -> {token, refreshToken}, /me = 200
 *        3b. full MFA login (setup -> speakeasy TOTP -> verify)-> {token, refreshToken}, /me = 200
 *   4. Refresh rotation: /auth/refresh -> new access+refresh (new /me=200);
 *        replaying the OLD refresh token -> 401
 *   5. Logout revocation: /auth/logout -> the just-used access token -> /me = 401
 *   6. Temp-password entropy: generateTempPassword() is unpredictable + complex
 *   7. Device hash is sha256 (64 hex), not MD5 (32 hex)
 *
 * Exit 0 => every case holds. Exit 1 => a precondition/assertion failed (prints why).
 *
 * Node built-ins only (+ backend's own jsonwebtoken/speakeasy via createRequire).
 * Windows-safe. Unique emails per run so re-runs never collide.
 *
 * Usage:  node hiralent-master-plan/tools/verify-auth-session.mjs
 * Prereq: native/docker Postgres on 5432 + `cd backend && pnpm install && pnpm db:migrate`.
 */

import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5098; // distinct from verify-local-run (5099) so both can run
const BASE = `http://127.0.0.1:${PORT}`;

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

/** Read JWT_SECRET straight from backend/.env (the value the spawned server signs with). */
function readJwtSecretFromEnv() {
  try {
    const raw = fs.readFileSync(path.join(BACKEND, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*JWT_SECRET\s*=\s*(.*)$/);
      if (m) {
        let v = m[1].trim();
        // strip surrounding quotes + trailing inline comment on unquoted values
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        else v = v.replace(/\s+#.*$/, '').trim();
        if (v) return v;
      }
    }
  } catch { /* ignore */ }
  return null;
}

const jget = async (token) =>
  fetch(`${BASE}/api/v1/auth/me`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(10000),
  });

const jpost = async (pathname, body, token) =>
  fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(20000),
  });

/** Cheap source-level regression guards — the removed anti-patterns must stay removed. */
function runStaticChecks() {
  const read = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };

  const checkAuth = read('src/middlewares/checkAuth.middleware.ts');
  ok(!/session_id\s*\|\|\s*['"]bypass['"]/.test(checkAuth), "[static] checkAuth still has the session_id || 'bypass' fallback.");
  ok(/if\s*\(\s*!payload\.session_id\s*\)/.test(checkAuth), '[static] checkAuth no longer rejects tokens without a session_id.');
  ok(/isTokenBlacklisted\(/.test(checkAuth) && !/isTokenBlacklisted\?\./.test(checkAuth), '[static] blacklist check is not mandatory (optional ?. present).');

  const jwtUtil = read('src/utils/jwt.util.ts');
  ok(!/createHash\(\s*['"]md5['"]\s*\)/.test(jwtUtil), '[static] jwt.util still uses MD5 (createHash("md5")).');

  const adminAgency = read('src/controller/superadmin/admin.agency.controller.ts');
  ok(/generateTempPassword\(/.test(adminAgency), '[static] admin.agency no longer uses generateTempPassword().');
  ok(!/Math\.random\(\)\.toString\(36\)/.test(adminAgency), '[static] admin.agency still uses Math.random() for the temp password.');

  // Candidate application routes must use the hardened session-aware guard, not the
  // legacy bare-jwt authMiddleware (which bypasses blacklist + active-session checks,
  // so logout would not revoke them). Found in the Session-2 adversarial audit.
  const jobAppRoutes = read('src/routes/candidate/jobApplications.routes.ts');
  ok(/checkAuth/.test(jobAppRoutes) && !/authMiddleware/.test(jobAppRoutes),
    '[static] jobApplications.routes still uses the legacy authMiddleware (revocation bypass).');

  // The WebSocket handshake must enforce the same guarantees as checkAuth (blacklist
  // + active-session), not a bare jwt.verify. Found in the Session-2 audit (F3).
  const socket = read('src/realtime/socket.messaging.ts');
  ok(!/jwt\.verify\s*\(/.test(socket), '[static] socket handshake still uses a bare jwt.verify (no blacklist/session check).');
  ok(/isTokenBlacklisted\(/.test(socket) && /validateSession\(/.test(socket),
    '[static] socket handshake does not enforce blacklist + active-session checks.');
}

async function main() {
  // --- Static regression guards (run regardless of infra) -------------------
  runStaticChecks();

  // --- Preconditions --------------------------------------------------------
  if (!fs.existsSync(TSX_CLI)) errors.push('tsx not found — run `pnpm install` in backend/.');
  if (!fs.existsSync(path.join(BACKEND, 'node_modules', '@prisma', 'client', 'default.js')))
    errors.push('@prisma/client not installed — run `pnpm install` + `prisma generate` in backend/.');
  if (!(await tcpReachable(PG_HOST, PG_PORT))) errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`);
  if (await tcpReachable('127.0.0.1', PORT, 600)) errors.push(`Test port ${PORT} already in use.`);
  if (errors.length) return;

  // --- Case 6 & 7: pure-function probes (real utils, via tsx) ----------------
  runUnitProbes();

  // --- Boot backend ---------------------------------------------------------
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(PORT),
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false;
  child.on('exit', (code) => { if (code !== null) exitedEarly = true; });

  try {
    // Wait for readiness
    const deadline = Date.now() + 45000;
    let ready = false;
    while (Date.now() < deadline) {
      if (exitedEarly) { errors.push('backend exited before ready.'); break; }
      try {
        const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
        if (r.status === 200 && (await r.json().catch(() => ({})))?.db === 'up') { ready = true; break; }
      } catch { /* not up */ }
      await sleep(600);
    }
    if (!ready) { if (!errors.length) errors.push('backend did not become ready (GET /health) within 45s.'); return; }

    const jwt = backendRequire('jsonwebtoken');
    const jwtSecret = readJwtSecretFromEnv();

    // --- Case 3a: signup issues access + refresh, /me works -----------------
    const email = `authtest+${Date.now()}@local.test`;
    const password = 'secret123';
    let tokenA = null, refreshA = null;
    {
      const res = await jpost('/api/v1/auth/signup', { email, password, full_name: 'Auth Session', role: 'candidate' });
      const body = await res.json().catch(() => ({}));
      // Session 1: auth responses use the standard envelope → fields under `data`.
      tokenA = body?.data?.token || null;
      refreshA = body?.data?.refreshToken || null;
      ok(res.status === 201, `[3a] signup expected 201, got ${res.status}.`);
      ok(!!tokenA, '[3a] signup did not return an access token.');
      ok(!!refreshA, '[3a] signup did not return a refreshToken.');
      if (tokenA) ok((await jget(tokenA)).status === 200, '[3a] /me with fresh signup token expected 200.');
    }

    // --- Case 1: forged token (wrong secret) -> 401 -------------------------
    {
      const forged = jwt.sign({ user_id: 'x', role: 'candidate', session_id: 'y' }, 'totally-wrong-secret', { expiresIn: '15m' });
      ok((await jget(forged)).status === 401, '[1] forged token (wrong secret) should be 401.');
    }

    // --- Case 2: real-secret token WITHOUT session_id -> 401 ----------------
    if (jwtSecret) {
      const noSession = jwt.sign({ user_id: 'x', role: 'candidate' }, jwtSecret, { expiresIn: '15m' });
      ok((await jget(noSession)).status === 401, "[2] real-secret token without session_id should be 401 (no 'bypass').");
    } else {
      errors.push('[2] could not read JWT_SECRET from backend/.env — cannot prove the no-session-id case.');
    }

    // --- Case 4: refresh rotation -------------------------------------------
    let tokenB = null, refreshB = null;
    if (refreshA) {
      const res = await jpost('/api/v1/auth/refresh', { refreshToken: refreshA });
      const body = await res.json().catch(() => ({}));
      tokenB = body?.data?.token || null;
      refreshB = body?.data?.refreshToken || null;
      ok(res.status === 200, `[4] refresh expected 200, got ${res.status}.`);
      ok(!!tokenB && tokenB !== tokenA, '[4] refresh should return a NEW access token.');
      ok(!!refreshB && refreshB !== refreshA, '[4] refresh should return a NEW (rotated) refresh token.');
      if (tokenB) ok((await jget(tokenB)).status === 200, '[4] /me with refreshed token expected 200.');
      // Replaying the OLD refresh token must now fail (rotation).
      const replay = await jpost('/api/v1/auth/refresh', { refreshToken: refreshA });
      ok(replay.status === 401, `[4] replaying the old refresh token should be 401, got ${replay.status}.`);
    }

    // --- Case 5: logout revokes the access token ----------------------------
    if (tokenB) {
      const res = await jpost('/api/v1/auth/logout', {}, tokenB);
      ok(res.status === 200, `[5] logout expected 200, got ${res.status}.`);
      ok((await jget(tokenB)).status === 401, '[5] access token should be 401 after logout.');
      // The original token from the same session is also dead (session inactive).
      if (tokenA) ok((await jget(tokenA)).status === 401, '[5] original session token should also be 401 after logout.');

      // Session-2 audit (F1): the candidate-applications routes were on the legacy
      // bare-jwt guard (no blacklist / no active-session check). After the checkAuth
      // swap, revocation must reach them too — a revoked token must now be 401 there,
      // not slip through to the controller.
      const appsRevoked = await fetch(`${BASE}/api/v1/candidate/applications`, {
        headers: { authorization: `Bearer ${tokenB}` },
        signal: AbortSignal.timeout(10000),
      });
      ok(appsRevoked.status === 401,
        `[5] candidate /applications should be 401 after logout (was on legacy authMiddleware), got ${appsRevoked.status}.`);
    }

    // --- Case 3b: full MFA login path issues a working pair -----------------
    await runMfaLoginProbe(email, password);
  } finally {
    killTree(child.pid);
  }

  if (errors.length && log.trim()) {
    const tail = log.split(/\r?\n/).filter(Boolean).slice(-14).join('\n    ');
    errors.push(`--- backend log tail ---\n    ${tail}`);
  }
}

/** Case 6 & 7 — run the REAL utils through tsx and assert their output. */
function runUnitProbes() {
  const probePath = path.join(os.tmpdir(), `hiralent-auth-probe-${process.pid}.ts`);
  const probe = `
import { generateTempPassword } from ${JSON.stringify(path.join(BACKEND, 'src/utils/tempPassword.ts'))};
import { createDeviceHash } from ${JSON.stringify(path.join(BACKEND, 'src/utils/jwt.util.ts'))};
const pwds = Array.from({ length: 300 }, () => generateTempPassword());
const dh = createDeviceHash('Mozilla/5.0 test', '203.0.113.7');
process.stdout.write(JSON.stringify({ pwds, dh }));
`;
  try {
    fs.writeFileSync(probePath, probe);
    const r = spawnSync(process.execPath, [TSX_CLI, probePath], { cwd: BACKEND, encoding: 'utf8', timeout: 60000 });
    if (r.status !== 0) { errors.push(`[6/7] util probe failed to run: ${(r.stderr || '').split(/\r?\n/).slice(-4).join(' ')}`); return; }
    const out = JSON.parse(r.stdout.trim().split(/\r?\n/).pop());

    // 6 — entropy/complexity/uniqueness
    const pwds = out.pwds;
    ok(new Set(pwds).size === pwds.length, '[6] temp passwords are not all unique (predictable RNG?).');
    ok(pwds.every((p) => p.length >= 12), '[6] temp password shorter than 12 chars.');
    ok(pwds.every((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)),
      '[6] temp password missing a required character class.');
    ok(!pwds.some((p) => p.endsWith('A1!')), '[6] temp password still uses the old fixed "A1!" suffix.');

    // 7 — device hash is sha256
    ok(/^[0-9a-f]{64}$/.test(out.dh), `[7] device hash is not sha256 (64 hex): got length ${out.dh?.length}.`);
    ok(out.dh.length !== 32, '[7] device hash looks like MD5 (32 hex).');
  } catch (e) {
    errors.push(`[6/7] util probe error: ${e.message}`);
  } finally {
    try { fs.unlinkSync(probePath); } catch { /* ignore */ }
  }
}

/** Case 3b — drive the real 2FA login flow with a speakeasy TOTP. */
async function runMfaLoginProbe(email, password) {
  let speakeasy;
  try { speakeasy = backendRequire('speakeasy'); }
  catch { errors.push('[3b] speakeasy not resolvable from backend — cannot exercise MFA login.'); return; }

  // login -> tempToken (user has never set up 2FA => requiresMFASetup)
  const loginRes = await jpost('/api/v1/auth/login', { email, password });
  const loginBody = await loginRes.json().catch(() => ({}));
  const tempToken = loginBody?.data?.tempToken;
  ok(loginRes.status === 200 && !!tempToken, `[3b] login should return a tempToken, got ${loginRes.status}.`);
  if (!tempToken) return;

  // setup-with-token -> base32 secret
  const setupRes = await jpost('/api/v1/auth/2fa/setup-with-token', { tempToken });
  const setupBody = await setupRes.json().catch(() => ({}));
  const secret = setupBody?.data?.manualCode;
  ok(setupRes.status === 200 && !!secret, `[3b] 2fa/setup-with-token should return manualCode, got ${setupRes.status}.`);
  if (!secret) return;

  // verify-login with a valid TOTP -> real token + refreshToken
  const code = speakeasy.totp({ secret, encoding: 'base32' });
  const verifyRes = await jpost('/api/v1/auth/2fa/verify-login', { tempToken, mfaToken: code });
  const verifyBody = await verifyRes.json().catch(() => ({}));
  ok(verifyRes.status === 200, `[3b] 2fa/verify-login expected 200, got ${verifyRes.status} (${verifyBody?.error?.message || verifyBody?.message || ''}).`);
  ok(!!verifyBody?.data?.token, '[3b] MFA login did not return an access token.');
  ok(!!verifyBody?.data?.refreshToken, '[3b] MFA login did not return a refreshToken.');
  if (verifyBody?.data?.token) ok((await jget(verifyBody.data.token)).status === 200, '[3b] /me with MFA-login token expected 200.');
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: auth/session hardening did not hold\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: forged→401, no-session→401, login issues access+refresh, refresh rotates (old→401), logout revokes, temp-pass entropy + sha256 device-hash (Phase 1.2 DoD).');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ FAIL: verifier crashed:', err?.stack || err?.message || String(err));
    process.exit(1);
  });

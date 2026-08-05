#!/usr/bin/env node
/**
 * verify-session-realtime.mjs — Wave 3 / Phase 3.5 (Session-Management Sign-Out R-25 + Realtime Contract)
 *
 * Proves — against a REAL booted backend + real Postgres + a live Socket.IO server —
 * that the two capabilities this session fixed actually work end-to-end. Not "it
 * type-checks": HTTP responses and socket round-trips are asserted.
 *
 * DoD cases:
 *   1. R-25 sign-out-other-devices (CRITICAL — the mount fix):
 *        - signup           -> tokenA (session #1), /me = 200
 *        - full MFA login   -> tokenC (session #2), /me = 200, tokenA still 200 (both active)
 *        - DELETE /api/v1/auth/sessions/others/terminate (tokenC) -> 200, terminated_count >= 1
 *        - after: /me(tokenA) = 401 (revoked), /me(tokenC) = 200 (current kept)
 *      NEGATIVE CONTROL: with the pre-fix mount (authRoutes at /auth/sessions) the
 *      terminate call 404s -> this test goes RED. That is what makes it non-vacuous.
 *   2. Realtime round-trip between two clients sharing a conversation:
 *        - client1 add_reaction        -> client2 receives reaction_added
 *        - client2 mark_messages_read  -> client1 receives message_read  (read-receipts)
 *        - client1 delete_message      -> client2 receives message_deleted
 *
 * Exit 0 => every case holds. Exit 1 => a precondition/assertion failed (prints why).
 *
 * Node built-ins only (+ backend's jsonwebtoken/speakeasy and frontend's socket.io-client
 * via createRequire). Windows-safe. Unique emails per run so re-runs never collide.
 * ONE backend boot (a second boot is flaky under load — see memory).
 *
 * Usage:  node hiralent-master-plan/tools/verify-session-realtime.mjs
 * Prereq: native/docker Postgres on 5432 + `cd backend && pnpm install && pnpm db:migrate`
 *         + `cd frontend && pnpm install` (for socket.io-client).
 */

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5097; // distinct from verify-auth-session (5098) / verify-local-run (5099)
const BASE = `http://127.0.0.1:${PORT}`;

const backendRequire = createRequire(path.join(BACKEND, 'package.json'));
const frontendRequire = createRequire(path.join(FRONTEND, 'package.json'));

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

const H = (token) => (token ? { authorization: `Bearer ${token}` } : {});
const jget = async (pathname, token) =>
  fetch(`${BASE}${pathname}`, { headers: H(token), signal: AbortSignal.timeout(10000) });
const jpost = async (pathname, body, token) =>
  fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...H(token) },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(20000),
  });
const jdelete = async (pathname, token) =>
  fetch(`${BASE}${pathname}`, { method: 'DELETE', headers: H(token), signal: AbortSignal.timeout(15000) });

const me = (token) => jget('/api/v1/auth/me', token);

/** Source-level guard: the /auth/sessions mount must use the REAL session router. */
function runStaticChecks() {
  const read = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };
  const app = read('src/app.ts');
  // Must mount the REAL sessionRoutes at /api/v1/auth/sessions (any middleware in
  // between is fine; the point is it is NOT re-mounting authRoutes there).
  ok(/app\.use\(\s*['"]\/api\/v1\/auth\/sessions['"][^)]*\bsessionRoutes\b[^)]*\)/.test(app),
    "[static] app.ts does not mount sessionRoutes at /api/v1/auth/sessions (R-25 regression).");
  ok(/import\s+sessionRoutes\s+from\s+['"]\.\/routes\/auth\/session\.routes['"]/.test(app),
    '[static] app.ts is missing the sessionRoutes import.');

  const socket = read('src/realtime/socket.messaging.ts');
  ok(/io\.to\(`conversation_\$\{data\.conversation_id\}`\)\.emit\('message_read'/.test(socket),
    '[static] message_read is not scoped to the conversation room (read-receipt regression).');
}

let signupSeq = 0;
/** signup -> { token, user_id }. Auth responses use the standard envelope (fields under data). */
async function signup(role = 'candidate') {
  const email = `rt+${Date.now()}_${signupSeq++}@local.test`;
  const password = 'secret123';
  const res = await jpost('/api/v1/auth/signup', { email, password, full_name: 'RT User', role });
  const body = await res.json().catch(() => ({}));
  const token = body?.data?.token || null;
  const userId = body?.data?.user?.user_id || body?.data?.user?.id || null;
  ok(res.status === 201, `[setup] signup expected 201, got ${res.status}.`);
  ok(!!token, '[setup] signup did not return an access token.');
  ok(!!userId, '[setup] signup did not return a user_id.');
  return { email, password, token, userId };
}

/** Drive the real first-time 2FA login for an existing user -> a NEW session's access token. */
async function mfaLogin(email, password) {
  let speakeasy;
  try { speakeasy = backendRequire('speakeasy'); }
  catch { errors.push('[1] speakeasy not resolvable from backend — cannot mint a 2nd session.'); return null; }

  const loginRes = await jpost('/api/v1/auth/login', { email, password });
  const tempToken = (await loginRes.json().catch(() => ({})))?.data?.tempToken;
  ok(loginRes.status === 200 && !!tempToken, `[1] login should return a tempToken, got ${loginRes.status}.`);
  if (!tempToken) return null;

  const setupRes = await jpost('/api/v1/auth/2fa/setup-with-token', { tempToken });
  const secret = (await setupRes.json().catch(() => ({})))?.data?.manualCode;
  ok(setupRes.status === 200 && !!secret, `[1] 2fa/setup-with-token should return manualCode, got ${setupRes.status}.`);
  if (!secret) return null;

  const code = speakeasy.totp({ secret, encoding: 'base32' });
  const verifyRes = await jpost('/api/v1/auth/2fa/verify-login', { tempToken, mfaToken: code });
  const vb = await verifyRes.json().catch(() => ({}));
  ok(verifyRes.status === 200, `[1] 2fa/verify-login expected 200, got ${verifyRes.status}.`);
  return vb?.data?.token || null;
}

/** Connect a socket.io-client, resolve once connected (or reject on timeout). */
function connectSocket(io, token) {
  const socket = io(BASE, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: 8000,
    forceNew: true,
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('socket connect timeout')), 9000);
    socket.once('connect', () => { clearTimeout(t); resolve(socket); });
    socket.once('connect_error', (e) => { clearTimeout(t); reject(new Error(`connect_error: ${e?.message || e}`)); });
  });
}

function waitEvent(socket, event, ms = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for '${event}'`)), ms);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

async function main() {
  runStaticChecks();

  if (!fs.existsSync(TSX_CLI)) errors.push('tsx not found — run `pnpm install` in backend/.');
  try { frontendRequire.resolve('socket.io-client'); }
  catch { errors.push('socket.io-client not installed — run `pnpm install` in frontend/.'); }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`);
  if (await tcpReachable('127.0.0.1', PORT, 600)) errors.push(`Test port ${PORT} already in use.`);
  if (errors.length) return;

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    PORT: String(PORT),
    FRONTEND_URL: `http://127.0.0.1:${PORT}`,
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

  const openSockets = [];
  try {
    // Wait for readiness (health with db up).
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

    // ── Case 1: R-25 sign-out-other-devices ────────────────────────────────
    const u = await signup('candidate');
    if (u.token) {
      ok((await me(u.token)).status === 200, '[1] /me with signup token (session #1) expected 200.');

      const tokenC = await mfaLogin(u.email, u.password); // session #2
      if (tokenC) {
        ok((await me(tokenC)).status === 200, '[1] /me with MFA-login token (session #2) expected 200.');
        ok((await me(u.token)).status === 200, '[1] session #1 token should still be 200 before terminate.');

        const termRes = await jdelete('/api/v1/auth/sessions/others/terminate', tokenC);
        const termBody = await termRes.json().catch(() => ({}));
        ok(termRes.status === 200, `[1] terminate-others expected 200 (mount fix), got ${termRes.status}. (pre-fix mount => 404)`);
        ok((termBody?.terminated_count ?? 0) >= 1, '[1] terminate-others should report terminated_count >= 1.');

        ok((await me(u.token)).status === 401, '[1] session #1 token MUST be 401 after "sign out other devices".');
        ok((await me(tokenC)).status === 200, '[1] current session (#2) token should stay 200.');
      }
    }

    // ── Case 2: realtime round-trip between two clients ─────────────────────
    const io = frontendRequire('socket.io-client').io || frontendRequire('socket.io-client').default;
    const a = await signup('candidate');
    const b = await signup('candidate');
    if (a.token && b.token && a.userId && b.userId) {
      // Conversation (a -> b) with an initial message, then an explicit message we act on.
      const convRes = await jpost('/api/v1/messages/conversations',
        { participant_id: b.userId, initial_message: 'hi' }, a.token);
      const convId = (await convRes.json().catch(() => ({})))?.data?.conversation_id;
      ok(convRes.status === 201 && !!convId, `[2] create conversation expected 201 + id, got ${convRes.status}.`);

      let messageId = null;
      if (convId) {
        const msgRes = await jpost(`/api/v1/messages/conversations/${convId}/messages`,
          { content: 'hello', message_type: 'text' }, a.token);
        messageId = (await msgRes.json().catch(() => ({})))?.data?.message_id;
        ok(msgRes.status === 201 && !!messageId, `[2] send message expected 201 + message_id, got ${msgRes.status}.`);
      }

      if (convId && messageId) {
        try {
          const s1 = await connectSocket(io, a.token); openSockets.push(s1);
          const s2 = await connectSocket(io, b.token); openSockets.push(s2);
          s1.emit('join_conversation', convId);
          s2.emit('join_conversation', convId);
          await sleep(400); // let room joins settle

          // reaction: s1 -> s2
          const gotReaction = waitEvent(s2, 'reaction_added');
          s1.emit('add_reaction', { message_id: messageId, conversation_id: convId, emoji: '👍' });
          const r = await gotReaction.catch((e) => ({ __err: e.message }));
          ok(r && !r.__err && r.message_id === messageId,
            `[2] client2 did not receive reaction_added (${r?.__err || 'wrong payload'}).`);

          // read-receipt: s2 marks read -> s1 receives message_read
          const gotRead = waitEvent(s1, 'message_read');
          s2.emit('mark_messages_read', { message_ids: [messageId], conversation_id: convId });
          const rd = await gotRead.catch((e) => ({ __err: e.message }));
          ok(rd && !rd.__err && rd.message_id === messageId,
            `[2] client1 did not receive message_read (${rd?.__err || 'wrong payload'}).`);

          // delete: s1 -> s2
          const gotDelete = waitEvent(s2, 'message_deleted');
          s1.emit('delete_message', { message_id: messageId, conversation_id: convId });
          const dl = await gotDelete.catch((e) => ({ __err: e.message }));
          ok(dl && !dl.__err && dl.message_id === messageId,
            `[2] client2 did not receive message_deleted (${dl?.__err || 'wrong payload'}).`);
        } catch (e) {
          errors.push(`[2] socket round-trip failed: ${e.message}`);
        }
      }
    }
  } finally {
    for (const s of openSockets) { try { s.close(); } catch { /* ignore */ } }
    killTree(child.pid);
  }

  if (errors.length && log.trim()) {
    const tail = log.split(/\r?\n/).filter(Boolean).slice(-14).join('\n    ');
    errors.push(`--- backend log tail ---\n    ${tail}`);
  }
}

main()
  .then(() => {
    if (errors.length) {
      console.error('\n✗ FAIL: session-management / realtime contract did not hold\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: sign-out-other-devices revokes the other session (R-25); reaction/read-receipt/delete round-trip live between two clients (Phase 3.5 DoD).');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ FAIL: verifier crashed:', err?.stack || err?.message || String(err));
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * verify-authz-matrix.mjs — Wave 1 / Session 7 (Role × sensitive-endpoint authz matrix; Wave-1 exit gate)
 *
 * Proves — against a REAL booted backend + real Postgres — that authorization is enforced per ROLE,
 * not merely "is a token present". For each sensitive endpoint the three-way contract holds:
 *   no token       -> 401
 *   wrong role     -> 403   (a valid token whose role isn't allowed)
 *   correct role   -> 200/2xx
 *
 * The role model in this codebase is deliberately messy (`super_admin` vs `superadmin` vs `admin`,
 * plus a SEPARATE ADMIN-JWT path), so the matrix pins the exact principal each guard expects:
 *   - candidate / company_admin / agency_admin  -> real signup (session-backed access token).
 *       company_admin's token carries company_id = its own user_id (auth.service.ts:42).
 *   - superadmin                                 -> a self-signed ADMIN-JWT ({role:'superadmin',
 *       authenticated:true}) verified by requireSuperAdmin (adminAuth.middleware.ts). Pinned
 *       ADMIN_JWT_SECRET (dotenv never overrides an already-set env var) makes the token verify.
 *
 * Endpoints (guard in parens):
 *   1. GET  /api/questions                               (checkAuth + denyNonBankReaders)
 *   2. GET  /api/v1/admin/agencies/pending               (adminSecurityStack -> requireSuperAdmin)
 *   3. POST /api/v1/companies/:cid/insights/recompute    (requireCompanyMember; negatives only —
 *          the 202 path enqueues to Redis, which is out of scope here)
 *   4. GET  /api/v1/companies/:cid/insights              (requireCompanyMember; positive is prisma-only)
 *   5. POST /api/v1/verification/run/create COMPANY       (in-handler company ownership; doubles as IDOR)
 *   6. GET  /api/v1/auth/me                               (checkAuth baseline)
 *   7. PRIV-ESC reproduce->fixed: POST /api/v1/auth/signup {role:'admin'} -> rejected (400), so a
 *          public signup can no longer self-grant an admin-role token (R-44, fixed this session).
 *
 * Static regression guards (run even without infra): the closed holes must stay closed.
 *
 * Exit 0 => every cell holds. Exit 1 => a precondition/assertion failed (prints why + a matrix table).
 *
 * Node built-ins only (+ backend's own jsonwebtoken via createRequire). Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-authz-matrix.mjs
 * Prereq: native/docker Postgres on 5432 + `cd backend && pnpm install && pnpm db:migrate`.
 */

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5096; // distinct from default-deny(5097)/auth-session(5098)/local-run(5099)
const BASE = `http://127.0.0.1:${PORT}`;

// Pinned so the test's self-signed ADMIN-JWT verifies against the same value the server uses.
// dotenv.config() does NOT override an already-set process.env var, so these win over backend/.env.
const JWT_SECRET = 'authz-matrix-jwt-secret-0123456789abcdef0123456789';
const ADMIN_JWT_SECRET = 'authz-matrix-admin-secret-0123456789abcdef0123456789';

const backendRequire = createRequire(path.join(BACKEND, 'package.json'));

const errors = [];
const rows = []; // matrix rows for the summary table: {ep, principal, expected, got, pass}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

/** Assert an HTTP status and record it in the printable matrix. */
function cell(label, principal, got, expected) {
  const exp = Array.isArray(expected) ? expected : [expected];
  const pass = exp.includes(got);
  rows.push({ ep: label, principal, expected: exp.join('/'), got, pass });
  if (!pass) errors.push(`[matrix] ${label} as ${principal}: expected ${exp.join('/')}, got ${got}.`);
  return pass;
}

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

/**
 * fetch helper: token = user bearer (or admin bearer — same header, different secret).
 * Never throws: a timeout / connection error resolves to a synthetic { status: 0 } so a single
 * hanging endpoint becomes a recorded matrix mismatch (with its label) instead of aborting the run.
 */
const jfetch = async (pathname, { method = 'GET', token, body } = {}) => {
  try {
    return await fetch(`${BASE}${pathname}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12000),
    });
  } catch (e) {
    return { status: 0, _err: String(e && e.name || e), json: async () => ({}) };
  }
};

/** Cheap source-level regression guards — the closed holes must stay closed. */
function runStaticChecks() {
  const readB = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };

  // R-44: public signup can no longer self-assign the 'admin' role.
  const schema = readB('src/validation/auth.schema.ts');
  const enumMatch = schema.match(/role:\s*z\.enum\(\[([^\]]*)\]\)/);
  ok(!!enumMatch, '[static] auth.schema.ts: SignupSchema role z.enum(...) not found.');
  if (enumMatch) {
    ok(!/['"]admin['"]/.test(enumMatch[1]),
      "[static] auth.schema.ts: signup role enum still allows 'admin' (public signup priv-esc, R-44).");
    ok(/candidate/.test(enumMatch[1]) && /company_admin/.test(enumMatch[1]),
      '[static] auth.schema.ts: signup role enum unexpectedly missing candidate/company_admin.');
  }

  // requireCompanyMember must stay company-scoped (mirrors verify-default-deny-authz).
  const authz = readB('src/middlewares/authz.middleware.ts');
  ok(/user\.company_id/.test(authz),
    '[static] requireCompanyMember no longer reads user.company_id (legit members would be 403ed).');
  ok(!/\[\s*'admin'\s*,\s*'super_admin'\s*,\s*'company_admin'\s*\]/.test(authz),
    '[static] requireCompanyMember blanket-passes company_admin again (cross-tenant IDOR).');

  // The superadmin gate must keep verifying the ADMIN-JWT role + authenticated flag.
  const adminAuth = readB('src/middlewares/adminAuth.middleware.ts');
  ok(/role\s*!==\s*'superadmin'/.test(adminAuth) && /authenticated/.test(adminAuth),
    '[static] requireSuperAdmin no longer enforces role===superadmin + authenticated.');

  // Question bank read guard.
  const questions = readB('src/routes/questions/question.routes.ts');
  ok(/denyNonBankReaders/.test(questions),
    '[static] questions read routes no longer block candidates (answer-leak).');
}

async function signup(role) {
  const email = `authzmx+${Date.now()}_${Math.floor(Math.random() * 1e6)}@local.test`;
  const res = await jfetch('/api/v1/auth/signup', {
    method: 'POST',
    body: { email, password: 'secret123', full_name: 'Authz Matrix', role },
  });
  const b = await res.json().catch(() => ({}));
  // Session 1: auth responses use the standard envelope → token under `data`.
  return { status: res.status, token: b?.data?.token || null, email };
}

/**
 * Stand up a throwaway minimal SMTP mock that ACCEPTS every message on the first try.
 * Why not a dead port / instant-close sink: email.util.ts retries 3× with exponential backoff
 * (2s+4s) on failure, and a company_admin signup fires 3 emails — pointed at anything that fails,
 * the request burns >12s and times out. A mock that speaks just enough SMTP (220→EHLO→MAIL→RCPT→
 * DATA→250 queued) makes every send succeed immediately, so signup returns fast and deterministically.
 * Returns { port, close }.
 */
function startSmtpMock() {
  return new Promise((resolve) => {
    const server = net.createServer((sock) => {
      let inData = false;
      let buf = '';
      sock.write('220 mock ESMTP ready\r\n');
      sock.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        let idx;
        while ((idx = buf.indexOf('\r\n')) !== -1) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          if (inData) {
            if (line === '.') { inData = false; sock.write('250 2.0.0 Ok: queued\r\n'); }
            continue; // swallow message body lines
          }
          const cmd = line.slice(0, 4).toUpperCase();
          if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250 mock\r\n'); // no extensions -> no AUTH/STARTTLS
          else if (cmd === 'DATA') { sock.write('354 End data with <CR><LF>.<CR><LF>\r\n'); inData = true; }
          else if (cmd === 'QUIT') { sock.write('221 Bye\r\n'); sock.end(); }
          else sock.write('250 Ok\r\n'); // MAIL/RCPT/RSET/NOOP/etc.
        }
      });
      sock.on('error', () => { /* client reset — ignore */ });
    });
    server.on('error', () => resolve({ port: 0, close: () => {} }));
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ port, close: () => { try { server.close(); } catch { /* ignore */ } } });
    });
  });
}

async function main() {
  runStaticChecks();

  if (!fs.existsSync(TSX_CLI)) errors.push('tsx not found — run `pnpm install` in backend/.');
  if (!(await tcpReachable(PG_HOST, PG_PORT))) errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`);
  if (await tcpReachable('127.0.0.1', PORT, 600)) errors.push(`Test port ${PORT} already in use.`);
  if (errors.length) return;

  const jwt = backendRequire('jsonwebtoken');
  const smtp = await startSmtpMock();

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    JWT_SECRET,
    ADMIN_JWT_SECRET,
    PORT: String(PORT),
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port || 1), SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'noreply@local.test',
  };
  const child = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: BACKEND, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let exitedEarly = false;
  child.on('exit', () => { exitedEarly = true; });

  try {
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

    // ---- Provision one principal per distinct role -------------------------
    const candidate = await signup('candidate');
    const company = await signup('company_admin');
    const agency = await signup('agency_admin');
    ok(candidate.status === 201 && !!candidate.token, `[setup] candidate signup expected 201+token, got ${candidate.status}.`);
    ok(company.status === 201 && !!company.token, `[setup] company_admin signup expected 201+token, got ${company.status}.`);
    ok(agency.status === 201 && !!agency.token, `[setup] agency_admin signup expected 201+token, got ${agency.status}.`);

    // company_admin's own company id == its user_id (auth.service.ts:42); read it from the token.
    const companyClaims = company.token ? (jwt.decode(company.token) || {}) : {};
    const ownCid = companyClaims.company_id || companyClaims.user_id || null;
    const otherCid = crypto.randomUUID();
    ok(!!ownCid, '[setup] could not derive company_admin company_id from its token.');

    // superadmin uses the SEPARATE ADMIN-JWT; wrong-role admin token exercises the 403 branch.
    const superToken = jwt.sign(
      { user_id: 'authzmx-super', email: 'super@local.test', role: 'superadmin', authenticated: true, full_name: 'Super' },
      ADMIN_JWT_SECRET, { expiresIn: '15m' });
    const wrongAdminToken = jwt.sign(
      { user_id: 'authzmx-x', email: 'x@local.test', role: 'candidate', authenticated: true, full_name: 'X' },
      ADMIN_JWT_SECRET, { expiresIn: '15m' });

    // ---- GATE 1: prove every principal actually authenticates before asserting anything ----
    if (candidate.token) ok((await jfetch('/api/v1/auth/me', { token: candidate.token })).status === 200, '[gate1] candidate /me expected 200 (token provisioning failed).');
    if (company.token) ok((await jfetch('/api/v1/auth/me', { token: company.token })).status === 200, '[gate1] company_admin /me expected 200 (token provisioning failed).');
    if (agency.token) ok((await jfetch('/api/v1/auth/me', { token: agency.token })).status === 200, '[gate1] agency_admin /me expected 200 (token provisioning failed).');
    ok((await jfetch('/api/v1/admin/agencies/pending', { token: superToken })).status === 200, '[gate1] superadmin ADMIN-JWT expected 200 on admin route (token provisioning failed).');
    if (errors.length) { errors.unshift('Token provisioning failed — aborting matrix (fix setup before trusting cells).'); return; }

    // ---- ROW 1: GET /api/questions (candidate/agency blocked, company allowed) -------------
    const Q = '/api/questions';
    cell(`GET ${Q}`, 'no-token', (await jfetch(Q)).status, 401);
    cell(`GET ${Q}`, 'candidate', (await jfetch(Q, { token: candidate.token })).status, 403);
    cell(`GET ${Q}`, 'agency_admin', (await jfetch(Q, { token: agency.token })).status, 403);
    cell(`GET ${Q}`, 'company_admin', (await jfetch(Q, { token: company.token })).status, 200);

    // ---- ROW 2: GET /api/v1/admin/agencies/pending (superadmin ADMIN-JWT only) -------------
    const AG = '/api/v1/admin/agencies/pending';
    cell(`GET ${AG}`, 'no-token', (await jfetch(AG)).status, 401);
    cell(`GET ${AG}`, 'candidate(user-JWT)', (await jfetch(AG, { token: candidate.token })).status, 401); // wrong secret -> invalid token
    cell(`GET ${AG}`, 'wrong-role(admin-JWT)', (await jfetch(AG, { token: wrongAdminToken })).status, 403);
    cell(`GET ${AG}`, 'superadmin', (await jfetch(AG, { token: superToken })).status, 200);

    // ---- ROW 3: POST insights/recompute (requireCompanyMember; negatives only) -------------
    const RC = (cid) => `/api/v1/companies/${cid}/insights/recompute`;
    cell('POST insights/recompute', 'no-token', (await jfetch(RC(ownCid), { method: 'POST' })).status, 401);
    cell('POST insights/recompute', 'candidate', (await jfetch(RC(ownCid), { method: 'POST', token: candidate.token })).status, 403);
    cell('POST insights/recompute', 'company_admin(other cid)', (await jfetch(RC(otherCid), { method: 'POST', token: company.token })).status, 403);

    // ---- ROW 4: GET insights (requireCompanyMember; positive is prisma-only) ---------------
    const GI = (cid) => `/api/v1/companies/${cid}/insights`;
    cell('GET insights', 'no-token', (await jfetch(GI(ownCid))).status, 401);
    cell('GET insights', 'candidate', (await jfetch(GI(ownCid), { token: candidate.token })).status, 403);
    cell('GET insights', 'company_admin(own cid)', (await jfetch(GI(ownCid), { token: company.token })).status, 200);

    // ---- ROW 5: POST verification/run/create COMPANY (in-handler ownership; IDOR) ----------
    const VR = '/api/v1/verification/run/create';
    const vbody = { subject_type: 'COMPANY', subject_id: otherCid };
    cell(`POST ${VR}`, 'no-token', (await jfetch(VR, { method: 'POST', body: vbody })).status, 401);
    cell(`POST ${VR}`, 'candidate', (await jfetch(VR, { method: 'POST', token: candidate.token, body: vbody })).status, 403);
    cell(`POST ${VR}`, 'company_admin(non-owner)', (await jfetch(VR, { method: 'POST', token: company.token, body: vbody })).status, 403);

    // ---- ROW 6: GET /api/v1/auth/me (baseline: any valid principal 200, none 401) ----------
    const ME = '/api/v1/auth/me';
    cell(`GET ${ME}`, 'no-token', (await jfetch(ME)).status, 401);
    cell(`GET ${ME}`, 'candidate', (await jfetch(ME, { token: candidate.token })).status, 200);
    cell(`GET ${ME}`, 'company_admin', (await jfetch(ME, { token: company.token })).status, 200);

    // ---- ROW 7: PRIV-ESC reproduce->fixed (R-44): signup can't self-grant 'admin' ----------
    {
      const res = await jfetch('/api/v1/auth/signup', {
        method: 'POST',
        body: { email: `pe+${Date.now()}@local.test`, password: 'secret123', full_name: 'PrivEsc', role: 'admin' },
      });
      const b = await res.json().catch(() => ({}));
      cell('POST /auth/signup {role:admin}', 'attacker', res.status, 400); // zod rejects the role
      const grantedRole = b?.data?.token ? (jwt.decode(b.data.token) || {}).role : undefined;
      ok(!b?.data?.token || grantedRole !== 'admin',
        `[R-44] signup returned an admin-role token (priv-esc still open). role=${grantedRole}.`);
    }
  } finally {
    killTree(child.pid);
    smtp.close();
    if (errors.length && log.trim()) {
      const tail = log.split(/\r?\n/).filter(Boolean).slice(-16).join('\n    ');
      errors.push(`--- backend log tail ---\n    ${tail}`);
    }
  }
}

function printMatrix() {
  if (!rows.length) return;
  const w = (s, n) => String(s).padEnd(n);
  console.log('\n  Role × endpoint matrix:');
  console.log(`  ${w('endpoint', 40)} ${w('principal', 26)} ${w('exp', 8)} ${w('got', 5)}`);
  for (const r of rows) {
    console.log(`  ${r.pass ? '✅' : '✗ '} ${w(r.ep, 37)} ${w(r.principal, 26)} ${w(r.expected, 8)} ${w(r.got, 5)}`);
  }
}

main()
  .then(() => {
    printMatrix();
    if (errors.length) {
      console.error('\n✗ FAIL: role × endpoint authz matrix\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('\n✅ PASS: every role × endpoint cell holds (no-token 401, wrong-role 403, correct-role 2xx) + signup priv-esc closed.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ FAIL: unexpected error running authz matrix:', e && e.stack ? e.stack : e);
    process.exit(1);
  });

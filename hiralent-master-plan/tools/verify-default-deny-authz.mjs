#!/usr/bin/env node
/**
 * verify-default-deny-authz.mjs — Wave 1 / Phase 1.3 (Default-Deny Authz & IDOR, DoD-3,5)
 *
 * Proves — against a REAL booted backend + real Postgres — that Phase 1.3 closed the
 * unauthenticated / IDOR holes. Not "it type-checks": HTTP responses are asserted.
 *
 * Runtime DoD cases:
 *   1. Webhook   POST /api/v1/webhooks/document-validation without a token -> 401;
 *               with the shared BACKEND_INTERNAL_TOKEN -> 200 (internalAuth passes).
 *   2. OCR       POST /api/ocr without a token -> 401 (checkAuth before multer).
 *   3. IDOR      A creates a submission; B's token GET /submissions/:id -> 403; A -> 200.
 *               SSE: owner A mints a stream ticket (B's mint -> 403); /submissions/stream/:id
 *               opens 200 with A's ticket, 401 with none/forged/wrong-submission ticket.
 *   4. Spoof     A POSTs body.userId=<someone-else> -> submission is owned by A
 *               (A GET 200, B GET 403), i.e. body userId is ignored.
 *   5. CV        GET /uploads/<f> -> 404 (static removed); valid signed
 *               GET /api/v1/files/<token> -> 200; tampered/expired token -> 401.
 *   6. Audit     without a token: admin agencies, verification finalize, assessment
 *               answers, questions list -> all 401/403 (default-deny closure).
 *   8. Anti-shadow  the intentionally-PUBLIC routes stay reachable without a token:
 *               GET /subscription/plans -> 200; POST /subscription/webhook/:gateway
 *               -> not 401/403 (caught the mount-order regression that 401-shadowed
 *               them behind the jobRoutes global-auth wall). Also a static mount-order
 *               guard (subscription + compete mounted BEFORE jobRoutes).
 *
 * Static regression guards (run even without infra): the closed holes must stay closed.
 *
 * Exit 0 => every case holds. Exit 1 => a precondition/assertion failed (prints why).
 *
 * Node built-ins only (+ backend's own jsonwebtoken via createRequire). Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-default-deny-authz.mjs
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
const VALIDATOR = path.join(ROOT, 'document-validator-service');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5097; // distinct from verify-auth-session (5098) / verify-local-run (5099)
const BASE = `http://127.0.0.1:${PORT}`;

// Secrets the TEST constructs itself (signs a file token / sends the webhook token).
// Pinned into the spawned server's env so both sides use the exact same value,
// independent of whatever backend/.env or the shell happen to hold.
const FILE_SECRET = 'authz-verifier-file-secret-0123456789abcdef';
const INTERNAL_TOKEN = 'authz-verifier-internal-token-0123456789';

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

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Mint a file token exactly like backend/src/utils/signedFile.ts (same secret + format). */
function signFileToken(relPath, expEpoch, secret) {
  const payload = b64url(Buffer.from(JSON.stringify({ p: relPath, e: expEpoch }), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

const jfetch = (pathname, { method = 'GET', token, body, queryToken, queryTicket } = {}) => {
  const url = new URL(`${BASE}${pathname}`);
  if (queryToken) url.searchParams.set('access_token', queryToken);
  if (queryTicket) url.searchParams.set('ticket', queryTicket);
  return fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
};

/** Cheap source-level regression guards — the closed holes must stay closed. */
function runStaticChecks() {
  const readB = (p) => { try { return fs.readFileSync(path.join(BACKEND, p), 'utf8'); } catch { return ''; } };
  const readV = (p) => { try { return fs.readFileSync(path.join(VALIDATOR, p), 'utf8'); } catch { return ''; } };

  const exec = readB('src/routes/execution.routes.ts');
  ok(/verifyStreamTicket|requireStreamTicket/.test(exec), '[static] execution.routes: SSE stream no longer uses a signed stream ticket.');
  ok(!/access_token/.test(exec), '[static] execution.routes: SSE stream still accepts a raw access_token in the URL.');
  ok(/denyIfNotOwnSubmission/.test(exec), '[static] execution.routes: submission reads / ticket-mint no longer ownership-guarded.');

  const subs = readB('src/routes/submissions.ts');
  ok(!/req\.body\.userId/.test(subs), '[static] submissions.ts still trusts req.body.userId (spoofable owner).');
  ok(/checkAuth/.test(subs) && /denyIfNotOwnSubmission/.test(subs), '[static] submissions.ts missing checkAuth/ownership guard.');

  const ocr = readB('src/routes/ocr.routes.ts');
  ok(/checkAuth/.test(ocr), '[static] ocr.routes: POST /api/ocr no longer requires checkAuth.');
  ok(/fileFilter/.test(ocr) && /limits/.test(ocr), '[static] ocr.routes: multer size/type limits missing.');

  const webhook = readB('src/routes/webhook.documentValidation.routes.ts');
  ok(/internalAuth/.test(webhook), '[static] document-validation webhook no longer uses internalAuth.');

  const adminAgency = readB('src/routes/admin.agency.routes.ts');
  ok(/adminSecurityStack/.test(adminAgency), '[static] admin.agency.routes no longer guarded by adminSecurityStack.');

  const vrun = readB('src/routes/verification.run.routes.ts');
  ok(/company_id/.test(vrun) && /ensureSubjectOwnership|Forbidden/.test(vrun),
    '[static] verification.run: create/finalize no longer enforce company ownership (any user could finalize a COMPANY KYC).');

  for (const f of [
    'src/routes/verification.run.routes.ts',
    'src/routes/candidate/assessmentAnswer.routes.ts',
    'src/routes/candidate/assessmentExecution.routes.ts',
    'src/routes/candidate/assessmentTelemetry.routes.ts',
    'src/routes/companyAssessmentInsights.routes.ts',
  ]) {
    ok(/checkAuth/.test(readB(f)), `[static] ${f} no longer mounts checkAuth.`);
  }

  const questions = readB('src/routes/questions/question.routes.ts');
  ok(/router\.get\('\/',\s*\n?\s*checkAuth/.test(questions), '[static] questions GET / is no longer guarded by checkAuth.');
  ok(/denyNonBankReaders/.test(questions), '[static] questions read routes no longer block candidates (answer-leak).');

  const insights = readB('src/routes/insights.routes.ts');
  ok(/insights\/recompute'[^)]*requireCompanyMember/s.test(insights),
    '[static] insights.recompute no longer enforces requireCompanyMember (any authed user could recompute any company).');

  const authz = readB('src/middlewares/authz.middleware.ts');
  ok(/user\.company_id/.test(authz),
    '[static] requireCompanyMember no longer reads user.company_id (legit company members would be wrongly 403ed).');
  ok(!/\[\s*'admin'\s*,\s*'super_admin'\s*,\s*'company_admin'\s*\]/.test(authz),
    '[static] requireCompanyMember blanket-passes company_admin again (cross-tenant IDOR: one company admin reaches another).');

  const app = readB('src/app.ts');
  ok(!/express\.static\(/.test(app), '[static] app.ts still serves files with express.static (public uploads leak).');
  ok(/filesRoutes/.test(app), '[static] app.ts no longer mounts the signed filesRoutes.');

  // Anti-shadow (mount order): the subscription + compete routers expose intentionally
  // PUBLIC / service-webhook endpoints (subscription GET /plans + payment gateway
  // POST /webhook/:gateway; compete POST /:id/results). job.routes.ts applies a global
  // `router.use(checkAuth)` at the bare '/api/v1/' mount that 401-rejects EVERY
  // unauthenticated request — so these routers MUST be mounted BEFORE jobRoutes, or their
  // public endpoints are shadowed (users pay and never get upgraded; pricing 401s).
  const jobsWall = app.search(/app\.use\(\s*['"]\/api\/v1\/?['"]\s*,\s*jobRoutes\s*\)/);
  const subMount = app.indexOf('subscriptionRoutes)');
  const compMount = app.search(/compete-challenges['"]\s*,\s*aiLimiter\s*,\s*competeRoutes/);
  ok(jobsWall !== -1, '[static] app.ts: could not locate the jobRoutes global-auth wall mount (pattern drift).');
  ok(subMount !== -1 && jobsWall !== -1 && subMount < jobsWall,
    '[static] app.ts: subscriptionRoutes must be mounted BEFORE jobRoutes — otherwise the public GET /subscription/plans and the payment-gateway POST /subscription/webhook/:gateway get 401-shadowed by the auth wall.');
  ok(compMount !== -1 && jobsWall !== -1 && compMount < jobsWall,
    '[static] app.ts: the compete-challenges router must be mounted BEFORE jobRoutes — otherwise its POST /:challenge_id/results service webhook gets 401-shadowed by the auth wall.');

  const py = readV('app/api/routes/validation.py');
  ok(/Authorization/.test(py) && /BACKEND_INTERNAL_TOKEN/.test(py),
    '[static] validator webhook sender no longer attaches the BACKEND_INTERNAL_TOKEN Authorization header.');
}

async function signup(role = 'candidate') {
  const email = `authz+${Date.now()}_${Math.floor(Math.random() * 1e6)}@local.test`;
  const res = await jfetch('/api/v1/auth/signup', {
    method: 'POST',
    body: { email, password: 'secret123', full_name: 'Authz Test', role },
  });
  const b = await res.json().catch(() => ({}));
  // Session 1: auth responses use the standard envelope → token under `data`.
  return { status: res.status, token: b?.data?.token || null, email };
}

async function main() {
  runStaticChecks();

  if (!fs.existsSync(TSX_CLI)) errors.push('tsx not found — run `pnpm install` in backend/.');
  if (!(await tcpReachable(PG_HOST, PG_PORT))) errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`);
  if (await tcpReachable('127.0.0.1', PORT, 600)) errors.push(`Test port ${PORT} already in use.`);
  if (errors.length) return;

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    ENABLE_DEV_MINT: '1',
    DEV_BYPASS_CREATE_SUBMISSION: '1', // skip assessment/candidate existence checks for the POST
    SCRAPING_SCHEDULER_ENABLED: 'false',
    FILE_URL_SECRET: FILE_SECRET,       // pin so the test's signed file token verifies
    BACKEND_INTERNAL_TOKEN: INTERNAL_TOKEN, // pin so the test's webhook token is accepted
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
  child.on('exit', () => { exitedEarly = true; });

  // temp CV file for the signed-URL case
  const cvRel = `resumes/cv/authztest_${process.pid}.txt`;
  const cvAbs = path.join(BACKEND, 'uploads', cvRel);

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

    // --- Users -------------------------------------------------------------
    const A = await signup('candidate');
    const B = await signup('candidate');
    ok(A.status === 201 && !!A.token, `[setup] signup A expected 201+token, got ${A.status}.`);
    ok(B.status === 201 && !!B.token, `[setup] signup B expected 201+token, got ${B.status}.`);

    // --- Case 1: webhook ---------------------------------------------------
    {
      const noTok = await jfetch('/api/v1/webhooks/document-validation', {
        method: 'POST', body: { validation_job_id: 'x', document_id: 'y', status: 'completed' },
      });
      ok(noTok.status === 401, `[1] webhook without token should be 401, got ${noTok.status}.`);

      const good = await jfetch('/api/v1/webhooks/document-validation', {
        method: 'POST', token: INTERNAL_TOKEN,
        body: { validation_job_id: 'x', document_id: 'nonexistent-doc', status: 'completed' },
      });
      ok(good.status === 200, `[1] webhook with correct internal token should be 200, got ${good.status}.`);
    }

    // --- Case 2: OCR -------------------------------------------------------
    {
      const noTok = await jfetch('/api/ocr', { method: 'POST' });
      ok(noTok.status === 401, `[2] POST /api/ocr without token should be 401, got ${noTok.status}.`);
    }

    // --- Case 3 & 4: submission IDOR + spoof -------------------------------
    if (A.token && B.token) {
      const created = await jfetch('/api/v1/submissions', {
        method: 'POST', token: A.token,
        body: { assessmentId: 'authz-test', questionId: 'q1', language: 'python', code: 'print(1)', userId: 'attacker-supplied-victim' },
      });
      const cbody = await created.json().catch(() => ({}));
      const subId = cbody?.submissionId || null;
      ok(created.status === 200 && !!subId, `[3] POST /submissions (A) expected 200+submissionId, got ${created.status}.`);

      if (subId) {
        const aRead = await jfetch(`/api/v1/submissions/${subId}`, { token: A.token });
        ok(aRead.status === 200, `[4] owner A GET /submissions/:id expected 200 (body userId must be ignored), got ${aRead.status}.`);

        const bRead = await jfetch(`/api/v1/submissions/${subId}`, { token: B.token });
        ok(bRead.status === 403, `[3] non-owner B GET /submissions/:id expected 403, got ${bRead.status}.`);

        const noTokRead = await jfetch(`/api/v1/submissions/${subId}`);
        ok(noTokRead.status === 401, `[3] GET /submissions/:id without token expected 401, got ${noTokRead.status}.`);

        // SSE now uses a signed, submission-bound stream ticket (not the raw access token).
        // Owner A can mint a ticket for their submission; non-owner B is refused at mint time.
        const aMint = await jfetch(`/api/v1/submissions/stream-ticket/${subId}`, { method: 'POST', token: A.token });
        const aTicket = (await aMint.json().catch(() => ({})))?.ticket || null;
        ok(aMint.status === 200 && !!aTicket, `[3] owner A mint stream-ticket expected 200+ticket, got ${aMint.status}.`);

        const bMint = await jfetch(`/api/v1/submissions/stream-ticket/${subId}`, { method: 'POST', token: B.token });
        ok(bMint.status === 403, `[3] non-owner B mint stream-ticket expected 403, got ${bMint.status}.`);

        const noMint = await jfetch(`/api/v1/submissions/stream-ticket/${subId}`, { method: 'POST' });
        ok(noMint.status === 401, `[3] mint stream-ticket without token expected 401, got ${noMint.status}.`);

        if (aTicket) {
          const aStream = await jfetch(`/api/v1/submissions/stream/${subId}`, { queryTicket: aTicket });
          ok(aStream.status === 200, `[3] SSE stream with owner A ticket expected 200, got ${aStream.status}.`);
          try { aStream.body?.cancel?.(); } catch { /* ignore */ }

          // A's ticket is bound to subId — it must NOT open a different submission's stream.
          const wrongSub = await jfetch(`/api/v1/submissions/stream/some-other-id`, { queryTicket: aTicket });
          ok(wrongSub.status === 401, `[3] A's ticket on a different submission id expected 401, got ${wrongSub.status}.`);
          try { wrongSub.body?.cancel?.(); } catch { /* ignore */ }
        }

        const forged = await jfetch(`/api/v1/submissions/stream/${subId}`, { queryTicket: 'not-a-real-ticket.sig' });
        ok(forged.status === 401, `[3] SSE stream with forged ticket expected 401, got ${forged.status}.`);
        try { forged.body?.cancel?.(); } catch { /* ignore */ }

        const noStream = await jfetch(`/api/v1/submissions/stream/${subId}`);
        ok(noStream.status === 401, `[3] SSE stream without any ticket expected 401, got ${noStream.status}.`);
      }
    }

    // --- Case 5: CV signed file -------------------------------------------
    {
      fs.mkdirSync(path.dirname(cvAbs), { recursive: true });
      fs.writeFileSync(cvAbs, 'dummy cv content');

      // static route is gone
      const staticHit = await jfetch(`/uploads/${cvRel}`);
      ok(staticHit.status === 404, `[5] GET /uploads/<f> should be 404 (static removed), got ${staticHit.status}.`);

      const valid = signFileToken(cvRel, Math.floor(Date.now() / 1000) + 600, FILE_SECRET);
      const goodHit = await jfetch(`/api/v1/files/${valid}`);
      ok(goodHit.status === 200, `[5] GET /api/v1/files/<valid token> expected 200, got ${goodHit.status}.`);
      try { goodHit.body?.cancel?.(); } catch { /* ignore */ }

      const tampered = valid.slice(0, -2) + (valid.endsWith('a') ? 'bb' : 'aa');
      const tamperHit = await jfetch(`/api/v1/files/${tampered}`);
      ok(tamperHit.status === 401, `[5] tampered file token expected 401, got ${tamperHit.status}.`);

      const expired = signFileToken(cvRel, Math.floor(Date.now() / 1000) - 10, FILE_SECRET);
      const expHit = await jfetch(`/api/v1/files/${expired}`);
      ok(expHit.status === 401, `[5] expired file token expected 401, got ${expHit.status}.`);
    }

    // --- Case 6: default-deny audit closure (no token -> blocked) ----------
    {
      const cases = [
        ['GET', '/api/v1/admin/agencies/pending', [401, 403]],
        ['POST', '/api/v1/verification/run/finalize', [401]],
        ['GET', '/api/v1/assessment-sessions/does-not-exist/answers', [401]],
        ['GET', '/api/questions', [401]],
      ];
      for (const [method, pathname, expected] of cases) {
        const r = await jfetch(pathname, { method, body: method === 'POST' ? {} : undefined });
        ok(expected.includes(r.status), `[6] ${method} ${pathname} without token expected ${expected.join('/')}, got ${r.status}.`);
      }
    }

    // --- Case 7: role/ownership on privileged closed routes ---------------------
    if (A.token) {
      // 7a: a candidate cannot run/finalize a COMPANY's KYC verification.
      const runCreate = await jfetch('/api/v1/verification/run/create', {
        method: 'POST', token: A.token,
        body: { subject_type: 'COMPANY', subject_id: 'some-other-company-id' },
      });
      ok(runCreate.status === 403,
        `[7a] candidate creating a COMPANY verification run expected 403 (ownership), got ${runCreate.status}.`);

      // 7b: a candidate cannot read the question bank (leaks canonicalSolution/testCases).
      const qList = await jfetch('/api/questions', { token: A.token });
      ok(qList.status === 403,
        `[7b] candidate GET /api/questions expected 403 (answer-leak block), got ${qList.status}.`);
      const qOne = await jfetch('/api/questions/some-question-id', { token: A.token });
      ok(qOne.status === 403,
        `[7b] candidate GET /api/questions/:id expected 403, got ${qOne.status}.`);
    }

    // --- Case 8: PUBLIC routes stay reachable without a token (anti-shadow) ------
    // Default-deny must not over-reach: the intentionally-public endpoints declared in
    // authz-public-allowlist.md must still respond WITHOUT a token. This is the positive
    // counterpart to Case 6 and the exact case the mount-order regression broke —
    // subscription/compete slipping behind the jobRoutes auth wall 401-shadowed them.
    {
      // Pure-public read → 200 with NO token. If shadowed by jobRoutes' checkAuth → 401.
      const plans = await jfetch('/api/v1/subscription/plans');
      ok(plans.status === 200,
        `[8] GET /subscription/plans without token expected 200 (public pricing), got ${plans.status} — shadowed by the jobRoutes auth wall?`);

      // Payment gateway callback carries no bearer; it must at least reach its handler
      // (any status but 401/403 proves it got PAST the auth wall). A shadowed webhook
      // means users pay and never get upgraded.
      const gw = await jfetch('/api/v1/subscription/webhook/stripe', { method: 'POST', body: {} });
      ok(gw.status !== 401 && gw.status !== 403,
        `[8] POST /subscription/webhook/:gateway without token must reach the handler (not 401/403-shadowed), got ${gw.status}.`);
    }
  } finally {
    try { if (fs.existsSync(cvAbs)) fs.unlinkSync(cvAbs); } catch { /* ignore */ }
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
      console.error('✗ FAIL: default-deny authz / IDOR\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: webhook + OCR + submission IDOR/spoof + SSE ownership + signed CV + default-deny closure all enforced.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ FAIL: unexpected error running authz check:', e && e.stack ? e.stack : e);
    process.exit(1);
  });

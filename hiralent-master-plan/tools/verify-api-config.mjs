#!/usr/bin/env node
/**
 * verify-api-config.mjs — Wave 3 / Phase 3.2-3.3 (Config Portability: R-27 frontend + R-13 backend)
 *
 * Proves the app talks to hosts resolved from ENVIRONMENT config, not hardcoded source. Three parts:
 *
 *   1. STATIC grep-gate (infra-free): no hardcoded API host survives in source.
 *      - frontend/src/**\/*.{ts,tsx}: NO literal `http://localhost:5000` anywhere EXCEPT the one
 *        sanctioned fallback in the resolver `frontend/src/lib/config/api.ts`.
 *      - backend/src/**\/*.ts: NO bare `fetch(...)`/`axios...(...)` call to a literal
 *        `http://localhost:8000` (the env-driven `... || "http://localhost:8000"` fallback default
 *        and prose/comments are allowed); NO `host.docker.internal` anywhere.
 *      - The resolver must keep the Next-inlining-safe shape: it must NOT read env via a dynamic
 *        `process.env[...]` access (that would break client-bundle inlining, silently → undefined).
 *      - Anti-vacuous: fails if it scanned ZERO source files (a bad glob must not pass silently).
 *
 *   2. FRONTEND resolver probe (fresh tsx child per scenario, real env override): proves the
 *      resolver DERIVES the right URLs from a staging-style host. (Proves the derivation math, not
 *      webpack client-bundle inlining — that is guarded statically in part 1.)
 *
 *   3. BACKEND stub-server proof (real booted backend + real Postgres): starts a throwaway HTTP
 *      stub, boots the backend with AI_SERVICE_URL pointed at the stub, hits the unauthenticated
 *      GET /api/v1/questions/diagram-service/health (→ controller fetch `${AI_SERVICE_URL}/health`),
 *      and asserts THE STUB RECEIVED `GET /health`. Non-vacuous: if a `localhost:8000` hardcode
 *      survives that path, the stub never gets the request → RED.
 *
 * Exit 0 => all hold. Exit 1 => any assertion/precondition failed (prints why).
 * Node built-ins only. Windows-safe.
 *
 * Usage:  node hiralent-master-plan/tools/verify-api-config.mjs
 * Prereq for part 3: native/docker Postgres on 5432 + `cd backend && pnpm install`.
 */

import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const RESOLVER_REL = 'frontend/src/lib/config/api.ts';

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PORT = 5094; // distinct from other INFRA verifiers (5090/5092/5093/5097/5098/5099)
const BASE = `http://127.0.0.1:${PORT}`;

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

const CODE_EXTS_FE = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage', '__pycache__', '.venv-authtest']);

function walk(dir, exts, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), exts, acc); }
    else if (exts.has(path.extname(e.name))) acc.push(path.join(dir, e.name));
  }
  return acc;
}
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

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

// ───────────────────────── Part 1: static grep-gate ─────────────────────────
function runStaticChecks() {
  // Resolver must exist and keep the inlining-safe shape.
  const resolverAbs = path.join(ROOT, RESOLVER_REL);
  const resolver = read(resolverAbs);
  ok(resolver.length > 0, `[static] resolver missing at ${RESOLVER_REL}.`);
  ok(/export const API_V1_BASE\b/.test(resolver) && /export const API_ROOT\b/.test(resolver) && /export const SOCKET_URL\b/.test(resolver),
    '[static] resolver does not export the expected API_V1_BASE / API_ROOT / SOCKET_URL.');
  ok(!/process\.env\s*\[/.test(resolver),
    '[static] resolver reads env dynamically (process.env[...]) — breaks Next client-bundle inlining; use literal process.env.NEXT_PUBLIC_* reads.');

  // Frontend: no hardcoded localhost:5000 outside the resolver. Scan the WHOLE frontend tree
  // (app-router `frontend/app` AND `frontend/src` both hold source — scoping to src/ alone would
  // blind the gate to the App Router pages).
  const feFiles = walk(FRONTEND, CODE_EXTS_FE);
  ok(feFiles.length > 50, `[static] frontend scan found only ${feFiles.length} files — glob likely broken (expected many).`);
  const feOffenders = [];
  for (const f of feFiles) {
    if (path.resolve(f) === path.resolve(resolverAbs)) continue; // resolver owns the one fallback literal
    if (/http:\/\/localhost:5000/.test(read(f))) feOffenders.push(path.relative(ROOT, f));
  }
  ok(feOffenders.length === 0,
    `[static] ${feOffenders.length} frontend file(s) still hardcode http://localhost:5000 (must import from ${RESOLVER_REL}):\n      ` + feOffenders.join('\n      '));

  // Backend: no bare fetch/axios call to a literal localhost:8000; the env fallback default is OK.
  const beFiles = walk(path.join(BACKEND, 'src'), new Set(['.ts']));
  ok(beFiles.length > 50, `[static] backend scan found only ${beFiles.length} files — glob likely broken.`);
  const CALL_8000 = /(?:fetch|axios(?:\.\w+)?)\(\s*[`'"]https?:\/\/localhost:8000/;
  const beOffenders = [];
  const dockerInternal = [];
  for (const f of beFiles) {
    const txt = read(f);
    if (CALL_8000.test(txt)) beOffenders.push(path.relative(ROOT, f));
    if (/host\.docker\.internal/.test(txt)) dockerInternal.push(path.relative(ROOT, f));
  }
  ok(beOffenders.length === 0,
    `[static] ${beOffenders.length} backend file(s) call a hardcoded http://localhost:8000 (route via env AI_SERVICE_URL):\n      ` + beOffenders.join('\n      '));
  ok(dockerInternal.length === 0,
    `[static] ${dockerInternal.length} backend file(s) contain host.docker.internal (must not appear in source):\n      ` + dockerInternal.join('\n      '));
}

// ───────────────────────── Part 2: frontend resolver probe ──────────────────
function probe(envOverrides) {
  const probeSrc =
    'import { API_HOST, API_V1_BASE, API_ROOT, SOCKET_URL } from ' +
    JSON.stringify(pathToResolverImport()) + ';' +
    'console.log(JSON.stringify({ API_HOST, API_V1_BASE, API_ROOT, SOCKET_URL }));';
  const res = spawnSync(process.execPath, [TSX_CLI, '-e', probeSrc], {
    cwd: FRONTEND, encoding: 'utf8',
    env: { ...cleanEnv(), ...envOverrides },
  });
  const line = (res.stdout || '').split(/\r?\n/).find((l) => l.trim().startsWith('{'));
  try { return JSON.parse(line); } catch { return { __err: (res.stdout || '') + (res.stderr || '') }; }
}
// tsx -e resolves relative imports from cwd (FRONTEND); import the resolver by relative path.
function pathToResolverImport() { return './src/lib/config/api.ts'; }
// Strip any inherited NEXT_PUBLIC_* so each scenario controls its own env deterministically.
function cleanEnv() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (k.startsWith('NEXT_PUBLIC_')) delete e[k];
  return e;
}

function runResolverProbes() {
  if (!fs.existsSync(TSX_CLI)) { errors.push('[fe] tsx not found — run `pnpm install` in backend/.'); return; }
  const STAGING = 'https://staging.example.com';

  // A: canonical bare host → derived v1 / api / socket
  const a = probe({ NEXT_PUBLIC_API_URL: STAGING });
  ok(a.API_V1_BASE === `${STAGING}/api/v1`, `[fe:A] API_V1_BASE expected ${STAGING}/api/v1, got ${a.API_V1_BASE ?? a.__err}`);
  ok(a.API_ROOT === `${STAGING}/api`, `[fe:A] API_ROOT expected ${STAGING}/api, got ${a.API_ROOT}`);
  ok(a.SOCKET_URL === STAGING, `[fe:A] SOCKET_URL expected ${STAGING}, got ${a.SOCKET_URL}`);

  // B: legacy NEXT_PUBLIC_BASE_URL (with /api/v1) → stripped to same bare host
  const b = probe({ NEXT_PUBLIC_BASE_URL: `${STAGING}/api/v1` });
  ok(b.API_HOST === STAGING && b.API_V1_BASE === `${STAGING}/api/v1`,
    `[fe:B] legacy BASE_URL strip failed: API_HOST=${b.API_HOST}, API_V1_BASE=${b.API_V1_BASE}`);

  // C: nothing set → localhost defaults
  const c = probe({});
  ok(c.API_V1_BASE === 'http://localhost:5000/api/v1', `[fe:C] default API_V1_BASE wrong: ${c.API_V1_BASE}`);

  // D: independent socket override wins for socket only
  const d = probe({ NEXT_PUBLIC_API_URL: STAGING, NEXT_PUBLIC_SOCKET_URL: 'wss://rt.example.com' });
  ok(d.SOCKET_URL === 'wss://rt.example.com' && d.API_V1_BASE === `${STAGING}/api/v1`,
    `[fe:D] socket override failed: SOCKET_URL=${d.SOCKET_URL}, API_V1_BASE=${d.API_V1_BASE}`);
}

// ───────────────────────── Part 3: backend stub-server proof ────────────────
async function runBackendStubProof() {
  if (!fs.existsSync(TSX_CLI)) { errors.push('[be] tsx not found — run `pnpm install` in backend/.'); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`[be] Postgres not reachable on ${PG_HOST}:${PG_PORT}.`); return; }
  if (await tcpReachable('127.0.0.1', PORT, 600)) { errors.push(`[be] test port ${PORT} already in use.`); return; }

  // Throwaway stub AI-service: records every request path it receives.
  const received = [];
  const stub = http.createServer((req, res) => {
    received.push(`${req.method} ${req.url}`);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', services: { diagram_generation_available: true } }));
  });
  await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
  const stubPort = stub.address().port;
  const stubUrl = `http://127.0.0.1:${stubPort}`;

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    FORCE_SKIP_MONGO: '1',
    SCRAPING_SCHEDULER_ENABLED: 'false',
    AI_SERVICE_URL: stubUrl, // ← the whole point: the controller must follow THIS
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

  try {
    const deadline = Date.now() + 45000;
    let ready = false;
    while (Date.now() < deadline) {
      if (exitedEarly) { errors.push('[be] backend exited before ready.'); break; }
      try {
        const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
        if (r.status === 200 && (await r.json().catch(() => ({})))?.db === 'up') { ready = true; break; }
      } catch { /* not up */ }
      await sleep(600);
    }
    if (!ready) { if (!errors.some((e) => e.startsWith('[be]'))) errors.push('[be] backend did not become ready (GET /health) within 45s.'); return; }

    const before = received.length;
    // The endpoint's own status is irrelevant — the PROOF is purely that the backend's outbound
    // call landed on OUR stub (i.e. it followed AI_SERVICE_URL rather than a hardcoded host).
    await fetch(`${BASE}/api/v1/questions/diagram-service/health`, { signal: AbortSignal.timeout(15000) }).catch(() => {});
    // Give the outbound fetch a beat to land on the stub.
    for (let i = 0; i < 10 && received.length === before; i++) await sleep(150);
    const hitHealth = received.some((x) => x === 'GET /health');
    ok(hitHealth,
      `[be] AI-service stub did NOT receive GET /health after hitting diagram-service/health — the call did not follow AI_SERVICE_URL (hardcoded host survived?). Stub saw: [${received.join(', ')}]`);
  } finally {
    killTree(child.pid);
    await new Promise((resolve) => stub.close(resolve));
  }

  if (errors.some((e) => e.startsWith('[be]')) && log.trim()) {
    const tail = log.split(/\r?\n/).filter(Boolean).slice(-14).join('\n    ');
    errors.push(`--- backend log tail ---\n    ${tail}`);
  }
}

async function main() {
  runStaticChecks();
  runResolverProbes();
  await runBackendStubProof();
}

main()
  .then(() => {
    if (errors.length) {
      console.error('✗ FAIL: api-config portability (R-27 / R-13)\n');
      for (const e of errors) console.error('  - ' + e);
      process.exit(1);
    }
    console.log('✅ PASS: no hardcoded hosts in source + FE resolver derives from env + BE AI call follows AI_SERVICE_URL.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ FAIL: unexpected error running api-config check:', e && e.stack ? e.stack : e);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * verify-internal-service-auth.mjs — Wave 1 / Phase 1.7 (Internal service auth; R-13/P1)
 *
 * Proves that backend→Python internal calls are authenticated: reaching a Python
 * service port is NOT enough — callers must present the shared internal token, and an
 * unconfigured token fails CLOSED (never accepts). Two layers:
 *
 *   LIVE (per service): boot the service's REAL guard inside a throwaway FastAPI app
 *     (a tiny venv with fastapi/httpx/dotenv/pydantic-settings) and assert, via
 *     TestClient, that a request with no/invalid token is rejected, a correct token
 *     passes, health stays open, and an UNSET token → 500 (fail-closed). This runs the
 *     actual security module shipped by each service — not a copy.
 *
 *   STATIC (always): the guard is actually WIRED in each service's route/app file, the
 *     Node side attaches the X-API-Token header via internalTokenHeader(), the matching
 *     service no longer fails open, and INTERNAL_API_TOKEN is documented in .env.example.
 *
 * If the venv can't be bootstrapped (offline / no python), LIVE cases skip-with-log —
 * the same pattern the transport verifier uses for a down Redis — and STATIC still runs.
 *
 * Exit 0 => every applicable assertion holds. Exit 1 => a wiring/behaviour check failed.
 * Node built-ins only. Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-internal-service-auth.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function walkTs(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');

const VENV_DIR = path.join(__dirname, '.venv-authtest');
const VENV_PY = process.platform === 'win32'
  ? path.join(VENV_DIR, 'Scripts', 'python.exe')
  : path.join(VENV_DIR, 'bin', 'python');
const PROBE = path.join(VENV_DIR, '_internal_auth_probe.py');
const PROBE_TOKEN = 'probe-tok-8f3a1c'; // arbitrary; the "good" header must equal this

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); else console.log('  ok:', msg); };
const read = (abs) => { try { return fs.readFileSync(abs, 'utf8'); } catch { return ''; } };

// ---------------------------------------------------------------------------
// Service table. `mod` is imported with cwd = the service dir, so each runs with
// its own package namespace (all three `app` packages would otherwise collide).
//   mode 'dep' -> import a FastAPI dependency and mount it via Depends()
//   mode 'mw'  -> import add_*_guard(app) and register it as middleware
// ---------------------------------------------------------------------------
const SERVICES = [
  { name: 'assessment-ai-service', dir: 'assessment-ai-service', mode: 'dep',
    mod: 'app.core.security:validate_internal_token', header: 'X-API-Token', envvar: 'INTERNAL_API_TOKEN', reject: 403 },
  { name: 'document-validator-service', dir: 'document-validator-service', mode: 'dep',
    mod: 'app.core.security:validate_internal_token', header: 'X-API-Token', envvar: 'INTERNAL_API_TOKEN', reject: 403 },
  { name: 'job-creation-ai', dir: 'talent-ai-service/job-creation-ai', mode: 'dep',
    mod: 'core.security:validate_internal_token', header: 'X-API-Token', envvar: 'INTERNAL_API_TOKEN', reject: 403 },
  { name: 'ai-service', dir: 'ai-service', mode: 'mw',
    mod: 'app.core.security:add_internal_token_guard', header: 'X-API-Token', envvar: 'INTERNAL_API_TOKEN', reject: 403 },
  { name: 'matching-candidate-job', dir: 'talent-ai-service/matching-candidate-job', mode: 'dep',
    mod: 'app.core.security:require_internal_key', header: 'X-Service-Key', envvar: 'SERVICE_API_KEY', reject: 401 },
];

// Probe script: import the REAL guard, build a tiny app, print status codes as JSON.
const PROBE_SRC = `
import sys, os, json
sys.path.insert(0, '.')
mode, imp, header = sys.argv[1], sys.argv[2], sys.argv[3]
modname, attr = imp.split(':')
mod = __import__(modname, fromlist=[attr])
target = getattr(mod, attr)
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
app = FastAPI()

@app.get('/health')
def _h():
    return {'ok': True}

if mode == 'mw':
    @app.post('/guarded')
    def _g():
        return {'ok': True}
    target(app)
else:
    @app.post('/guarded')
    def _g(_dep=Depends(target)):
        return {'ok': True}

c = TestClient(app, raise_server_exceptions=False)
good = os.environ.get('PROBE_TOKEN', '')
out = {
    'no': c.post('/guarded').status_code,
    'bad': c.post('/guarded', headers={header: 'definitely-the-wrong-token'}).status_code,
    'good': c.post('/guarded', headers={header: good}).status_code,
    'health': c.get('/health').status_code,
}
print(json.dumps(out))
`;

function findSystemPython() {
  const candidates = process.platform === 'win32'
    ? [['py', '-3'], ['python'], ['python3']]
    : [['python3'], ['python']];
  for (const c of candidates) {
    const r = spawnSync(c[0], [...c.slice(1), '--version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

function venvHasDeps() {
  if (!fs.existsSync(VENV_PY)) return false;
  const r = spawnSync(VENV_PY, ['-c', 'import fastapi, httpx, dotenv, pydantic_settings'], { encoding: 'utf8' });
  return r.status === 0;
}

/** Ensure the throwaway venv exists with the 4 test deps. Returns true if usable. */
function ensureVenv() {
  if (venvHasDeps()) return true;
  const sys = findSystemPython();
  if (!sys) { console.log('  skip: no system python found — LIVE cases skipped (STATIC still runs).'); return false; }
  console.log('  (bootstrapping throwaway venv for the live auth probe — first run only)…');
  const mk = spawnSync(sys[0], [...sys.slice(1), '-m', 'venv', VENV_DIR], { encoding: 'utf8' });
  if (mk.status !== 0) { console.log('  skip: could not create venv — LIVE cases skipped.\n' + (mk.stderr || '').slice(-400)); return false; }
  const pip = spawnSync(VENV_PY, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check',
    'fastapi', 'httpx', 'python-dotenv', 'pydantic-settings'], { encoding: 'utf8', timeout: 300000 });
  if (pip.status !== 0) { console.log('  skip: could not install test deps (offline?) — LIVE cases skipped.\n' + (pip.stderr || '').slice(-400)); return false; }
  if (!venvHasDeps()) { console.log('  skip: venv deps not importable after install — LIVE cases skipped.'); return false; }
  return true;
}

/** Run the probe for one service in a given env; return parsed {no,bad,good,health} or null. */
function runProbe(svc, extraEnv) {
  const env = { ...process.env, PROBE_TOKEN, ...extraEnv };
  const r = spawnSync(VENV_PY, [PROBE, svc.mode, svc.mod, svc.header], {
    cwd: path.join(ROOT, svc.dir), env, encoding: 'utf8', timeout: 60000,
  });
  if (r.status !== 0) {
    errors.push(`[live:${svc.name}] probe process failed:\n${(r.stdout || '') + (r.stderr || '')}`.slice(0, 900));
    return null;
  }
  const line = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
  try { return JSON.parse(line); } catch { errors.push(`[live:${svc.name}] unparseable probe output: ${r.stdout}`); return null; }
}

function liveChecks() {
  if (!ensureVenv()) return; // skip-with-log already printed
  fs.writeFileSync(PROBE, PROBE_SRC);

  for (const svc of SERVICES) {
    // Configured: the service token is set, so missing/wrong header is rejected and the
    // matching header passes; /health stays open.
    const cfg = runProbe(svc, { [svc.envvar]: PROBE_TOKEN });
    if (cfg) {
      ok(cfg.no === svc.reject, `[live:${svc.name}] no token -> ${svc.reject} (got ${cfg.no}).`);
      ok(cfg.bad === svc.reject, `[live:${svc.name}] wrong token -> ${svc.reject} (got ${cfg.bad}).`);
      ok(cfg.good === 200, `[live:${svc.name}] correct token -> 200 (got ${cfg.good}).`);
      ok(cfg.health === 200, `[live:${svc.name}] /health stays open (got ${cfg.health}).`);
    }
    // Unconfigured: token env unset -> fail closed (500) even with a header present.
    const unset = runProbe(svc, { [svc.envvar]: '' });
    if (unset) {
      ok(unset.bad === 500, `[live:${svc.name}] unset token fails CLOSED -> 500 (got ${unset.bad}).`);
    }
  }
}

function staticChecks() {
  // --- Python wiring: each guard is actually applied ---
  const assessMain = read(path.join(ROOT, 'assessment-ai-service/app/api/main.py'));
  ok(/include_router\(\s*v1_router[^)]*dependencies\s*=\s*\[\s*internal_auth\s*\]/s.test(assessMain),
    '[static] assessment-ai wires internal_auth on the v1 router include.');

  const docMain = read(path.join(ROOT, 'document-validator-service/app/main.py'));
  ok(/validation\.router[\s\S]*?dependencies\s*=\s*\[\s*internal_auth\s*\]/.test(docMain),
    '[static] document-validator wires internal_auth on the validation router.');

  const jobApp = read(path.join(ROOT, 'talent-ai-service/job-creation-ai/app.py'));
  ok(/job_ai_router[^)]*dependencies\s*=\s*\[\s*internal_auth\s*\]/s.test(jobApp),
    '[static] job-creation-ai wires internal_auth on the job-ai router.');

  const aiMain = read(path.join(ROOT, 'ai-service/app/main.py'));
  ok(/add_internal_token_guard\(\s*app\s*\)/.test(aiMain),
    '[static] ai-service registers the internal-token middleware.');

  // --- matching no longer fails open (unset key must reject, not return) ---
  const matchSec = read(path.join(ROOT, 'talent-ai-service/matching-candidate-job/app/core/security.py'));
  // Message wording may list either/both accepted key names (e.g. "SERVICE_API_KEY /
  // INTERNAL_SERVICE_KEY is not configured"); assert the fail-closed CONTRACT, not exact prose.
  // The LIVE probe above independently proves the 500 fail-closed behaviour.
  ok(/SERVICE_API_KEY[^\n]*is not configured/.test(matchSec) && /status_code\s*=\s*500/.test(matchSec),
    '[static] matching require_internal_key fails CLOSED when SERVICE_API_KEY is unset (no fail-open return).');

  // --- Python guards are fail-closed + constant-time ---
  for (const [label, rel] of [
    ['assessment-ai', 'assessment-ai-service/app/core/security.py'],
    ['document-validator', 'document-validator-service/app/core/security.py'],
    ['job-creation-ai', 'talent-ai-service/job-creation-ai/core/security.py'],
    ['ai-service', 'ai-service/app/core/security.py'],
  ]) {
    const src = read(path.join(ROOT, rel));
    ok(/hmac\.compare_digest/.test(src), `[static] ${label} guard uses constant-time compare.`);
    ok(/is not configured/.test(src) && /status_code\s*=\s*500|status_code=500/.test(src),
      `[static] ${label} guard fails closed (500) when the token is unset.`);
  }

  // --- Node side: shared header util exists and every client uses it ---
  const util = read(path.join(BACKEND, 'src/config/internalServiceAuth.ts'));
  ok(/export function internalTokenHeader/.test(util) && /X-API-Token/.test(util),
    '[static] backend internalServiceAuth.ts exports internalTokenHeader() with X-API-Token.');

  const nodeCallers = [
    'src/clients/assessment-ai-service.client.ts',
    'src/clients/document-validator.client.ts',
    'src/clients/talent-ai-service.client.ts',
    'src/services/ai/ai-service.client.ts',
    'src/services/ai/ai-question-generation.service.ts',
    'src/services/question/vectorEngine.service.ts',
    'src/controller/question/question.controller.ts',
    'src/routes/questions/question.routes.ts',
  ];
  for (const rel of nodeCallers) {
    ok(/internalTokenHeader\(\)/.test(read(path.join(BACKEND, rel))),
      `[static] ${rel} attaches internalTokenHeader().`);
  }

  // --- Coverage: NO ai-service (localhost:800x) fetch/axios call ships without the token ---
  // This is the real safety-net: the ai-service guard is deny-by-default, so ANY caller that
  // forgets the header breaks (403) or, unset, 500. A per-file "contains internalTokenHeader"
  // check is too weak — a file can have 12 ai-service calls and wire only one. Scan every
  // hardcoded localhost:800x fetch/axios literal and require the token within a short window,
  // exempting only the public liveness paths (/health, /variations/health).
  const callRe = /(?:fetch|axios(?:\.\w+)?)\(\s*[`'"]https?:\/\/localhost:800\d/;
  for (const file of walkTs(path.join(BACKEND, 'src'))) {
    const lines = read(file).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!callRe.test(lines[i])) continue;
      const isPublicHealth = /localhost:800\d\/health['"`]/.test(lines[i]) || /\/variations\/health/.test(lines[i]);
      if (isPublicHealth) continue;
      const win = lines.slice(i, i + 10).join('\n');
      ok(/internalTokenHeader/.test(win),
        `[static] ${path.relative(BACKEND, file).replace(/\\/g, '/')}:${i + 1} hardcoded localhost:800x call must attach internalTokenHeader() (deny-by-default guard).`);
    }
  }

  // --- Docs: INTERNAL_API_TOKEN surfaced in every relevant .env.example ---
  for (const rel of [
    'backend/.env.example',
    'ai-service/.env.example',
    'document-validator-service/.env.example',
    'talent-ai-service/job-creation-ai/.env.example',
  ]) {
    ok(/INTERNAL_API_TOKEN\s*=/.test(read(path.join(ROOT, rel))),
      `[static] ${rel} documents INTERNAL_API_TOKEN.`);
  }
}

console.log('verify-internal-service-auth — Phase 1.7\n');
console.log('STATIC wiring checks:');
staticChecks();
console.log('\nLIVE guard checks (real security modules under a throwaway venv):');
liveChecks();

console.log('\n' + '─'.repeat(60));
if (errors.length) {
  console.log(`❌ verify-internal-service-auth FAIL (${errors.length}):`);
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log('✅ verify-internal-service-auth PASS — internal token wired, enforced, and fail-closed.');
process.exit(0);

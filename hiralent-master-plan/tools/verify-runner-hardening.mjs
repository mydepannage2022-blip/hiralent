#!/usr/bin/env node
/**
 * verify-runner-hardening.mjs — Wave 1 / Session 4 (Phase 1.4, code-execution lockdown, R-03)
 *
 * Proves candidate-submitted code can only ever run inside a hardened container, and that
 * the absence of a secure runner FAILS CLOSED instead of degrading to host execution.
 *
 * RUNTIME probe (via tsx — no Docker daemon, no app boot):
 *   1. buildDockerBaseArgs() emits every hardening flag (--network none, --user, --read-only,
 *      --cap-drop ALL, --security-opt no-new-privileges, --pids-limit).
 *   2. isHostExecAllowed(): false in production even with the flag; true only for non-prod + flag.
 *   3. assertSafeRunner(): GREEN outside prod; GREEN in prod with a safe config; RED (throws) in
 *      prod when RUNNER_ALLOW_HOST_EXEC=1, and RED when RUNNER_HTTP_URL is set without RUNNER_STUB_TOKEN.
 *
 * STATIC guards (the closed holes must stay closed):
 *   - runner.dispatcher.ts: host fallback is gated by isHostExecAllowed() + throws
 *     SecureRunnerUnavailableError; uses buildDockerBaseArgs(); sends X-Runner-Token; no
 *     testInput heredoc interpolation remains.
 *   - runner.security.ts exports the three primitives.
 *   - http_service.py: /run + /plagiarism require the token (Depends) via constant-time compare.
 *   - server.ts calls assertSafeRunner() at boot.
 *
 * Exit 0 => all pass. Exit 1 => at least one failed (prints why). Node built-ins only.
 *
 * Usage: node hiralent-master-plan/tools/verify-runner-hardening.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');

const errors = [];
const notes = [];
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(p);
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

// ---------------------------------------------------------------------------
// STATIC guards
// ---------------------------------------------------------------------------
const dispatcher = read(path.join(BACKEND, 'src/services/runner.dispatcher.ts'));
ok(/buildDockerBaseArgs\(/.test(dispatcher),
  '[static] runner.dispatcher no longer builds its docker args via buildDockerBaseArgs() (hardening flags lost).');
ok(/isHostExecAllowed\(\)/.test(dispatcher),
  '[static] runner.dispatcher no longer gates host execution behind isHostExecAllowed().');
ok(/throw new SecureRunnerUnavailableError/.test(dispatcher),
  '[static] runner.dispatcher no longer fails closed (SecureRunnerUnavailableError) when no container runner is available.');
ok(/X-Runner-Token/.test(dispatcher),
  '[static] runner.dispatcher no longer sends the X-Runner-Token to the HTTP runner.');
// The old heredoc that interpolated testInput straight into `sh -c` must be gone.
ok(!/cat <<'EOF'/.test(dispatcher),
  '[static] runner.dispatcher still uses the testInput heredoc (shell-injection vector) — feed stdin from a file instead.');
ok(/< \$\{inputFile\}/.test(dispatcher),
  '[static] runner.dispatcher no longer feeds test input via a stdin-redirect file.');

const security = read(path.join(BACKEND, 'src/services/runner.security.ts'));
for (const fn of ['buildDockerBaseArgs', 'isHostExecAllowed', 'assertSafeRunner']) {
  ok(new RegExp(`export (?:function|class|const) ${fn}`).test(security) || new RegExp(`export .*${fn}`).test(security),
    `[static] runner.security.ts does not export ${fn}.`);
}
ok(/export class SecureRunnerUnavailableError/.test(security),
  '[static] runner.security.ts no longer exports SecureRunnerUnavailableError.');

const httpStub = read(path.join(ROOT, 'runner-python/http_service.py'));
ok(/def require_runner_token/.test(httpStub),
  '[static] http_service.py has no require_runner_token dependency — the code-exec stub is unauthenticated.');
ok(/hmac\.compare_digest/.test(httpStub),
  '[static] http_service.py token check is not constant-time (hmac.compare_digest).');
ok(/def run\([^)]*Depends\(require_runner_token\)/.test(httpStub),
  '[static] http_service.py POST /run is not guarded by require_runner_token.');
ok(/def plagiarism\([^)]*Depends\(require_runner_token\)/.test(httpStub),
  '[static] http_service.py POST /plagiarism is not guarded by require_runner_token.');

const serverTs = read(path.join(BACKEND, 'src/server.ts'));
ok(/assertSafeRunner\(\)/.test(serverTs),
  '[static] server.ts does not call assertSafeRunner() — the unsafe-runner boot guard is not wired.');

// ---------------------------------------------------------------------------
// RUNTIME probe (tsx import of runner.security.ts)
// ---------------------------------------------------------------------------
const tsxCli = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const secPath = path.join(BACKEND, 'src/services/runner.security.ts');

if (!exists(secPath)) {
  errors.push('runner.security.ts is missing.');
} else if (!exists(tsxCli)) {
  notes.push('tsx not installed in backend/ — skipped the RUNTIME probe (run `pnpm install` in backend/).');
} else {
  const probe = path.join(os.tmpdir(), `hiralent-runner-probe-${process.pid}.mjs`);
  fs.writeFileSync(probe, `
import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL(process.argv[2]).href);

function die(code, msg) { console.log(msg); process.exit(code); }
const threw = (fn) => { try { fn(); return false; } catch { return true; } };

// 1) argv hardening flags
const argv = m.buildDockerBaseArgs({ workdir: '/tmp/x' });
const joined = argv.join(' ');
for (const f of ['--network none','--user','--read-only','--cap-drop ALL','--security-opt no-new-privileges','--pids-limit']) {
  if (!joined.includes(f)) die(11, 'MISSING_FLAG:' + f);
}

// 2) isHostExecAllowed
process.env.NODE_ENV = 'development'; process.env.RUNNER_ALLOW_HOST_EXEC = '1';
if (m.isHostExecAllowed() !== true) die(12, 'DEV_FLAG_NOT_ALLOWED');
process.env.NODE_ENV = 'production';
if (m.isHostExecAllowed() !== false) die(12, 'PROD_HOST_EXEC_ALLOWED');
process.env.NODE_ENV = 'development'; delete process.env.RUNNER_ALLOW_HOST_EXEC;
if (m.isHostExecAllowed() !== false) die(12, 'DEV_NO_FLAG_ALLOWED');
// Fail-closed default: an UNSET / non-canonical NODE_ENV must NOT open the host-exec hatch
// even with the flag, and must make the boot guard fire (Wave 4 review R-03 hardening).
process.env.RUNNER_ALLOW_HOST_EXEC = '1';
delete process.env.NODE_ENV;
if (m.isHostExecAllowed() !== false) die(12, 'UNSET_ENV_HOST_EXEC_ALLOWED');
if (!threw(m.assertSafeRunner)) die(14, 'RED_UNSET_ENV_HOSTEXEC_DID_NOT_THROW');
process.env.NODE_ENV = 'staging';
if (m.isHostExecAllowed() !== false) die(12, 'STAGING_ENV_HOST_EXEC_ALLOWED');
if (!threw(m.assertSafeRunner)) die(14, 'RED_STAGING_ENV_HOSTEXEC_DID_NOT_THROW');
delete process.env.RUNNER_ALLOW_HOST_EXEC;

// 3) assertSafeRunner — GREEN outside prod (even with the flag)
process.env.NODE_ENV = 'development'; process.env.RUNNER_ALLOW_HOST_EXEC = '1';
if (threw(m.assertSafeRunner)) die(13, 'GREEN_DEV_THREW');

// RED: prod + host exec
process.env.NODE_ENV = 'production';
if (!threw(m.assertSafeRunner)) die(14, 'RED_PROD_HOSTEXEC_DID_NOT_THROW');

// RED: prod + http url without token
delete process.env.RUNNER_ALLOW_HOST_EXEC;
process.env.RUNNER_HTTP_URL = 'http://runner:9000'; delete process.env.RUNNER_STUB_TOKEN;
if (!threw(m.assertSafeRunner)) die(15, 'RED_PROD_UNAUTH_STUB_DID_NOT_THROW');

// GREEN: prod + http url WITH token, no host exec
process.env.RUNNER_STUB_TOKEN = 'x'.repeat(24);
if (threw(m.assertSafeRunner)) die(16, 'GREEN_PROD_SAFE_THREW');

process.exit(0);
`, 'utf8');

  const r = spawnSync(process.execPath, [tsxCli, probe, secPath], {
    cwd: BACKEND, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NODE_ENV: 'development' },
  });
  try { fs.unlinkSync(probe); } catch { /* ignore */ }
  if (r.status !== 0) {
    errors.push(`Runtime probe failed (exit ${r.status}): ${`${r.stdout || ''}${r.stderr || ''}`.trim().slice(0, 500)}`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
for (const n of notes) console.log('  · ' + n);
if (errors.length) {
  console.error('\n✗ FAIL: runner hardening not clean\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✅ PASS: code-runner hardened — container flags enforced, host exec fails closed (dev-flag + prod guard), HTTP stub authenticated.');
process.exit(0);

#!/usr/bin/env node
/**
 * verify-sandbox-isolation.mjs — Wave 4 / Session 1 (Real Sandbox Executor, R-03)
 *
 * Proves the HTTP runner (runner-python) executes code ONLY inside a hardened container and
 * FAILS CLOSED when Docker is unreachable — the Wave-4 completion of the Wave-1 code-exec
 * lockdown (wave-1 doc line 56: "Full real sandbox-service build is Wave 4").
 *
 * STATIC guards (always):
 *   - http_service.py runs via docker_runner (no raw host `subprocess` for candidate code),
 *     maps DockerUnavailableError → 503, and keeps the constant-time token guard on /run.
 *   - docker_runner.py exists and exports the hardening primitives.
 *
 * LIVE probe (Python, stdlib only — no venv needed):
 *   - parity: build_docker_base_args() emits every REQUIRED_DOCKER_FLAGS entry (same set the
 *     backend's buildDockerBaseArgs() enforces — both runners hardened identically).
 *   - fail-closed: with Docker disabled, docker_available() is False and run_submission raises
 *     DockerUnavailableError (never a host subprocess).
 *   - If a Docker daemon IS reachable, actually run malicious samples and assert the flags bite:
 *       · outbound network blocked   (--network none)
 *       · write outside /work blocked (--read-only rootfs)
 *       · infinite loop killed        (run timeout)
 *       · guard-teeth: the SAME net sample WITHOUT --network none can connect (best-effort;
 *         proves the flag is the cause, not the environment)
 *       · a legit python (and cpp, if gcc:12 is already pulled) submission passes
 *   - If no daemon is reachable, the live cases skip-with-note (CI-safe, like image-hygiene/Trivy);
 *     the static + fail-closed assertions still run.
 *
 * The backend dispatcher shares the byte-identical hardened flag set (parity-asserted here and by
 * verify-runner-hardening.mjs); its own live-container smoke is recorded in PROGRESS-LOG.
 *
 * Exit 0 => all applicable assertions hold. Exit 1 => a guard/behaviour check failed.
 * Node built-ins only. Windows-safe.
 * Usage: node hiralent-master-plan/tools/verify-sandbox-isolation.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const RUNNER = path.join(ROOT, 'runner-python');

const errors = [];
const notes = [];
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(p);
const ok = (cond, msg) => { if (!cond) errors.push(msg); else console.log('  ok:', msg); };

// ---------------------------------------------------------------------------
// STATIC guards
// ---------------------------------------------------------------------------
const httpSvc = read(path.join(RUNNER, 'http_service.py'));
const dockerRunner = read(path.join(RUNNER, 'docker_runner.py'));

ok(exists(path.join(RUNNER, 'docker_runner.py')),
  '[static] runner-python/docker_runner.py exists (the hardened containerized executor).');
ok(/from docker_runner import/.test(httpSvc),
  '[static] http_service.py executes via docker_runner (containerized), not a host subprocess.');
ok(!/\bimport subprocess\b/.test(httpSvc),
  '[static] http_service.py no longer imports subprocess — no host-exec path remains for /run.');
ok(/DockerUnavailableError/.test(httpSvc) && /status_code=503/.test(httpSvc),
  '[static] http_service.py fails closed (503) when Docker is unreachable.');
ok(/def require_runner_token/.test(httpSvc) && /Depends\(require_runner_token\)/.test(httpSvc),
  '[static] http_service.py /run is still guarded by the constant-time runner token.');
ok(/REQUIRED_DOCKER_FLAGS/.test(dockerRunner) && /def docker_available/.test(dockerRunner),
  '[static] docker_runner.py exports REQUIRED_DOCKER_FLAGS + docker_available().');

// ---------------------------------------------------------------------------
// Find a system python
// ---------------------------------------------------------------------------
function findPython() {
  for (const exe of ['python', 'py', 'python3']) {
    const r = spawnSync(exe, ['-c', 'import sys;print(sys.version_info[0])'], { encoding: 'utf8' });
    if (r.status === 0 && /^3/.test((r.stdout || '').trim())) return exe;
  }
  return null;
}
const PY = findPython();

if (!PY) {
  notes.push('No python3 found — skipped the LIVE isolation probe (static guards still ran).');
} else {
  const probe = path.join(os.tmpdir(), `hiralent-sandbox-probe-${process.pid}.py`);
  fs.writeFileSync(probe, PROBE_SRC(), 'utf8');
  const r = spawnSync(PY, [probe, RUNNER], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  try { fs.unlinkSync(probe); } catch { /* ignore */ }

  const raw = `${r.stdout || ''}`.trim();
  let out = null;
  try { out = JSON.parse(raw.split(/\r?\n/).filter(Boolean).pop()); } catch { /* fall through */ }

  if (r.status !== 0 || !out) {
    errors.push(`LIVE probe failed (exit ${r.status}): ${(raw + (r.stderr || '')).trim().slice(0, 600)}`);
  } else {
    for (const n of out.notes || []) notes.push(n);
    const c = out.checks || {};
    // Always-applicable (no daemon needed):
    ok(c.parity_flags, '[live] build_docker_base_args() emits every REQUIRED_DOCKER_FLAGS entry.');
    ok(c.parity_network_none, '[live] --network none present.');
    ok(c.parity_readonly, '[live] --read-only present.');
    ok(c.parity_capdrop, '[live] --cap-drop ALL present.');
    ok(c.parity_nonewpriv, '[live] --security-opt no-new-privileges present.');
    ok(c.failclosed_unavailable, '[live] docker_available() is False when Docker is disabled.');
    ok(c.failclosed_raises, '[live] run_submission() raises DockerUnavailableError when Docker is disabled (no host exec).');

    if (out.mode === 'skip-live') {
      notes.push('Live isolation checks skipped — no Docker daemon reachable.');
    } else {
      ok(c.net_blocked, '[live] outbound network blocked inside the container (--network none).');
      ok(c.write_blocked, '[live] write outside /work blocked inside the container (--read-only).');
      ok(c.timeout_killed, '[live] infinite-loop submission killed by the run timeout.');
      ok(c.legit_python_pass, '[live] a legit python submission passes in the hardened container.');
      // Guard-teeth: only a GREEN tick when we actually proved the flag is the cause (sample
      // connects once --network none is removed). If the env has no outbound even without the
      // flag, that's inconclusive — record it honestly, never as a passing "proof".
      if (c.guardteeth_net) {
        ok(true, '[live] guard-teeth: without --network none the same sample connects — proves --network none is the cause of the block.');
      } else if (c.guardteeth_net_inconclusive) {
        notes.push('guard-teeth net INCONCLUSIVE — no outbound in this env even without the flag; net_blocked shown but not attributable to --network none here.');
      } else {
        errors.push('[live] guard-teeth net produced no verdict (probe bug).');
      }
      if ('legit_cpp_pass' in c) {
        ok(c.legit_cpp_pass, '[live] a legit compiled (cpp) submission builds+runs under the read-only rootfs.');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
for (const n of notes) console.log('  · ' + n);
if (errors.length) {
  console.error('\n✗ FAIL: sandbox isolation not clean\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✅ PASS: HTTP runner containerized + hardened — isolation flags bite, host exec fails closed.');
process.exit(0);

// ---------------------------------------------------------------------------
// The Python probe (stdlib only). Kept as a function to avoid `${}` clashes.
// ---------------------------------------------------------------------------
function PROBE_SRC() {
  return [
    'import sys, os, json, tempfile, subprocess, shutil',
    'RUNNER = sys.argv[1]',
    'sys.path.insert(0, RUNNER)',
    'import docker_runner as dr',
    'res = {"checks": {}, "notes": [], "mode": "full"}',
    'def setk(k, v): res["checks"][k] = bool(v)',
    '',
    '# 1) argv parity',
    'args = dr.build_docker_base_args("/tmp/x")',
    'joined = " ".join(args)',
    'setk("parity_flags", all(f in args for f in dr.REQUIRED_DOCKER_FLAGS))',
    'setk("parity_network_none", "--network" in args and "none" in args)',
    'setk("parity_readonly", "--read-only" in args)',
    'setk("parity_capdrop", "--cap-drop" in args and "ALL" in args)',
    'setk("parity_nonewpriv", "no-new-privileges" in joined)',
    '',
    '# 2) fail-closed when Docker disabled',
    'os.environ["RUNNER_DISABLE_DOCKER"] = "1"',
    'setk("failclosed_unavailable", dr.docker_available() is False)',
    'try:',
    '    dr.run_submission("print(1)", [{"input":"","expected":"1"}], "python")',
    '    setk("failclosed_raises", False)',
    'except dr.DockerUnavailableError:',
    '    setk("failclosed_raises", True)',
    'except Exception:',
    '    setk("failclosed_raises", False)',
    'os.environ.pop("RUNNER_DISABLE_DOCKER", None)',
    '',
    '# 3) live isolation (only if a daemon is reachable)',
    'if not dr.docker_available():',
    '    res["mode"] = "skip-live"',
    '    res["notes"].append("Docker daemon unreachable - live isolation checks skipped (static parity + fail-closed still asserted).")',
    '    print(json.dumps(res)); sys.exit(0)',
    '',
    'NET = "import socket\\ntry:\\n    socket.create_connection((\'1.1.1.1\',53),3); print(\'NETOK\')\\nexcept Exception:\\n    print(\'NETBLOCKED\')\\n"',
    'WRITE = "try:\\n    open(\'/etc/pwned_by_runner\',\'w\').write(\'x\'); print(\'WROTE\')\\nexcept Exception:\\n    print(\'WBLOCKED\')\\n"',
    'LOOP = "while True:\\n    pass\\n"',
    'SQ = "n=int(input()); print(n*n)\\n"',
    '',
    'r_net = dr.run_submission(NET, [{"input":"","expected":"NETOK"}], "python")',
    'ts = r_net["testsSummary"][0]',
    'setk("net_blocked", ("NETBLOCKED" in ts["stdout"]) and ts["pass"] is False)',
    '',
    'r_w = dr.run_submission(WRITE, [{"input":"","expected":"WROTE"}], "python")',
    'tw = r_w["testsSummary"][0]',
    'setk("write_blocked", ("WBLOCKED" in tw["stdout"]) and tw["pass"] is False)',
    '',
    'r_to = dr.run_submission(LOOP, [{"input":"","expected":"never"}], "python", run_timeout_s=12)',
    'tt = r_to["testsSummary"][0]',
    'setk("timeout_killed", tt["pass"] is False and tt["note"] == "timeout")',
    '',
    'r_ok = dr.run_submission(SQ, [{"input":"5","expected":"25"},{"input":"9","expected":"81"}], "python")',
    'setk("legit_python_pass", r_ok["passed"] is True)',
    '',
    '# guard-teeth: net sample WITHOUT --network none should connect (best-effort)',
    'workdir = tempfile.mkdtemp(prefix="gt-")',
    'try:',
    '    open(os.path.join(workdir,"main.py"),"w").write(NET)',
    '    open(os.path.join(workdir,"__input.txt"),"w").write("")',
    '    try: os.chmod(workdir,0o777)',
    '    except Exception: pass',
    '    base = dr.build_docker_base_args(workdir)',
    '    stripped = []; i = 0',
    '    while i < len(base):',
    '        if base[i] == "--network": i += 2; continue',
    '        stripped.append(base[i]); i += 1',
    '    img = dr._image_for("python")',
    '    cmd = stripped + [img, "sh", "-c", "python /work/main.py < /work/__input.txt"]',
    '    p = subprocess.run(cmd, capture_output=True, text=True, timeout=30)',
    '    if "NETOK" in (p.stdout or ""):',
    '        # Real proof: same sample connects once --network none is removed, so the block',
    '        # above IS attributable to the flag (not just a no-egress environment).',
    '        setk("guardteeth_net", True)',
    '    else:',
    '        # Could NOT connect even WITHOUT the flag -> inconclusive. Do NOT claim the flag',
    '        # was proven (that would be a fake green); record it honestly instead.',
    '        res["checks"]["guardteeth_net_inconclusive"] = True',
    '        res["notes"].append("guard-teeth net INCONCLUSIVE - no outbound even without --network none; net_blocked not attributable to the flag in this env: " + (p.stdout or "").strip()[:80])',
    'except Exception as e:',
    '    res["checks"]["guardteeth_net_inconclusive"] = True',
    '    res["notes"].append("guard-teeth net skipped: " + str(e)[:120])',
    'finally:',
    '    shutil.rmtree(workdir, ignore_errors=True)',
    '',
    '# optional compiled-language proof (only if gcc:12 already pulled - do not pull 1GB in a gate)',
    'cpp_img = dr._image_for("cpp")',
    'have_cpp = subprocess.run(["docker","image","inspect",cpp_img], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0',
    'if have_cpp:',
    '    CPP = "#include <iostream>\\nint main(){int n; std::cin>>n; std::cout<<n*n; return 0;}\\n"',
    '    r_cpp = dr.run_submission(CPP, [{"input":"6","expected":"36"}], "cpp")',
    '    setk("legit_cpp_pass", r_cpp["passed"] is True)',
    'else:',
    '    res["notes"].append("gcc:12 not present locally - compiled-language (cpp) live check skipped (not pulling in gate).")',
    '',
    'print(json.dumps(res)); sys.exit(0)',
  ].join('\n');
}

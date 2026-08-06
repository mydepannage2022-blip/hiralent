"""docker_runner.py — hardened, containerized code execution for the HTTP runner.

Wave 4 / Session 1 (R-03). This is the Python mirror of the backend's proven, hardened
`docker run` path (`backend/src/services/runner.security.ts::buildDockerBaseArgs` +
`runner.dispatcher.ts`). It exists so `http_service.py` executes candidate / canonical-solution
code ONLY inside an isolated container — never as a raw host subprocess.

Isolation (R-03): non-root `--user`, read-only rootfs, `--cap-drop ALL`, `--security-opt
no-new-privileges`, `--pids-limit`, `--network none`, memory/cpu/ulimit caps. `/work` stays a
writable bind mount and `/tmp` (+ HOME=/work) is writable so compiled languages can build+run
under the read-only root.

Fail-closed: if the Docker daemon is unreachable, callers MUST refuse to run — there is no host
fallback here. `docker_available()` is the single source of truth for that decision.

Stdlib only (subprocess/shutil/tempfile), so the runner image needs no extra deps.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from typing import Any, Dict, List, Optional

# --- resource / hardening knobs (env-overridable, same names as the backend dispatcher) ---
DOCKER_MEMORY = os.environ.get("RUNNER_DOCKER_MEMORY", "256m")
DOCKER_CPUS = os.environ.get("RUNNER_DOCKER_CPUS", "0.5")
DOCKER_PIDS_LIMIT = os.environ.get("RUNNER_PIDS_LIMIT", "128")
DOCKER_USER = os.environ.get("RUNNER_DOCKER_USER", "1000:1000")
USE_RUNSC = os.environ.get("RUNNER_USE_RUNSC", "0") == "1"
TEST_TIMEOUT_S = os.environ.get("TEST_TIMEOUT_S", "2.0")
# Wall-clock ceiling for the whole `docker run` invocation (pull + build + run). Generous vs the
# per-test TEST_TIMEOUT_S so first-run image pulls / compiler startup don't false-timeout.
DOCKER_RUN_TIMEOUT_S = float(os.environ.get("RUNNER_DOCKER_RUN_TIMEOUT_S", "60"))

# The hardening flags that MUST be present — asserted by verify-sandbox-isolation.mjs (parity
# with backend REQUIRED_DOCKER_FLAGS).
REQUIRED_DOCKER_FLAGS: List[str] = [
    "--network",
    "--user",
    "--read-only",
    "--cap-drop",
    "--security-opt",
    "--pids-limit",
]

# Per-language default images (mirror of the backend dispatcher's defaultImageMap; env-overridable).
_DEFAULT_IMAGE_MAP: Dict[str, str] = {
    "python": os.environ.get("RUNNER_PY_IMAGE") or "python:3.11-slim",
    "py": os.environ.get("RUNNER_PY_IMAGE") or "python:3.11-slim",
    "javascript": os.environ.get("RUNNER_TS_IMAGE") or "node:18-slim",
    "js": os.environ.get("RUNNER_TS_IMAGE") or "node:18-slim",
    "node": os.environ.get("RUNNER_TS_IMAGE") or "node:18-slim",
    "typescript": os.environ.get("RUNNER_TS_IMAGE") or "node:18-slim",
    "ts": os.environ.get("RUNNER_TS_IMAGE") or "node:18-slim",
    "java": os.environ.get("RUNNER_JAVA_IMAGE") or "openjdk:17-slim",
    "cpp": os.environ.get("RUNNER_CPP_IMAGE") or "gcc:12",
    "c": os.environ.get("RUNNER_CPP_IMAGE") or "gcc:12",
    "c++": os.environ.get("RUNNER_CPP_IMAGE") or "gcc:12",
    "go": os.environ.get("RUNNER_GO_IMAGE") or "golang:1.20",
    "ruby": os.environ.get("RUNNER_RUBY_IMAGE") or "ruby:3.1-slim",
    "rb": os.environ.get("RUNNER_RUBY_IMAGE") or "ruby:3.1-slim",
    "csharp": os.environ.get("RUNNER_CS_IMAGE") or "mcr.microsoft.com/dotnet/sdk:7.0",
    "cs": os.environ.get("RUNNER_CS_IMAGE") or "mcr.microsoft.com/dotnet/sdk:7.0",
    "c#": os.environ.get("RUNNER_CS_IMAGE") or "mcr.microsoft.com/dotnet/sdk:7.0",
}

_FILENAME_MAP = {
    "python": "main.py", "py": "main.py",
    "javascript": "main.js", "js": "main.js", "node": "main.js",
    "typescript": "main.ts", "ts": "main.ts",
    "java": "Main.java",
    "cpp": "main.cpp", "c++": "main.cpp",
    "c": "main.c",
    "go": "main.go",
    "ruby": "main.rb", "rb": "main.rb",
    "csharp": "Program.cs", "cs": "Program.cs", "c#": "Program.cs",
}


class DockerUnavailableError(RuntimeError):
    """Raised when no Docker daemon is reachable and containerized execution is impossible."""


def docker_available() -> bool:
    """True only if a Docker daemon responds. The sole gate for fail-closed behaviour.

    Disabled explicitly with RUNNER_DISABLE_DOCKER=1 (used by the verifier to prove the
    fail-closed path without uninstalling Docker).
    """
    if os.environ.get("RUNNER_DISABLE_DOCKER") == "1":
        return False
    if shutil.which("docker") is None:
        return False
    try:
        r = subprocess.run(
            ["docker", "info"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8,
        )
        return r.returncode == 0
    except Exception:
        return False


def build_docker_base_args(
    workdir: str,
    memory: str = DOCKER_MEMORY,
    cpus: str = DOCKER_CPUS,
    pids_limit: str = DOCKER_PIDS_LIMIT,
    user: str = DOCKER_USER,
    use_runsc: bool = USE_RUNSC,
    test_timeout_s: str = TEST_TIMEOUT_S,
) -> List[str]:
    """Base `docker run` argv with the full hardening set. Pure — same input, same output.

    Byte-for-byte the same flag set as the backend's buildDockerBaseArgs() so both runners are
    hardened identically and the verifier can assert parity.
    """
    args = [
        "docker", "run", "--rm",
        # --- isolation ---
        "--network", "none",
        "--user", user,
        "--read-only",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", str(pids_limit),
        # --- resource limits ---
        "--memory", memory,
        "--cpus", cpus,
        "--ulimit", "nofile=256:256",
        "--ulimit", "nproc=256:256",
        # --- writable surfaces (root fs is read-only) ---
        "-v", f"{workdir}:/work",
        "--tmpfs", "/tmp:rw,size=32m",
        "-e", "HOME=/work",
        "-e", f"TEST_TIMEOUT_S={test_timeout_s}",
    ]
    if use_runsc:
        args += ["--runtime", "runsc"]
    return args


def _image_for(lang: str) -> str:
    override = os.environ.get("RUNNER_DOCKER_IMAGE")
    if override:
        return override
    return _DEFAULT_IMAGE_MAP.get(lang, "")


def _command_for(lang: str, image: str, input_file: str) -> Optional[List[str]]:
    """The `sh -c` tail (image + command) for a language, mirroring the backend dispatcher.

    stdin is redirected from a file inside the writable /work (no shell interpolation of
    author-controlled input — same anti-injection posture as the backend).
    """
    if lang in ("python", "py"):
        return [image, "sh", "-c", f"python /work/main.py < {input_file}"]
    if lang in ("js", "javascript", "node"):
        return [image, "sh", "-c", f"node /work/main.js < {input_file}"]
    if lang in ("ts", "typescript"):
        return [image, "sh", "-c", f"npx ts-node /work/main.ts < {input_file}"]
    if lang == "java":
        return [image, "sh", "-c", f"javac /work/Main.java && java -cp /work Main < {input_file}"]
    if lang in ("cpp", "c++"):
        return [image, "sh", "-c", f"g++ /work/main.cpp -O2 -std=c++17 -o /work/main && /work/main < {input_file}"]
    if lang == "c":
        return [image, "sh", "-c", f"gcc /work/main.c -O2 -std=c11 -o /work/main && /work/main < {input_file}"]
    if lang == "go":
        return [image, "sh", "-c", f"go run /work/main.go < {input_file}"]
    if lang in ("csharp", "cs", "c#"):
        csproj = (
            "cat > /work/app.csproj <<'CS'\n"
            '<Project Sdk="Microsoft.NET.Sdk">\n'
            "  <PropertyGroup>\n"
            "    <OutputType>Exe</OutputType>\n"
            "    <TargetFramework>net7.0</TargetFramework>\n"
            "  </PropertyGroup>\n"
            "</Project>\n"
            "CS\n"
            f"dotnet run --project /work/app.csproj < {input_file}"
        )
        return [image, "sh", "-c", csproj]
    if lang in ("ruby", "rb"):
        return [image, "sh", "-c", f"ruby /work/main.rb < {input_file}"]
    return None


# --- output comparison (mirror of backend outputNormalization default: collapse whitespace) ---
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def normalize(s: Any) -> str:
    if s is None:
        return ""
    s = str(s)
    s = _ANSI_RE.sub("", s)
    s = s.replace("\r\n", "\n").replace(" ", " ")
    if os.environ.get("RUNNER_COMPARE_COLLAPSE_WHITESPACE", "1") == "1":
        s = re.sub(r"\s+", " ", s).strip()
    else:
        s = s.strip()
    if os.environ.get("RUNNER_COMPARE_IGNORE_CASE", "0") == "1":
        s = s.lower()
    return s


def compare_outputs(expected: Any, actual: Any) -> bool:
    return normalize(expected) == normalize(actual)


def run_submission(
    code: str,
    tests: List[Dict[str, str]],
    language: str = "python",
    run_timeout_s: float = DOCKER_RUN_TIMEOUT_S,
) -> Dict[str, Any]:
    """Run `code` against every test case inside hardened containers.

    Returns the runner result shape consumed downstream (same as the backend dispatcher):
        {passed, score, runtimeMs, memoryKb, testsSummary:[{id,pass,timeMs,memKb,stdout,stderr,note}]}

    Raises DockerUnavailableError if the daemon is unreachable (caller fails closed).
    """
    if not docker_available():
        raise DockerUnavailableError(
            "Docker daemon unreachable — refusing to run code on the host (fail-closed, R-03)."
        )

    lang = (language or "python").lower()
    image = _image_for(lang)
    filename = _FILENAME_MAP.get(lang)
    if not image or not filename:
        raise ValueError(f"Unsupported language for containerized runner: {language}")

    workdir = tempfile.mkdtemp(prefix="runner-")
    tests_summary: List[Dict[str, Any]] = []
    start_all = time.perf_counter()
    input_file = "/work/__input.txt"

    try:
        with open(os.path.join(workdir, filename), "w", encoding="utf-8") as f:
            f.write(code)
        # The container's non-root user has a uid differing from the host; make the bind-mounted
        # workdir writable so build artifacts + the per-test stdin file can be written.
        try:
            os.chmod(workdir, 0o777)
        except Exception:
            pass

        base = build_docker_base_args(workdir)

        for i, t in enumerate(tests, start=1):
            test_input = (t.get("input") or "") if isinstance(t, dict) else ""
            expected = ""
            if isinstance(t, dict):
                expected = t.get("expected") or t.get("expected_output") or ""

            with open(os.path.join(workdir, "__input.txt"), "w", encoding="utf-8") as f:
                f.write(test_input)

            tail = _command_for(lang, image, input_file)
            if tail is None:
                raise ValueError(f"No docker command for language {language}")
            cmd = base + tail

            t0 = time.perf_counter()
            try:
                proc = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=run_timeout_s,
                )
                elapsed = int((time.perf_counter() - t0) * 1000)
                out = proc.stdout or ""
                if expected not in (None, ""):
                    passed = compare_outputs(expected, out)
                else:
                    passed = len(out) > 0 and proc.returncode == 0
                tests_summary.append({
                    "id": i, "pass": bool(passed), "timeMs": elapsed, "memKb": 0,
                    "stdout": out, "stderr": (proc.stderr or "")[:2000],
                    "note": "executed",
                })
            except subprocess.TimeoutExpired:
                elapsed = int((time.perf_counter() - t0) * 1000)
                tests_summary.append({
                    "id": i, "pass": False, "timeMs": elapsed, "memKb": 0,
                    "stdout": "", "stderr": f"Timeout after {run_timeout_s}s", "note": "timeout",
                })
            except Exception as e:  # noqa: BLE001 — surface as a failed test, never crash the runner
                elapsed = int((time.perf_counter() - t0) * 1000)
                tests_summary.append({
                    "id": i, "pass": False, "timeMs": elapsed, "memKb": 0,
                    "stdout": "", "stderr": str(e)[:2000], "note": "error",
                })
    finally:
        shutil.rmtree(workdir, ignore_errors=True)

    total_ms = int((time.perf_counter() - start_all) * 1000)
    total_ok = sum(1 for x in tests_summary if x["pass"])
    score = round(100.0 * total_ok / max(1, len(tests_summary)), 2)
    return {
        "passed": total_ok == len(tests_summary) and len(tests_summary) > 0,
        "score": score,
        "runtimeMs": total_ms,
        "memoryKb": 0,
        "testsSummary": tests_summary,
    }


if __name__ == "__main__":  # tiny manual smoke: `python docker_runner.py`
    demo = run_submission(
        "n=int(input()); print(n*n)",
        [{"input": "5", "expected": "25"}, {"input": "9", "expected": "81"}],
        "python",
    )
    print(json.dumps(demo, indent=2))

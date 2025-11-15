from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import tempfile
import os
import json
import shutil
import subprocess
import sys
import pathlib
import time

app = FastAPI(title='Runner & Plagiarism Runner (sandboxed)')


class TestCaseIn(BaseModel):
    input: str
    expected: str


class RunRequest(BaseModel):
    code: str
    tests: List[TestCaseIn]
    # optional resource limits (milliseconds, megabytes, bytes)
    time_limit_ms: Optional[int] = Field(5000, description='Total time limit in ms')
    memory_mb: Optional[int] = Field(256, description='Memory limit for container in MB')
    max_output_bytes: Optional[int] = Field(20000, description='Max stdout/stderr bytes to capture per test')


class TestCaseOut(BaseModel):
    testCaseId: Optional[str]
    passed: bool
    output: Optional[str]
    expected: Optional[str]
    durationMs: Optional[int]
    stderr: Optional[str]


class RunResponse(BaseModel):
    submissionId: str
    results: List[TestCaseOut]
    totalPassed: int
    totalTests: int
    runtimeMs: Optional[int]
    memoryKb: Optional[int]
    stdout: Optional[str]
    stderr: Optional[str]
    exitCode: Optional[int]


class PlagiarismRequest(BaseModel):
    code: str


class EvidenceItem(BaseModel):
    source: str
    similarity: float = Field(..., ge=0.0, le=1.0)
    snippet: str
    url: Optional[str]


class PlagiarismResponse(BaseModel):
    staticScore: float = Field(..., ge=0.0, le=1.0)
    dynamicScore: float = Field(..., ge=0.0, le=1.0)
    webScore: float = Field(..., ge=0.0, le=1.0)
    finalScore: float = Field(..., ge=0.0, le=1.0)
    evidence: List[EvidenceItem]


def _write_container_runner(tmpdir: str):
    """Write the script that will run inside the Docker container.

    The script reads `user.py` and executes it for each test by running `python user.py` with provided stdin.
    It prints a JSON result to stdout with per-test outputs and truncated stdout/stderr.
    """
    script = r"""#!/usr/bin/env python3
import json, subprocess, time, sys, os

def run_test(user_path, test_input, expected, max_output_bytes, per_test_timeout):
    # Run user code as a separate process to isolate per-test execution
    try:
        start = time.time()
        proc = subprocess.run([sys.executable, user_path], input=test_input.encode('utf-8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=per_test_timeout)
        duration = int((time.time() - start) * 1000)
        out = proc.stdout.decode('utf-8', errors='replace')
        err = proc.stderr.decode('utf-8', errors='replace')
        # truncate
        if len(out) > max_output_bytes:
            out = out[:max_output_bytes] + '\n...[truncated]'
        if len(err) > max_output_bytes:
            err = err[:max_output_bytes] + '\n...[truncated]'
        return {
            'passed': out.strip() == (expected or '').strip(),
            'output': out,
            'expected': expected,
            'durationMs': duration,
            'stderr': err,
            'exitCode': proc.returncode,
        }
    except subprocess.TimeoutExpired:
        return {'passed': False, 'output': '', 'expected': expected, 'durationMs': per_test_timeout, 'stderr': 'timeout', 'exitCode': None}
    except Exception as e:
        return {'passed': False, 'output': '', 'expected': expected, 'durationMs': 0, 'stderr': str(e), 'exitCode': None}

def main():
    with open('run_meta.json','r') as f:
        meta = json.load(f)
    tests = meta.get('tests', [])
    max_output_bytes = meta.get('max_output_bytes', 20000)
    per_test_timeout = max(1, int(meta.get('time_limit_ms',5000))/1000)
    results = []
    total_passed = 0
    for t in tests:
        r = run_test('user.py', t.get('input',''), t.get('expected',''), max_output_bytes, per_test_timeout)
        if r.get('passed'):
            total_passed += 1
        results.append(r)
    out = {
        'submissionId': meta.get('submissionId'),
        'results': results,
        'totalPassed': total_passed,
        'totalTests': len(results),
        'runtimeMs': sum([r.get('durationMs',0) for r in results]),
        'memoryKb': None,
        'stdout': '\n'.join([r.get('output','') for r in results]),
        'stderr': '\n'.join([r.get('stderr','') for r in results]),
        'exitCode': 0,
    }
    print(json.dumps(out))

if __name__ == '__main__':
    main()
"""
    path = os.path.join(tmpdir, 'container_runner.py')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(script)
    os.chmod(path, 0o755)


def run_in_docker(code: str, tests: List[dict], time_limit_ms: int = 5000, memory_mb: int = 256, max_output_bytes: int = 20000, docker_image: Optional[str] = None):
    """Run the provided code in a Docker container with resource limits. Returns parsed JSON result from container script.

    This function requires Docker to be available on the host and the provided image (or python:3.11-slim) to be pullable.
    """
    if docker_image is None:
        docker_image = os.environ.get('RUNNER_DOCKER_IMAGE', 'python:3.11-slim')

    tmpdir = tempfile.mkdtemp(prefix='runner-')
    try:
        user_path = os.path.join(tmpdir, 'user.py')
        with open(user_path, 'w', encoding='utf-8') as f:
            f.write(code)

        meta = {
            'submissionId': str(uuid.uuid4()),
            'tests': tests,
            'time_limit_ms': time_limit_ms,
            'max_output_bytes': max_output_bytes,
        }
        with open(os.path.join(tmpdir, 'run_meta.json'), 'w', encoding='utf-8') as f:
            json.dump(meta, f)

        _write_container_runner(tmpdir)

        # Build docker run command
        # Use --network none to block network, set memory and disable swap by --memory-swap=memory_mb
        docker_cmd = [
            'docker', 'run', '--rm', '--network', 'none',
            '--memory', f'{memory_mb}m', '--memory-swap', f'{memory_mb}m', '--pids-limit', '64',
            '--user', '65534:65534', '--security-opt', 'no-new-privileges',
            '-v', f'{os.path.abspath(tmpdir)}:/work:ro', '-w', '/work', docker_image,
            sys.executable, 'container_runner.py'
        ]

        # Use host-side timeout slightly larger than requested to allow container startup
        host_timeout = max(1, int(time_limit_ms / 1000) + 2)
        proc = subprocess.run(docker_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=host_timeout)
        if proc.returncode != 0:
            # include stderr for diagnostics
            raise RuntimeError(f'Docker run failed: {proc.stderr.decode("utf-8", errors="replace")}')

        out = proc.stdout.decode('utf-8', errors='replace')
        # The container_runner prints JSON; parse it
        try:
            parsed = json.loads(out)
        except Exception as e:
            raise RuntimeError(f'Failed to parse runner output: {e}\nRaw output:\n{out}\nStderr:\n{proc.stderr.decode("utf-8", errors="replace")}')

        return parsed
    finally:
        try:
            shutil.rmtree(tmpdir)
        except Exception:
            pass


@app.post('/run', response_model=RunResponse)
async def run_code(req: RunRequest):
    """Run the code inside a sandboxed Docker container.

    The endpoint accepts optional resource limits and will call Docker to execute
    the submitted `code` against the provided `tests`. Results are returned in
    the same RunResponse shape.
    """
    try:
        # prepare test dicts
        tests = [t.dict() for t in req.tests]
        parsed = run_in_docker(
            code=req.code,
            tests=tests,
            time_limit_ms=int(req.time_limit_ms or 5000),
            memory_mb=int(req.memory_mb or 256),
            max_output_bytes=int(req.max_output_bytes or 20000),
            docker_image=os.environ.get('RUNNER_DOCKER_IMAGE')
        )

        # parsed should be a dict compatible with RunResponse
        return parsed
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail='Runner timed out')
    except RuntimeError as e:
        # Docker failures or parsing failures
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/plagiarism', response_model=PlagiarismResponse)
async def plagiarism_check(req: PlagiarismRequest):
    """Simple stub plagiarism service: returns zero-risk with empty evidence.

    Later this endpoint will connect to a vector DB and compute similarities.
    """
    return PlagiarismResponse(staticScore=0.0, dynamicScore=0.0, webScore=0.0, finalScore=0.0, evidence=[])

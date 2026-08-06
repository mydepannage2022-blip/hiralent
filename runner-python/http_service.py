from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, root_validator
from typing import List, Dict, Any, Optional
import os
import hmac

from docker_runner import run_submission, docker_available, DockerUnavailableError

app = FastAPI(title='Runner (hardened)')

# This service executes arbitrary submitted code. Two layers protect it:
#   1. AuthN — a shared token (constant-time compare); if no token is configured, fail closed
#      (503) rather than run code for anyone. Backend + ai-service send `X-Runner-Token`.
#   2. Isolation — execution happens ONLY inside a hardened `docker run` (see docker_runner.py:
#      non-root, read-only rootfs, cap-drop ALL, no-new-privileges, pids-limit, --network none,
#      memory/cpu caps). There is NO host-subprocess fallback: if Docker is unreachable we
#      refuse (503). This closes R-03 for the HTTP runner path.
RUNNER_STUB_TOKEN = os.environ.get('RUNNER_STUB_TOKEN', '')


def require_runner_token(x_runner_token: Optional[str] = Header(default=None)):
    if not RUNNER_STUB_TOKEN:
        raise HTTPException(status_code=503, detail='Runner disabled: RUNNER_STUB_TOKEN not configured')
    if not hmac.compare_digest(x_runner_token or '', RUNNER_STUB_TOKEN):
        raise HTTPException(status_code=401, detail='Invalid or missing runner token')
    return True


class TestCase(BaseModel):
    input: str
    expected: Optional[str] = None
    expected_output: Optional[str] = None

    @root_validator(pre=True)
    def accept_expected_or_expected_output(cls, values):
        # Accept either 'expected' or 'expected_output' for compatibility
        if 'expected' not in values and 'expected_output' in values:
            values['expected'] = values.get('expected_output')
        return values


class RunRequest(BaseModel):
    code: str
    tests: List[TestCase]
    language: Optional[str] = 'python'


@app.get('/health')
def health():
    # Report whether the daemon is reachable so orchestration can see a fail-closed runner.
    return {'status': 'ok', 'dockerAvailable': docker_available()}


@app.post('/run')
def run(req: RunRequest, _auth: bool = Depends(require_runner_token)):
    # Execute the submission for every test case inside hardened containers. If Docker is
    # unreachable, fail closed (503) — we NEVER run candidate code on the host.
    tests = [
        {'input': t.input or '', 'expected': t.expected if t.expected is not None else t.expected_output}
        for t in req.tests
    ]
    try:
        return run_submission(req.code, tests, req.language or 'python')
    except DockerUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/plagiarism')
def plagiarism(payload: Dict[str, Any], _auth: bool = Depends(require_runner_token)):
    # De-scoped (R-34, Wave 4 Session 2): there is NO real plagiarism detector, so we
    # return an explicit "not computed" signal instead of a fabricated zero-risk that
    # would read to consumers as "verified clean". A real pipeline (static AST +
    # embeddings + web-corpus) is out of scope; callers must treat not_computed as
    # "unknown", never as a passing score. Still token-guarded.
    return {'status': 'not_computed', 'reason': 'plagiarism-detection-descoped', 'risk': None, 'evidence': []}

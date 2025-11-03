from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import time

app = FastAPI(title='Runner Stub')

class TestCase(BaseModel):
    input: str
    expected: str

class RunRequest(BaseModel):
    code: str
    tests: List[TestCase]

@app.post('/run')
def run(req: RunRequest):
    # Simple deterministic stub: return pass if code contains the word 'pass' or prints expected
    tests_summary = []
    total_ok = 0
    start = time.perf_counter()
    for i, t in enumerate(req.tests, start=1):
        passed = 'print("hello")' in req.code or 'pass' in req.code
        if passed:
            total_ok += 1
        tests_summary.append({
            'id': i,
            'pass': passed,
            'timeMs': 10,
            'memKb': 1024,
            'stderr': '',
            'note': 'stub'
        })
    elapsed = int((time.perf_counter() - start) * 1000)
    score = round(100.0 * total_ok / max(1, len(req.tests)), 2)
    return {
        'passed': total_ok == len(req.tests),
        'score': score,
        'runtimeMs': elapsed,
        'memoryKb': 1024,
        'testsSummary': tests_summary,
    }

@app.post('/plagiarism')
def plagiarism(payload: Dict[str, Any]):
    # Very small stub: always return zero risk
    return {'risk': 0.0, 'evidence': []}

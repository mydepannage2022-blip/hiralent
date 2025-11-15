"""Minimal FastAPI runner and plagiarism HTTP endpoints for local development.

This is a lightweight dev-only server that exposes:
- POST /run -> accepts { code, tests } and returns a runner-like JSON
- POST /plagiarism -> accepts { code } and returns a plagiarism-like JSON

WARNING: This runs code locally and is NOT secure. Use only for local dev.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import tempfile
import os
import json
from typing import List, Dict
from app.multi_language.python_runner import run_python


class TestCase(BaseModel):
    input: str
    expected: str


class RunRequest(BaseModel):
    code: str
    tests: List[TestCase] = []


class PlagRequest(BaseModel):
    code: str


app = FastAPI()


@app.post('/run')
def run(req: RunRequest):
    # write code to temp file
    tmpdir = tempfile.mkdtemp(prefix='sandbox-')
    try:
        main_path = os.path.join(tmpdir, 'main.py')
        with open(main_path, 'w', encoding='utf-8') as f:
            f.write(req.code)

        # naive execution: run main.py once and return placeholder tests
        code, out, err = run_python(main_path, timeout=5)
        result = {
            'passed': False,
            'score': 0,
            'runtimeMs': None,
            'memoryKb': None,
            'results': [],
            'testsSummary': [],
            'error': err or (out if code != 0 else None),
        }
        return result
    finally:
        try:
            os.remove(main_path)
            os.rmdir(tmpdir)
        except Exception:
            pass


@app.post('/plagiarism')
def plagiarism(req: PlagRequest):
    # Simple mock: return fixed score and example evidences for dev
    return {'score': 0.0, 'evidences': []}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8004)

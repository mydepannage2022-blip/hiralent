from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, root_validator
from typing import List, Dict, Any, Optional
import time
import tempfile
import subprocess
import os
import sys
import shutil

app = FastAPI(title='Runner Stub')


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


def normalize(s: Optional[str]) -> str:
    if s is None:
        return ''
    # normalize newlines and strip trailing spaces
    return s.replace('\r\n', '\n').strip()


def execute_code(language: str, code: str, stdin: str, timeout: float = 2.0):
    # Generic multi-language executor. Attempts to run code using the host toolchain.
    lang = (language or 'python').lower()
    with tempfile.TemporaryDirectory() as td:
        start = time.perf_counter()

        def _ret(code, out, err, elapsed):
            return code, out, err, elapsed

        try:
            if lang in ('py', 'python'):
                file_path = os.path.join(td, 'main.py')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                exe = sys.executable or shutil.which('python') or shutil.which('py') or 'python'
                proc = subprocess.run([exe, file_path], input=stdin, text=True, capture_output=True, timeout=timeout)
                elapsed = int((time.perf_counter() - start) * 1000)
                return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)

            if lang in ('js', 'javascript', 'node'):
                file_path = os.path.join(td, 'main.js')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                node = shutil.which('node')
                if not node:
                    raise FileNotFoundError('node not found on PATH')
                proc = subprocess.run([node, file_path], input=stdin, text=True, capture_output=True, timeout=timeout)
                elapsed = int((time.perf_counter() - start) * 1000)
                return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)

            if lang in ('ts', 'typescript'):
                # Try to run with ts-node via npx, fallback to error if not available
                file_path = os.path.join(td, 'main.ts')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                npx = shutil.which('npx')
                if npx:
                    proc = subprocess.run([npx, 'ts-node', file_path], input=stdin, text=True, capture_output=True, timeout=timeout)
                    elapsed = int((time.perf_counter() - start) * 1000)
                    return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)
                else:
                    raise FileNotFoundError('npx/ts-node not available; install ts-node or use Docker')

            if lang in ('java',):
                file_path = os.path.join(td, 'Main.java')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                javac = shutil.which('javac')
                java = shutil.which('java')
                if not javac or not java:
                    raise FileNotFoundError('javac/java not found on PATH')
                # compile
                cproc = subprocess.run([javac, file_path], capture_output=True, text=True, timeout=timeout)
                if cproc.returncode != 0:
                    elapsed = int((time.perf_counter() - start) * 1000)
                    return _ret(cproc.returncode, '', cproc.stderr, elapsed)
                proc = subprocess.run([java, '-cp', td, 'Main'], input=stdin, text=True, capture_output=True, timeout=timeout)
                elapsed = int((time.perf_counter() - start) * 1000)
                return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)

            if lang in ('cpp', 'c++'):
                file_path = os.path.join(td, 'main.cpp')
                exe_path = os.path.join(td, 'main')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                gpp = shutil.which('g++')
                if not gpp:
                    raise FileNotFoundError('g++ not found on PATH')
                cproc = subprocess.run([gpp, '-std=c++17', file_path, '-O2', '-o', exe_path], capture_output=True, text=True, timeout=timeout)
                if cproc.returncode != 0:
                    elapsed = int((time.perf_counter() - start) * 1000)
                    return _ret(cproc.returncode, '', cproc.stderr, elapsed)
                run_cmd = [exe_path]
                if os.name == 'nt':
                    run_cmd = [exe_path + '.exe'] if os.path.exists(exe_path + '.exe') else [exe_path]
                proc = subprocess.run(run_cmd, input=stdin, text=True, capture_output=True, timeout=timeout, cwd=td)
                elapsed = int((time.perf_counter() - start) * 1000)
                return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)

            if lang in ('go',):
                file_path = os.path.join(td, 'main.go')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                goexe = shutil.which('go')
                if not goexe:
                    raise FileNotFoundError('go not found on PATH')
                proc = subprocess.run([goexe, 'run', file_path], input=stdin, text=True, capture_output=True, timeout=timeout)
                elapsed = int((time.perf_counter() - start) * 1000)
                return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)

            if lang in ('rb', 'ruby'):
                file_path = os.path.join(td, 'main.rb')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                ruby = shutil.which('ruby')
                if not ruby:
                    raise FileNotFoundError('ruby not found on PATH')
                proc = subprocess.run([ruby, file_path], input=stdin, text=True, capture_output=True, timeout=timeout)
                elapsed = int((time.perf_counter() - start) * 1000)
                return _ret(proc.returncode, proc.stdout, proc.stderr, elapsed)

            # C# / dotnet omitted for simplicity: require a proper project file. Advise Docker.
            raise HTTPException(status_code=400, detail=f'Language {language} is not supported by this local stub')

        except subprocess.TimeoutExpired as e:
            elapsed = int((time.perf_counter() - start) * 1000)
            return -1, e.stdout or '', f'Timeout after {timeout}s', elapsed
        except FileNotFoundError as e:
            # Bubble up so caller can return helpful message
            raise
        except Exception as e:
            elapsed = int((time.perf_counter() - start) * 1000)
            return -2, '', str(e), elapsed


@app.post('/run')
def run(req: RunRequest):
    # Execute submitted Python code for each provided test case and compare stdout
    tests_summary = []
    total_ok = 0
    start = time.perf_counter()


    for i, t in enumerate(req.tests, start=1):
        stdin = t.input or ''
        expected = normalize(t.expected)

        try:
            retcode, out, err, elapsed = execute_code(req.language or 'python', req.code, stdin, timeout=2.0)
        except FileNotFoundError as e:
            # runtime/compiler not found on system
            raise HTTPException(status_code=500, detail=str(e))

        out_norm = normalize(out)
        passed = (expected == out_norm) if expected != '' else (retcode == 0)

        if passed:
            total_ok += 1

        tests_summary.append({
            'id': i,
            'pass': bool(passed),
            'timeMs': elapsed,
            'memKb': 0,
            'stdout': out,
            'stderr': err,
            'note': 'executed'
        })

    elapsed_total = int((time.perf_counter() - start) * 1000)
    score = round(100.0 * total_ok / max(1, len(req.tests)), 2)
    return {
        'passed': total_ok == len(req.tests),
        'score': score,
        'runtimeMs': elapsed_total,
        'memoryKb': 0,
        'testsSummary': tests_summary,
    }


@app.post('/plagiarism')
def plagiarism(payload: Dict[str, Any]):
    # Very small stub: always return zero risk
    return {'risk': 0.0, 'evidence': []}

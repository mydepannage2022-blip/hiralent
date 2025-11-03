Runner & Plagiarism stub
=========================

This directory contains a small FastAPI-based stub used for local development and
E2E tests. It implements two endpoints:

- POST /run — accepts { code, tests } and returns a deterministic runner result.
- POST /plagiarism — accepts { code } and returns an empty plagiarism report.

Usage (from project root):

```powershell
cd backend/services/runner-plagiarism
python -m pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001
```

Set `RUNNER_HTTP_URL` to `http://127.0.0.1:8001` in the backend env to use this stub.

This is intentionally minimal. Later improvements will add sandboxing, time and
memory limits, output truncation, network blocking, and real plagiarism checks.

# Python Runner Service — Setup & Run Guide

This document explains how to get the Python runner microservice running locally. Share this with a teammate so they can run the service and connect it to the backend worker.

---

## Prerequisites

- Python 3.10+
- pip
- (optional) Docker (for containerized runs)
- The repository cloned and the `backend` project available locally

---

## Locate the runner folder

```
backend/python-runner
```

It should contain the application (e.g. `app.py`, `main.py` or `runner.py`) and a `requirements.txt` (or `pyproject.toml`).

---

## 1) Create & activate a virtual environment

### Windows (PowerShell)

```powershell
cd C:\path\to\project\backend\python-runner
python -m venv .venv
.\.venv\Scripts\activate
```

### macOS / Linux

```bash
cd /path/to/project/backend/python-runner
python3 -m venv .venv
source .venv/bin/activate
```

---

## 2) Install dependencies

If `requirements.txt` is present:

```bash
pip install -r requirements.txt
```

If not, install these commonly used packages (example):

```bash
pip install fastapi uvicorn pydantic
```

If the project uses `poetry` or `pipenv`, follow your project conventions.

---

## 3) Run the service locally

A common entrypoint is `app:app` or `main:app` (FastAPI). Start with Uvicorn on port `8002` (recommended for local testing):

```bash
uvicorn app:app --host 127.0.0.1 --port 8002 --reload
```

Expected log:

```
INFO:     Uvicorn running on http://127.0.0.1:8002 (Press CTRL+C to quit)
```

> If your module is named differently (e.g. `main.py`), use `uvicorn main:app`.

---

## 4) Quick smoke tests (curl)

### Plagiarism endpoint (example)

```bash
curl -X POST http://127.0.0.1:8002/plagiarism \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"hi\")"}'
```

Expected (example) response:

```json
{
  "staticScore": 0.0,
  "dynamicScore": 0.0,
  "webScore": 0.0,
  "finalScore": 0.0,
  "evidence": []
}
```

### Run endpoint (example)

```bash
curl -X POST http://127.0.0.1:8002/run \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(\"hello\")","testCases":[{"input":"","expected":"hello"}] }'
```

Expected (example):

```json
{"status":"success","output":"hello","passed":true}
```

---

## 5) Connect the backend worker to your local runner

Set the runner URL environment variable for the backend worker and start the worker so it can send jobs to your local runner.

### Windows PowerShell example

```powershell
cd C:\path\to\project\backend
$Env:RUNNER_HTTP_URL="http://127.0.0.1:8002"
npm run worker:run
```

(Replace `worker:run` with whichever npm script your repo uses for the worker.)

### macOS / Linux example

```bash
cd /path/to/project/backend
export RUNNER_HTTP_URL="http://127.0.0.1:8002"
npm run worker:run
```

---

## 6) Optional: Docker (build + run)

If you prefer Docker:

```bash
cd backend/python-runner
# build
docker build -t python-runner .
# run
docker run -p 8002:8002 python-runner
```

Adjust the `EXPOSE` and CMD/ENTRYPOINT in your `Dockerfile` as needed.

---

## Troubleshooting checklist

- If `uvicorn` fails to import `app`, ensure you passed the correct module path (e.g. `app:app` vs `main:app`).
- If ports are busy, choose another port and update `RUNNER_HTTP_URL` accordingly.
- If tests fail, inspect the service logs for stack traces; dependencies may be missing or versions incompatible.
- For reproducible runs, pin dependencies in `requirements.txt` or use `poetry.lock`/`Pipfile.lock`.

---

## Summary quick commands (copyable)

```bash
cd backend/python-runner
python -m venv .venv
# activate (mac/linux)
source .venv/bin/activate
# activate (windows powershell)
#.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8002 --reload
```

And test:

```bash
curl -X POST http://127.0.0.1:8002/plagiarism -H "Content-Type: application/json" -d '{"code":"print(\"hi\")"}'
```

---

If you want, I can:

- Add this `README.md` into the repo (done).
- Add an example `docker-compose` service and env snippet to run the runner with the rest of the stack.
- Add a tiny health-check endpoint or a Postman collection for the runner.

Tell me which of these extras you'd like next.

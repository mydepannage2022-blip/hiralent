# Dev architecture and local runbook

This document describes the local development architecture (the same architecture we discussed in the prompt) and gives copy-paste PowerShell commands to run the full candidate coding pipeline end-to-end locally without editing `.env` files.

## Components

- Backend API (Node.js + TypeScript)
  - Exposes REST endpoints and the SSE stream endpoint: `/api/v1/submissions/stream/:id`
  - Uses Prisma + Postgres for primary persistence
  - Uses an in-process EventEmitter with an optional Redis pub/sub bridge (dev falls back to in-memory)
  - Worker can be run in the same process (in-memory queue) or separately (Redis-backed queue)

- Worker (TypeScript)
  - Polls/consumes run jobs, sends to the runner, persists results, and emits submission events back to the backend via the emitter

- Runner (Python FastAPI)
  - Executes/sandbox code (or uses Docker-run path). Exposes HTTP `/run` and optional `/plagiarism` endpoints

- Frontend (Next.js)
  - Connects to backend REST endpoints and opens the SSE stream to show RUNNING → COMPLETED events

- Optional infra
  - Redis: used for cross-process queues and pub/sub (recommended for separate backend and worker processes)
  - Postgres: required by Prisma (dev usually points to a dev Postgres instance)

## Key dev flags and behavior

- ENABLE_DEV_MINT=1 — enable dev-only helper routes (seed user, seed assessment, dev emit)
- FORCE_INMEMORY=1 — force in-memory queue/emitter (single-process only; worker running in a separate process will NOT see in-memory jobs)
- REDIS_URL — used when available to enable cross-process queueing and pub/sub
- RUNNER_HTTP_URL — runner URL the backend/worker will call (e.g. `http://127.0.0.1:8002`)

## High-level flow (submission lifecycle)

1. Frontend posts a submission to backend REST endpoint → backend inserts PENDING submission
2. Backend enqueues a job (in-memory or Redis) for the worker
3. Worker picks the job, marks RUNNING, forwards to the runner, waits for result
4. Worker persists result (COMPLETED/FAILED) and emits events via emitSubmissionEvent
5. Backend’s SSE streams the state changes to any connected clients

## Quick run steps (PowerShell) — three terminals

Notes:
- Use PowerShell as the examples below set environment variables inline for the process.
- If you want cross-process queues, run a Redis instance and set `REDIS_URL` in the backend and worker commands.
- If you prefer, the repository already contains helper scripts under `backend/` (for example `start-backend.ps1`, `start-runner-worker.ps1`), but the commands below are explicit and do not edit `.env`.

1) Start the Python runner (terminal A)

```powershell
# open terminal A
cd C:\Users\USER\hiralent\runner-python
# (optional) install dependencies once
python -m pip install -r requirements.txt

# start the runner - the project contains a few options; uvicorn is recommended
python -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload

# Alternative (if the runner module is under a different filename):
# python -m uvicorn entrypoint:app --host 127.0.0.1 --port 8002 --reload
```

2) Start the backend API in dev mode (terminal B)

```powershell
# open terminal B
cd C:\Users\USER\hiralent\backend

# Run backend with inline env flags so no .env file edits are needed.
$env:FORCE_INMEMORY='1';
$env:ENABLE_DEV_MINT='1';
$env:RUNNER_HTTP_URL='http://127.0.0.1:8002';

# If you want cross-process behavior, run a Redis instance and instead set:
# $env:REDIS_URL='redis://127.0.0.1:6379'

# Start the backend dev server (uses the project scripts)
npm run dev
```

3) Start the worker in foreground so it picks up jobs (terminal C)

Important: If you used `FORCE_INMEMORY=1` the worker must run in the same process as the backend to see jobs; to test cross-process behavior, run Redis and set `REDIS_URL` in both backend and worker.

```powershell
# open terminal C
cd C:\Users\USER\hiralent\backend

# Ensure the same runner URL and FORCE_INMEMORY if needed
$env:FORCE_INMEMORY='1';
$env:RUNNER_HTTP_URL='http://127.0.0.1:8002';

# Start the worker in the foreground. Options:
# - If the project includes a ps1 helper: ./start-runner-worker.ps1
# - Or run via ts-node (dev):
npx ts-node --transpile-only src/workers/run.worker.ts

# If the repository uses a different script name, check package.json for a worker start command and use it, for example:
# npm run worker:dev
```

4) Seed dev fixtures (optional, only when ENABLE_DEV_MINT=1)

```powershell
# With backend running and ENABLE_DEV_MINT=1, call the dev seed endpoints from another terminal
cd C:\Users\USER\hiralent

# Example using curl (PowerShell):
curl -X POST http://127.0.0.1:5000/api/dev/seed-assessment -H "Content-Type: application/json"

# Example: create the dev-user token:
curl -X POST http://127.0.0.1:5000/api/dev/mint-token -H "Content-Type: application/json" -d '{"userId":"dev-user"}'

# Or use the repository convenience script: scripts/post_submission.js (see next step)
```

5) Post a test submission and watch SSE

```powershell
# Post a submission using the convenience script from project root (it defaults to 127.0.0.1 and dev-user)
cd C:\Users\USER\hiralent

# Example: node scripts/post_submission.js --file tests/test-code.js
node scripts/post_submission.js

# Open an SSE connection to watch events for the resulting submissionId
# If the script prints a submissionId, you can open a curl SSE stream:
# Replace <submissionId> with the id printed by the script
curl http://127.0.0.1:5000/api/v1/submissions/stream/<submissionId>

# Or use the frontend (set NEXT_PUBLIC_BASE_URL=http://127.0.0.1:5000 and run the Next dev server) and open the submission page
```

## Troubleshooting

- Worker doesn't pick up job (PENDING remains):
  - If you used `FORCE_INMEMORY=1` and started backend and worker in separate processes, they will not share the in-memory queue. Either:
    - Start the worker in the same process (not recommended for iterative dev), or
    - Use Redis: run Redis locally, set `REDIS_URL='redis://127.0.0.1:6379'` in both backend and worker envs and restart both processes.

- SSE connection closes immediately / no events in browser:
  - Confirm the SSE endpoint works with curl in a terminal (curl shows `data:` lines).
  - Check backend logs for emitter messages and SSE write errors.
  - Ensure CORS & credentials: backend allows the origin and sets Access-Control-Allow-Credentials when EventSource uses credentials. The frontend SSE hook includes a fallback to no-credentials.

- Prisma / `npm install` errors on Windows ("'node' is not recognized"):
  - Ensure node is on PATH in the shell you run. Use PowerShell (not cmd) if you installed Node via the standard installer.

## What to check to verify the architecture end-to-end

1. Runner: HTTP GET root or run a simple /health endpoint or `uvicorn` logs listening on port 8002.
2. Backend: logs show Postgres connected and server listening on 5000.
3. Worker: logs show polling jobs, RUNNING -> COMPLETED transitions.
4. SSE: `curl http://127.0.0.1:5000/api/v1/submissions/stream/<submissionId>` shows `data: { ... }` lines with status transitions.
5. Frontend: open a submission page, ensure it connects to SSE and displays status updates.

## Next steps (optional)

- Add a small PowerShell helper to open three terminals automatically (I can add this if you'd like).
- Add a `docker-compose` file with Postgres + Redis to make spinning up infra easier (repo may already have docker-compose.yml — review and extend).

If you'd like, I can add the start-helper PowerShell script that opens three terminal windows and runs the exact commands above. Tell me whether you want fully automated process windows or prefer to run commands manually.

---
Generated: 2025-11-03

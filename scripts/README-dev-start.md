# Dev start helper

What this does
- Starts shared infra via `docker-compose up -d` (unless you pass `-SkipDockerCompose`)
- Waits for Postgres to be reachable
- Idempotently inserts `dev-user` and `local-test` rows into the database used by the backend
- Opens three PowerShell windows running:
  - backend dev server: `pnpm run dev`
  - backend worker: `pnpm run worker:dev`
  - runner stub: `python -m uvicorn http_service:app --host 0.0.0.0 --port 8001 --reload`

Prerequisites
- Docker desktop installed and running
- `pnpm` installed (or edit the script to use `npm` if you prefer)
- Python available on PATH (for runner stub)

How to run
1. From the repository root run in PowerShell:

```powershell
./scripts/dev-start.ps1
```

2. If you already have docker-compose services up and want to skip starting them:

```powershell
./scripts/dev-start.ps1 -SkipDockerCompose
```

Notes
- The script uses the DB credentials expected by the backend: `postgres` user, password `Azerty1213`, database `hiralent_db`. If you changed `.env` to point somewhere else, either update your `.env` or edit the SQL block in this script.
- The SQL inserts are idempotent and will not overwrite existing rows.
- If `pnpm` is not installed, change the `Start-Process` commands in the script to use `npm run dev` / `npm run worker:dev`.
- If you prefer the runner to run in Docker, replace the `Start-Process` runner command with your preferred Docker run command.

Next steps
- Start the frontend and submit a code sample. The submission should move from `PENDING` -> `RUNNING` -> `COMPLETED` and the frontend SSE should surface the final `result` JSON (score, runner details, plagiarism) once the worker/runners process the job.

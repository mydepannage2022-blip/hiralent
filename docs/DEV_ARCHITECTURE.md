# Dev Architecture & Local Run Baseline

This is the copy-paste runbook for standing up Hiralent **locally, end-to-end**, and proving it works with one authenticated request. It supersedes the earlier npm-based draft (Phase 0.8, Wave 0).

Toolchain is **pnpm only** (`pnpm@11.15.1`) — do not use `npm`/`yarn` (a stray `package-lock.json` breaks the single-lockfile gate). Commands below are shell-agnostic; on Windows use PowerShell or Git Bash.

---

## 1. Components & ports

| Component | Tech | Port | Needed for local run |
|---|---|---|---|
| Backend API | Node 18+/24, Express 5, Prisma | `5000` | **Yes** |
| Frontend | Next.js 15, React 19 | `3000` | Yes (UI) |
| One worker | BullMQ (`worker:matching`) | — | For queue/matching flows |
| Postgres | primary DB (Prisma) | `5432` | **Yes** (auth, dashboards) |
| Redis | BullMQ queues + pub/sub | `6379` | Workers + some queues |
| MinIO | S3-compatible object storage | `9000` / `9001` | Uploads (CV, docs) |
| MongoDB | secondary store | remote/skip | Optional locally (see §3) |

The critical auth path (signup → dashboard read) needs **only Postgres**. Redis is for the worker; MinIO for uploads; Mongo can be skipped in dev.

---

## 2. Stand up infra (Postgres + Redis + MinIO)

`docker-compose.yml` (repo root) now provisions all three. From the repo root:

```bash
docker compose up -d postgres redis minio      # start infra
docker compose --profile init up minio-init    # one-time: create the hiralent-uploads bucket
docker compose ps                               # all should be healthy
```

- **Local-dev credentials** are baked into the compose file (Postgres `postgres/huzaifa`, MinIO `minioadmin/minioadmin`) and match `backend/.env`. These are **local only** — never used in staging/prod.
- **Already run Postgres/Redis natively?** Then skip those services (their `5432`/`6379` ports would clash) — just start MinIO: `docker compose up -d minio`. This machine, for example, runs Postgres natively on 5432.
- MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`).

---

## 3. Backend: env, migrate, run

### 3a. Environment (`backend/.env`)
`backend/.env` is git-ignored (real secrets). Copy `backend/.env.example` if starting fresh. Keys that matter for the local run:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:huzaifa@localhost:5432/hiralent"
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=<any-non-empty-secret>
FORCE_SKIP_MONGO=1        # skip the boot-time Mongo connect (see below)
ENABLE_DEV_MINT=1         # local-only: enables /dev routes + tolerates SMTP failures at signup
```

- **`FORCE_SKIP_MONGO=1`** — `server.ts` connects to Mongo at boot. In dev a failed connect is non-fatal (it just warns), but the remote Atlas URI can add a slow timeout; setting this skips it cleanly. Set it unless you actually need Mongo-backed features locally.
- **`ENABLE_DEV_MINT=1`** — local-only flag. Enables the `/dev` helper routes and lets signup continue if the SMTP send fails. Never set in production (it also un-gates dev-only endpoints).

### 3b. Install, generate client, migrate
```bash
cd backend
pnpm install                       # runs `prisma generate` via postinstall
# First time only — create the database if it doesn't exist:
echo "CREATE DATABASE hiralent;" | pnpm exec prisma db execute \
  --url "postgresql://postgres:huzaifa@localhost:5432/postgres" --stdin
pnpm exec prisma migrate deploy    # applies all migrations (idempotent)
```

`prisma migrate deploy` is the reproducible path (no shadow DB needed — `schema.prisma` has no `shadowDatabaseUrl`, and `SHADOW_DATABASE_URL` stays commented in `.env`). Optional seed data: `pnpm exec prisma db seed`.

### 3c. Run
```bash
cd backend
pnpm dev            # nodemon + tsx src/server.ts
```
Expect: `🚀 Server listening on port 5000` (and a Mongo-skip line). Liveness/readiness probe:

```bash
curl http://localhost:5000/health     # -> {"status":"ok","db":"up",...}   (503 if DB down)
curl http://localhost:5000/           # -> "Backend running successfully"
```

---

## 4. Smoke test — one authenticated call

Auth uses **signup to obtain a token** — `login` is 2FA-mandatory and never returns a usable session token, so E2E uses signup. Signup issues a real 7-day JWT directly.

```bash
# 1. Signup (role must be one of: candidate | company_admin | admin | agency_admin)
curl -s -X POST http://localhost:5000/api/v1/auth/signup \
  -H "content-type: application/json" \
  -d '{"email":"me@local.test","password":"secret123","full_name":"Local Dev","role":"candidate"}'
# -> 201 { "user": {...}, "token": "<JWT>" }

# 2. Authenticated dashboard read
curl -s http://localhost:5000/api/v1/auth/me -H "authorization: Bearer <JWT>"
# -> 200 { "user": { "email":"me@local.test", ... } }

# 3. Guard check
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/auth/me
# -> 401
```

This whole path is automated by `hiralent-master-plan/tools/verify-local-run.mjs` (see §7).

---

## 5. Run one worker

Workers are BullMQ-based and need Redis (§2). Representative worker:

```bash
cd backend
pnpm worker:matching     # nodemon + tsx src/workers/matching-outbox.runner.ts
```
It should connect to Redis and idle without crashing. (Without Redis it logs repeated `ECONNREFUSED 127.0.0.1:6379` — start Redis first.)

> Note: `backend/docker-compose.workers.yml` runs the full worker fleet in containers but references `DATABASE_URL_DOCKER`, which is **not defined** in any `.env` — that compose file is out of scope for the local baseline; run workers with `pnpm worker:*` on the host instead.

---

## 6. Frontend

```bash
cd frontend
pnpm install
pnpm dev            # next dev -> http://localhost:3000
```
API base comes from `frontend/.env` → `NEXT_PUBLIC_BASE_URL=http://localhost:5000/api/v1`. (A few Google-OAuth code paths read a separate `NEXT_PUBLIC_API_URL` that isn't in `.env` and falls back to `http://localhost:5000` — tracked as R-27, harmless for the baseline.)

---

## 7. Verify (the full gate)

All checks live in `hiralent-master-plan/tools/`. Run them all with the aggregator:

```bash
node hiralent-master-plan/tools/run-all-verifiers.mjs              # full gate (needs infra up)
node hiralent-master-plan/tools/run-all-verifiers.mjs --skip-local # build/structural only, no infra
```

Key ones:
- **`verify-local-run.mjs`** — boots the backend on port 5099, polls `/health`, runs signup → `/me` (200) → anon (401). This is the Phase-0.8 DoD test. Needs Postgres up + migrations applied.
- `verify-backend-build.mjs` — `tsc` 0 errors + emits `dist/src/*.js`.
- `verify-frontend-build.mjs` — `tsc` 0 + `next build`.
- `verify-config-hygiene.mjs`, `verify-single-lockfile.mjs`, `verify-dead-code-cleanup.mjs`, etc. — hygiene/wiring gates.

---

## 8. Optional: coding-runner / SSE pipeline

For the candidate coding-submission flow (separate from auth), the backend exposes an SSE stream at `/api/v1/submissions/stream/:id`, backed by a run worker (`src/workers/run.worker.ts`) and the Python runner (`runner-python`, port `8002`). Set `RUNNER_HTTP_URL=http://127.0.0.1:8002` and run the runner + `pnpm worker:dev`. This path is documented in `docs/CODE_EXECUTION_ARCHITECTURE.md`.

---

Last verified: 2026-07-22 (Session 7 — Phase 0.8 local run baseline; signup→/me green against Postgres, full verifier gate 12/12).

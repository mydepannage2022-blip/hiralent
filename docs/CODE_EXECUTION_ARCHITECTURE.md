# Code Execution Architecture — Hiralent

**Last Updated:** December 9, 2025  
**Purpose:** Complete documentation of the code execution flow, including UI, backend orchestration, runner infrastructure, and today's UI refinements.

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Execution Flow](#execution-flow)
4. [Storage & State Management](#storage--state-management)
5. [Runner Infrastructure](#runner-infrastructure)
6. [Today's UI Refinements](#todays-ui-refinements)
7. [Dockerization Status & Recommendations](#dockerization-status--recommendations)

---

## Overview

Hiralent's code execution system allows candidates to:
- Write code in a Monaco-based editor with multi-file support
- Run code against test cases in a sandboxed environment
- View real-time execution results and submit solutions
- See results summarized on a dedicated results page

**Key Design Principles:**
- **Security-first:** All user code runs in isolated Docker containers with no network access, memory/CPU limits, and optional gVisor (runsc) runtime for kernel-level isolation
- **Multi-language support:** Python, JavaScript, TypeScript, Java, C++, C, Go, Ruby, C#
- **Flexible runner modes:** Docker (preferred), HTTP service, or local Python fallback
- **Real-time feedback:** Execution status streamed to frontend via EventSource/SSE

---

## Architecture Components

### 1. Frontend — Code Playground UI
**Location:** `frontend/src/components/Code-Runner-Frontend/CodeRunner.tsx` + `frontend/app/code-run/page.tsx`

**Features:**
- **Monaco Editor:** Multi-file editor with syntax highlighting, language switching per file
- **Question Panel:** Left sidebar showing problem statement (from URL params: `id`, `title`, `language`, `difficulty`) + Recent Runs history
- **Output Terminal:** Right panel displaying execution results (score, runtime, memory, test outputs)
- **Modals:** Settings (theme/font), Command Palette (Ctrl+K), Submit Confirmation
- **Keyboard shortcuts:** Run (Ctrl+Enter), Command Palette (Ctrl+K)

**State Management:**
- **localStorage keys:**
  - `codeRunner.files.v1` — file list with code
  - `codeRunner.active.v1` — active file ID
  - `codeRunner.history.v1` — recent runs
  - `codeRunner.prefs.v1` — theme, font size
- **URL params:** `id`, `title`, `language`, `difficulty` populate question card

**Run Flow:**
1. User clicks Run → `handleRun()` sends code + test cases to backend `/api/run` or `/api/submissions/:id/run`
2. Backend queues job, returns `submissionId`
3. Frontend opens EventSource to `/api/submissions/:id/events` to stream status updates
4. Results populate `result` state → displayed in Output Terminal
5. If score present, Submit button appears → opens confirmation modal → redirects to `/candidate/results?id=<submissionId>`

---

### 2. Backend — Orchestration & API
**Location:** `backend/src/` (Node.js/TypeScript, Express, Prisma, BullMQ)

**Key Services:**

#### a) Runner Dispatcher (`services/runner.dispatcher.ts`)
**Purpose:** Execute user code in a sandboxed environment

**Modes (configured via `RUNNER_MODE` env var):**
1. **Docker (default/auto):** Spawns ephemeral Docker containers for each test case
   - Creates temp workdir with `main.<ext>` + `tests.json`
   - Runs `docker run --rm -v <workdir>:/work --network none --memory <limit> --cpus <limit> <image> <command>`
   - Collects stdout/stderr, compares with expected output
   - Supports per-language images: `RUNNER_PY_IMAGE`, `RUNNER_TS_IMAGE`, `RUNNER_JAVA_IMAGE`, etc.
   - Optional gVisor runtime: `RUNNER_USE_RUNSC=1` adds `--runtime runsc`
   
2. **HTTP:** Delegates to external runner service (`RUNNER_HTTP_URL`)
   - POSTs `{ code, tests, language }` to HTTP endpoint
   - Validates response against `RunnerResultSchema` (Zod)
   
3. **Local Python fallback:** Runs `runner-python/entrypoint.py` on host
   - Only for Python; uses local Python installation
   - Not recommended for production (no isolation)

**Environment Variables:**
- `RUNNER_MODE` — `auto|docker|http` (default: `auto`)
- `RUNNER_DOCKER_IMAGE` — Default image (if not language-specific)
- `RUNNER_PY_IMAGE`, `RUNNER_TS_IMAGE`, etc. — Per-language images
- `RUNNER_TIMEOUT_MS` — Max execution time (default: 20000ms)
- `RUNNER_DOCKER_MEMORY` — Memory limit (default: `256m`)
- `RUNNER_DOCKER_CPUS` — CPU limit (default: `0.5`)
- `RUNNER_USE_RUNSC` — Use gVisor runtime (default: `0`)
- `TEST_TIMEOUT_S` — Per-test timeout (default: `2.0`)
- `RUNNER_HTTP_URL` — HTTP runner endpoint (if mode=http)

**Docker Command Example (Python):**
```bash
docker run --rm \
  -v /tmp/runner-xyz:/work \
  --network none \
  -e TEST_TIMEOUT_S=2.0 \
  --memory 256m \
  --cpus 0.5 \
  python:3.11-slim \
  sh -c "cat <<'EOF' | python /work/main.py
5 3
EOF"
```

**Output Comparison:**
- Uses `utils/outputNormalization.ts` to normalize whitespace/case
- Env vars: `RUNNER_STRICT_COMPARE`, `RUNNER_COMPARE_IGNORE_CASE`, `RUNNER_COMPARE_COLLAPSE_WHITESPACE`

---

#### b) Execution Service (`services/execution.service.ts`)
**Purpose:** High-level orchestration for grading submissions

**Flow:**
1. Fetch question → get test cases from DB
2. Call `dispatch_to_runner(code, testCases, timeout, language)`
3. Map runner results to DB schema (handle legacy `testsSummary` + new `results` format)
4. Calculate score: `(passedTests / totalTests) * 100`
5. Return `{ submissionId, score, results, runner, plagiarism }`

---

#### c) Run Worker (`workers/run.worker.ts`)
**Purpose:** BullMQ worker for async execution

**Flow:**
1. Consumes jobs from `run` queue
2. Calls `execution.service.run_submission_and_grade()`
3. Validates runner output against `RunnerResultSchema` (Zod)
4. Updates submission in DB (score, results, status)
5. Emits progress events via Redis streams (for SSE)

---

#### d) Submission Routes (`routes/submissions.ts`)
**Endpoints:**
- `POST /api/submissions` — Create submission, queue run job
- `GET /api/submissions/:id` — Get submission details
- `GET /api/submissions/:id/events` — SSE stream for real-time status
- `POST /api/submissions/:id/run` — Manually trigger re-run

---

### 3. Runner — Sandboxed Execution Environment
**Location:** `runner-python/` (Python-based entrypoint, Dockerized)

**Files:**
- `Dockerfile` — Multi-stage image (Python 3.11-slim, non-root user `runner`)
- `entrypoint.py` — Main runner script (reads `/work/main.py` + `/work/tests.json`, executes code, outputs JSON)
- `sandbox_exec.py` — Subprocess wrapper with timeout/resource limits
- `scoring.py` — Test comparison logic
- `http_service.py` — FastAPI-based HTTP runner (alternative to entrypoint)

**Docker Image:**
- Base: `python:3.11-slim`
- Non-root user: `runner` (UID 10001)
- Installed: `time`, `gosu`, `tini` (for signal handling)
- Healthcheck: Verifies `entrypoint.py` exists
- Entry: `tini -- python /opt/runner/entrypoint.py`

**Security Features:**
- Runs as non-root (`USER runner`)
- No network (`--network none`)
- Resource limits (`--memory`, `--cpus`)
- Optional gVisor (`--runtime runsc`) for kernel-level isolation
- Minimal dependencies (no compilers/shells in production)

**HTTP Service Mode:**
- Runs `http_service.py` with FastAPI
- Endpoint: `POST /run` with `{ code, tests, language }`
- Multi-language support: Python, JS, TS, Java, C++, Go, Ruby, C#
- Uses host toolchain (less isolated than Docker-per-test)

---

### 4. Results Page
**Location:** `frontend/app/candidate/results/page.tsx`

**Features:**
- Header: Success/completion icon + "Perfect!" or "Completed" title
- Question card: Shows problem title + language
- Score card: Visual score (gradient text + progress bar) + tests passed count
- Code display: User's submitted solution in dark terminal-style box
- Test results: Expandable list of passed/failed tests with outputs
- Actions: "Try Another Question" or "Back to Home"

**State:**
- Fetches submission via `/api/submissions/:id` (from URL param)
- Displays single-question results (not assessment-wide)

---

## Execution Flow

### Diagram
```
┌─────────────┐
│   Frontend  │ (CodeRunner.tsx)
│   Monaco    │
│   Editor    │
└──────┬──────┘
       │ 1. POST /api/submissions (code, questionId, language)
       ▼
┌─────────────────┐
│  Backend API    │ (Express + Prisma)
│  submissions.ts │
└──────┬──────────┘
       │ 2. Queue job in BullMQ
       ▼
┌──────────────────┐
│   BullMQ Queue   │ (Redis)
│   "run" queue    │
└──────┬───────────┘
       │ 3. Worker picks up job
       ▼
┌──────────────────┐
│   Run Worker     │ (run.worker.ts)
│   ├─execution.service
│   └─runner.dispatcher
└──────┬───────────┘
       │ 4. Spawn Docker container per test
       ▼
┌──────────────────────┐
│  Docker Container     │ (isolated, no network)
│  python:3.11-slim     │
│  Runs: main.py + test │
└──────┬───────────────┘
       │ 5. Collect stdout/stderr
       ▼
┌──────────────────┐
│  Output Compare   │ (outputNormalization.ts)
│  Grade tests      │
└──────┬────────────┘
       │ 6. Calculate score, update DB
       ▼
┌──────────────────┐
│  Redis Stream     │ (progress events)
└──────┬────────────┘
       │ 7. SSE to frontend
       ▼
┌─────────────┐
│  Frontend   │ (displays results in Output Terminal)
│  Result UI  │
└─────────────┘
```

### Step-by-Step
1. **User writes code** in Monaco editor (frontend)
2. **User clicks Run** → `handleRun()` calls backend API
3. **Backend creates submission record** in DB, queues job in BullMQ
4. **Worker picks up job** → fetches question test cases from DB
5. **Runner dispatcher creates temp workdir** with `main.<ext>` + `tests.json`
6. **For each test case:**
   - Spawns Docker container with code + test input
   - Captures stdout/stderr with timeout
   - Compares output to expected (normalized)
   - Records pass/fail
7. **Calculate score:** `(passed / total) * 100`
8. **Update DB** with results, emit progress event to Redis
9. **Frontend receives SSE update** → displays results in Output Terminal
10. **User clicks Submit** → confirmation modal → redirects to Results page

---

## Storage & State Management

### Frontend localStorage
- **`codeRunner.files.v1`** — Array of `{ id, name, language, code }`
- **`codeRunner.active.v1`** — Active file ID (string)
- **`codeRunner.history.v1`** — Recent runs `[{ name, status, createdAt }]`
- **`codeRunner.prefs.v1`** — `{ theme: 'dark'|'light', fontSize: number }`

### Backend Database (Prisma)
- **`Submission`** table:
  - `id`, `userId`, `questionId`, `assessmentId`
  - `code`, `language`, `score`, `status`
  - `results` (JSON: test outputs), `executionTime`, `memoryUsed`
  - `createdAt`, `updatedAt`
- **`Question`** table:
  - `id`, `title`, `description`, `difficulty`, `language`
  - `testCases` (JSON: `[{ input, expected_output }]`)

### Backend Queue (BullMQ + Redis)
- **`run` queue:** Execution jobs `{ submissionId, userId, questionId, code, language }`
- **Progress events:** Redis streams keyed by `submission:<id>:events`

---

## Runner Infrastructure

### Current State (What You Have)
✅ **Dockerized runner image:** `runner-python/Dockerfile` (Python 3.11-slim, non-root user, healthcheck)  
✅ **Multi-language support via Docker:** Per-test container spawning with language-specific images  
✅ **Security hardening:** `--network none`, memory/CPU limits, non-root user, optional gVisor  
✅ **Backend dispatcher:** `runner.dispatcher.ts` with Docker/HTTP/local modes  
✅ **HTTP runner service:** `http_service.py` (FastAPI) as alternative to per-test containers  
✅ **MinIO for uploads:** `docker-compose.yml` includes MinIO service  
⚠️ **Backend not Dockerized:** Backend runs on host (Node.js), not containerized  
⚠️ **Frontend not Dockerized:** Frontend runs on host (Next.js dev server), not containerized  

### Docker Infrastructure Diagram
```
┌─────────────────────────────────────────────────────────────┐
│  Host Machine (Development)                                  │
│                                                               │
│  ┌────────────────┐   ┌────────────────┐   ┌─────────────┐ │
│  │  Frontend      │   │  Backend       │   │   Redis     │ │
│  │  (Next.js)     │   │  (Node.js)     │   │  (host)     │ │
│  │  localhost:3000│   │  localhost:4000│   │  :6379      │ │
│  └────────────────┘   └───────┬────────┘   └─────────────┘ │
│                                │                              │
│                                │ Spawns ephemeral containers  │
│                                ▼                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Docker Engine                                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Container  │  │  Container  │  │  Container  │ │   │
│  │  │  Test 1     │  │  Test 2     │  │  Test 3     │ │   │
│  │  │  (Python)   │  │  (JS)       │  │  (Java)     │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  docker-compose.yml services:                         │   │
│  │  ┌─────────────┐                                      │   │
│  │  │  MinIO      │  (object storage for uploads)        │   │
│  │  │  :9000      │                                      │   │
│  │  └─────────────┘                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Today's UI Refinements

### Changes Made (December 9, 2025)

#### 1. **Theme Harmonization**
- **Gradient Background:** Changed from harsh dark-to-light blue to balanced `from-blue-50 via-indigo-50 to-blue-100`
- **Consistent Palette:** Unified indigo-600/blue-600 for primary actions, white cards with slate borders
- **Applied to:** Question preview page, Code Runner, Results page

#### 2. **Terminal Empty State**
- **Moved content to top-left** (was centered) for better UX
- **Enhanced visibility:** Indigo accents (`text-indigo-100`, `text-indigo-200`) on dark terminal
- **Added icon + text layout** for cleaner presentation

#### 3. **Submit Confirmation Modal**
- **Restyled to match Results page:** Light white surface (not dark), emerald badge, indigo CTA
- **Removed stray "0":** Simplified summary to show only Score + Tests (removed runtime row that displayed "0")
- **Better readability:** Slate text on white background

#### 4. **Results Page Header**
- **Centered "Perfect!" title** directly under icon using flex column
- **Improved contrast:** Changed title from `text-white` to `text-slate-900`, subtitle to `text-slate-600`
- **Brighter icon badges:** Emerald-100/yellow-100 backgrounds with borders

#### 5. **Question Card in Sidebar**
- **Always visible:** Removed conditional rendering (`questionId &&`), now shows fallback message when no question ID
- **Restored clean "énoncé" style:** White card, higher contrast text, subtle shadow
- **Better text hierarchy:** Larger title (`text-base`), darker text (`text-slate-900`)

#### 6. **Recent Runs History**
- **Added Clear button:** Red accent button to wipe history + localStorage
- **Neutral slate colors** for history items (was blue)
- **Maintained alongside Question card** in left sidebar

---

## Dockerization Status & Recommendations

### What's Already Dockerized ✅
1. **Runner execution containers** (ephemeral, per-test)
   - Python, JS, TS, Java, C++, Go, Ruby, C# images
   - Hardened with `--network none`, resource limits, non-root user
   
2. **MinIO** (object storage)
   - Running via `docker-compose.yml`

### What's NOT Dockerized ⚠️
1. **Backend Node.js API** (runs on host)
2. **Frontend Next.js** (runs on host dev server)
3. **Redis** (runs on host)
4. **Postgres** (likely runs on host or cloud)

---

### Recommendation: Do You Need to Dockerize More?

#### **Short Answer: NO for the runner itself, but YES for the backend/frontend if you want:**
- ✅ Consistent dev environments across team
- ✅ Easy local setup (`docker-compose up` for entire stack)
- ✅ CI/CD reproducibility
- ✅ Deployment simplicity (k8s, ECS, etc.)

#### **Why You DON'T Need Another Runner Container:**
- Your code execution is **already fully Dockerized** (ephemeral containers per test)
- Adding a "runner service" container would be redundant unless you want:
  - A persistent HTTP runner service (but you already have `http_service.py` for this)
  - To orchestrate multiple runner pools (overkill for current scale)

#### **Why You MIGHT Want to Dockerize Backend + Frontend:**

**Backend Containerization Benefits:**
1. **Reproducible builds:** Pin Node.js version, system deps (libvips, etc.)
2. **Easier CI/CD:** Build once, deploy anywhere (k8s, AWS ECS, Azure ACI)
3. **Local dev consistency:** `docker-compose up` brings up backend + Redis + MinIO + Postgres
4. **Environment isolation:** Avoid "works on my machine" issues

**Frontend Containerization Benefits:**
1. **Production builds:** Serve optimized Next.js static/SSR via Nginx or Node server
2. **CI/CD:** Build + push image, deploy to cloud (Vercel, k8s, etc.)
3. **Local dev:** Optional (Next.js dev server on host is fine for dev)

---

### Recommended Dockerization Plan

#### **Phase 1: Dockerize Backend (Priority: HIGH)**
**Why:** Backend orchestrates runner, needs consistent env, easy to containerize

**Steps:**
1. Create `backend/Dockerfile`:
   ```dockerfile
   FROM node:18-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npx prisma generate
   EXPOSE 4000
   CMD ["npm", "start"]
   ```

2. Update `docker-compose.yml` to add backend service:
   ```yaml
   backend:
     build: ./backend
     ports:
       - "4000:4000"
     environment:
       DATABASE_URL: postgresql://user:pass@postgres:5432/hiralent
       REDIS_URL: redis://redis:6379
       RUNNER_MODE: docker
     depends_on:
       - postgres
       - redis
       - minio
   ```

3. Add `postgres` and `redis` services to `docker-compose.yml`

4. Update backend to use Docker socket for spawning runner containers:
   - Mount `/var/run/docker.sock` into backend container
   - Or use Docker API client (no socket mount needed)

**Benefit:** `docker-compose up` brings up entire backend stack

---

#### **Phase 2: Dockerize Frontend (Priority: MEDIUM)**
**Why:** Production deployments, CI/CD, but dev server on host is fine for local dev

**Steps:**
1. Create `frontend/Dockerfile.dev` (for local dev):
   ```dockerfile
   FROM node:18-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["npm", "run", "dev"]
   ```

2. Create `frontend/Dockerfile` (for production):
   ```dockerfile
   FROM node:18-slim AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:18-slim
   WORKDIR /app
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/package*.json ./
   RUN npm ci --only=production
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. Add to `docker-compose.yml`:
   ```yaml
   frontend:
     build:
       context: ./frontend
       dockerfile: Dockerfile.dev
     ports:
       - "3000:3000"
     volumes:
       - ./frontend:/app
       - /app/node_modules
     depends_on:
       - backend
   ```

**Benefit:** Full stack in Docker for dev + prod

---

#### **Phase 3: CI/CD Pipeline (Priority: HIGH after Phase 1)**
**Why:** Automated builds, tests, image publishing

**Steps:**
1. Create `.github/workflows/build-runner.yml`:
   - Build `runner-python` image
   - Run smoke test (sample code + tests)
   - Push to GHCR/Docker Hub

2. Create `.github/workflows/build-backend.yml`:
   - Build backend image
   - Run Prisma migrations in test DB
   - Run integration tests
   - Push image

3. Add vulnerability scanning (Trivy, Snyk)

**Benefit:** Automated QA + deployment

---

### Summary Decision Matrix

| Component | Current State | Dockerize? | Priority | Reason |
|-----------|---------------|-----------|----------|--------|
| **Runner (per-test containers)** | ✅ Dockerized | ❌ NO | N/A | Already fully containerized |
| **Backend API** | ⚠️ Host | ✅ YES | **HIGH** | Reproducibility, CI/CD, deployment |
| **Frontend** | ⚠️ Host | ⚠️ Optional | MEDIUM | Dev server on host is fine; Docker for prod |
| **Redis** | ⚠️ Host | ✅ YES | MEDIUM | Add to docker-compose for local dev |
| **Postgres** | ⚠️ Host | ✅ YES | MEDIUM | Add to docker-compose for local dev |
| **MinIO** | ✅ Dockerized | ✅ Already | N/A | Already in docker-compose |

---

### Final Recommendation

**Action Plan:**
1. ✅ **Keep runner as-is** — it's already perfectly Dockerized (ephemeral containers per test)
2. 🎯 **Dockerize backend** — priority HIGH (reproducible builds, CI/CD, easy deployment)
3. ⚠️ **Optionally Dockerize frontend** — priority MEDIUM (useful for prod, not critical for dev)
4. 🎯 **Add CI/CD workflows** — priority HIGH (automated builds, tests, security scans)

**You already have the most important part Dockerized (runner isolation)** — now focus on making the orchestration layer (backend) containerized for easier deployment and team onboarding.

---

## Quick Start Commands

### Development (Current Setup — Host-based)
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Worker
cd backend
npm run worker:dev

# Terminal 4: HTTP Runner (optional)
cd runner-python
python http_service.py

# Terminal 5: Frontend
cd frontend
npm run dev

# Terminal 6: MinIO
docker-compose up minio
```

### Development (After Dockerization — Recommended)
```bash
# Single command brings up entire stack
docker-compose up

# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# MinIO: http://localhost:9001
```

---

## Environment Variables Reference

### Backend
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `RUNNER_MODE` — `auto|docker|http` (default: `auto`)
- `RUNNER_DOCKER_IMAGE` — Default runner image
- `RUNNER_PY_IMAGE`, `RUNNER_TS_IMAGE`, etc. — Language-specific images
- `RUNNER_TIMEOUT_MS` — Max execution time (default: 20000)
- `RUNNER_DOCKER_MEMORY` — Container memory limit (default: `256m`)
- `RUNNER_DOCKER_CPUS` — Container CPU limit (default: `0.5`)
- `RUNNER_USE_RUNSC` — Use gVisor (default: `0`)
- `TEST_TIMEOUT_S` — Per-test timeout (default: `2.0`)
- `RUNNER_HTTP_URL` — HTTP runner endpoint (if mode=http)
- `RUNNER_STRICT_COMPARE` — Strict output comparison (default: `0`)
- `RUNNER_COMPARE_IGNORE_CASE` — Case-insensitive comparison (default: `0`)
- `RUNNER_COMPARE_COLLAPSE_WHITESPACE` — Collapse whitespace (default: `1`)

### Frontend
- `NEXT_PUBLIC_API_URL` — Backend API URL (default: `http://localhost:4000`)

---

## Security Notes

1. **Runner isolation:** All user code runs in ephemeral Docker containers with:
   - No network access (`--network none`)
   - Memory/CPU limits
   - Non-root user (`runner`)
   - Optional gVisor (`--runtime runsc`) for kernel-level isolation

2. **Input validation:** All user inputs (code, test cases) validated via Zod schemas

3. **Rate limiting:** Recommended for production (not currently implemented)

4. **Secret management:** Use Docker secrets or k8s secrets for DB/Redis credentials

5. **Image scanning:** Recommended CI step (Trivy, Snyk) for runner images

---

## Troubleshooting

### "Docker not available" error
- Ensure Docker daemon is running
- Check `docker --version` in terminal
- Set `RUNNER_MODE=http` to use HTTP runner as fallback

### "Runner timeout" error
- Increase `RUNNER_TIMEOUT_MS` (default: 20000)
- Check container resource limits (`RUNNER_DOCKER_MEMORY`, `RUNNER_DOCKER_CPUS`)

### "No submission data found" on Results page
- Verify submission exists in DB
- Check URL param `?id=<submissionId>`
- Ensure backend SSE stream is working

### Tests failing unexpectedly
- Check output normalization settings (`RUNNER_STRICT_COMPARE`, etc.)
- View raw output in backend logs for debugging
- Compare expected vs actual in normalized form

---


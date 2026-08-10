# 00 — Current State (Honest Baseline)

> This is the ground truth as of the 2026-07-20 audit, **before any change**. Everything below was verified by reading the code, not assumed. Keep this file frozen as the "before" reference; we measure progress against it.

---

## 1. What Hiralent is

An AI-powered recruitment platform (**Hiralent** — brand strings renamed from the legacy "Talenta" in Wave 0 / Session 1; see PROGRESS-LOG) with four user roles — **candidate, company/recruiter, agency (relocation/visa), admin/superadmin** — plus a coding-assessment engine and an AI-interview engine.

**Architecture (microservices):**

| Layer | Tech | Port | Notes |
|---|---|---|---|
| Backend API | Node.js, Express 5, TypeScript, Prisma | **5000** | Real entry = `src/server.ts` (`index.ts` is dead) |
| Frontend | Next.js 15, React 19, TanStack Query, Tailwind v4 | 3000 | Vercel-targeted |
| ai-service | FastAPI (Gemini 2.5-flash) | 8000 | Question gen / scraping / vetting — largest, messiest |
| assessment-ai-service | FastAPI + LangChain (Gemini 2.5-flash) | 8001 | JD parse + chatbot |
| document-validator-service | FastAPI (Tesseract+EasyOCR+Gemini/OpenAI) | 8002 | OCR doc validation |
| talent job-creation-ai | FastAPI (Gemini 2.0-flash) | 8003 | JD generation |
| talent scraping-candidates | FastAPI (no LLM) | 8010 | GitHub/Greenhouse/Lever sourcing |
| talent matching-candidate-job | FastAPI + Qdrant + worker | 8011 | **Best-built service** |
| sandbox-service | gRPC | 50054 | ⚪ retired (W4-S1) → folded onto runner-python |
| plagiarism-service | gRPC | 50055 | ⚪ retired & de-scoped (W4-S2) → `not_computed` signal |
| runner-python | Docker one-shot executor | — | The **real** code executor |
| Data/infra | Postgres, MongoDB, Redis, MinIO, Qdrant, Pinecone/Chroma | — | Postgres = source of truth |

**DB:** Prisma schema ≈ 103 models, 35 enums, 56 migrations. Postgres holds all app data. **MongoDB is connected at boot but stores zero application data** (unused dependency).

---

## 2. The headline verdict

- Features are **~75–80% built**, but **launch-readiness is ~40%**.
- **It does not build in production form today.** Frontend `next build` fails; backend has 153 type errors masked by loose config.
- **It cannot handle real load** — it would collapse in the low hundreds of concurrent users, far short of the 2k RPS / 10k-user (→100k) target.
- **Security is not production-safe** — multiple critical issues (forgeable auth, committed key, code-execution escape).
- **Payments are entirely fake.**
- **It has never been tested end-to-end**, and several wired-up features silently fail.

What IS genuinely solid: the transactional-outbox workers, the auth module (OAuth + TOTP 2FA), the matching service, the AI-interview + Monaco code-runner frontends, and runner-python's isolation. The domain design is sound; execution and wiring are the problem.

---

## 3. Build & tooling (🔴 blocks everything)

- **Backend: 153 TS errors** (`tsc --noEmit`), hidden by `strict:false` + `noEmitOnError:false` + `tsx` transpile-only. Mostly untyped Express `req` access and `unknown` results. Hot files: `question.controller.ts` (47), `questions/question.routes.ts` (27), `candidate.controller.ts` (13).
- **Frontend: 222 TS errors** under strict `next build` (no `ignoreBuildErrors`). ~157 are phantom `next/*` "missing declaration" from broken installs; ~65 are genuine app errors that alone block the build.
- **Dual lockfiles** (`package-lock.json` + `pnpm-lock.yaml`) at root/backend/frontend → non-reproducible installs.
- **Missing frontend deps:** `country-list`, `iso-639-1` (only in stray root `package.json`). **Missing local modules:** `src/lib/queryClient`, `message/message.types`.
- **Prisma client never generated** in backend → module-not-found + property errors.
- **Root `package.json`** is a junk dep-bag (no name/version/scripts, mixes frontend+backend libs).
- **No `.env.example`** for backend (~132 vars), frontend, ai-service, assessment, or talent services.
- **No JS/TS test framework** (backend `test` = `echo … exit 1`; `__tests__` are orphan scripts). Only Python has `pytest.ini` (assessment service).

## 4. Security (🔴 several Critical)

- **C1 — JWT_SECRET = `yourSuperSecretKey`** → anyone can forge tokens for any user/role (privilege escalation).
- **C2 — Live Gemini API key committed** in `ai-service/app/gemini_service.py:47` (git-tracked). Must rotate/revoke.
- **C3 — Code-execution can hit the host.** `sandbox-service`/`plagiarism-service` are placeholder stubs; `runner.dispatcher.ts` falls back to running candidate code **directly on the backend host** if Docker is absent → RCE. The `runner-python/http_service.py` stub also runs arbitrary code unauthenticated.
- **H — Unauthenticated endpoints:** document-validation webhook (spoof KYC), `POST /api/ocr` (unauth upload + heavy processing), submission read/stream + `POST /submissions` (IDOR + spoof userId).
- **H — Internal AI services** bind `0.0.0.0` with no app-layer auth.
- **H — CVs (PII) served static** from `/uploads` with no auth (GDPR).
- **M — No security headers** (dep is `@fastify/helmet`, wrong framework; not applied). Rate limiting only on auth routes. MinIO `minioadmin/minioadmin`. 7-day tokens, no rotation; `checkAuth` defaults missing `session_id` to `'bypass'`. Internal bearer token logged in cleartext. `Math.random()` used for a temp password.
- **M — Prompt-injection surface:** scraped web content → Gemini (ai-service); OCR text → Gemini with safety filters `BLOCK_NONE` (doc-validator). _→ **Addressed W4-S2 (R-34):** shared `prompt_guard` fences+isolates untrusted text at every Gemini site; doc-validator `BLOCK_NONE` → `BLOCK_ONLY_HIGH` (env-tunable). Guarded by `verify-ai-content-safety.mjs`._
- **Prod-reachable mock:** `mockAssessment.routes` ("simulate scoring") mounted unconditionally; dev-only dummy-admin middleware exists.

## 5. Scalability (🔴 collapses well before target)

- **88 `new PrismaClient()` across 85 files** (singleton exists but unused) → one instance can open hundreds of connections vs Postgres default 100. **First thing to break.** No PgBouncer / `connection_limit`.
- **Code runner spawns one Docker container per test case** and recompiles each time; **BullMQ workers run at concurrency = 1**.
- **Zero read caching** (Redis only for BullMQ/pubsub); no HTTP cache headers.
- **Python AI services block the event loop** on synchronous Gemini calls; single uvicorn worker each.
- **AI clients:** timeouts only (some none), **no retries, no circuit breakers**, called **inline in the request path** (a slow AI service ties up Node handlers 20–30s → cascade).
- **Not horizontally scalable:** Socket.IO has no Redis adapter; SSE `push.ts` is in-process; in-memory queue fallback; MemoryStore rate limiter; cron runs on every instance (no leader election); uploads on local disk.
- **~153/155 `findMany` calls have no pagination.**
- **Missing DB indexes** on hot paths: `UsageAnalytics`, `Message`, `CommunicationLog`, `CodeSubmission`, `AdminAuditLog` (zero indexes), and many `candidate_id`/`company_id`/`agency_id` FKs.

## 6. Correctness & wiring (🟡 "shows but doesn't work")

- Admin **Agencies** page reads `localStorage.adminToken` (never set) → **Bearer null** → whole agency-verification screen 401s.
- `${AI_SERVICE_URL}/resume/extract` has **no implementation** → resume autofill 404s.
- **User session-management router never mounted** ("sign out other devices" 404s).
- **Doc-validation webhook** default port 4000 vs backend 5000 → deep-validation results **silently lost** (payload shape is otherwise correct).
- `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_BASE_URL` conflict — **no single value satisfies all consumers**.
- Socket.IO emits `reaction_added`/`message_deleted`/`message_read` that the **frontend never listens to** (no live update).
- **Inconsistent response envelopes** (`{success,data}` vs raw) → `undefined` bugs without network errors.
- **No global error handler / 404 handler wired**; `errorHandler.middleware.ts` exists but unused.
- **Health route not mounted** — probes hit `/` (always 200 even if DB down).

## 7. Reliability & observability (🔴/🟡)

- **No `uncaughtException`/`unhandledRejection`/SIGTERM handlers; no graceful shutdown.** Restart severs in-flight requests, kills workers mid-job; a submission marked `RUNNING` before execution gets **stuck RUNNING forever** (no reaper).
- **In-memory queues/job stores** (runs, verification, assessment fallback; doc-validator `validation_jobs` dict) → **lost on restart**.
- **BullMQ `runs` queue `attempts:1, removeOnFail:true`** → jobs dropped on any transient failure, no DLQ.
- **Metrics collected but no `/metrics` endpoint** (write-only registry). No Sentry/APM.
- **~1371 `console.*` calls**; structured pino logger used in only 2 files; no correlation IDs.
- **Internal bearer token logged** in `internalAuth.middleware.ts`.
- **`sendEmail` swallows all errors** → signup/invite emails silently never arrive.
- **Mongo hard `process.exit(1)`** on boot failure in prod, despite storing no data.

## 8. Deployment (🔴 not deployable as-is)

- **No Dockerfile for the backend API or the frontend** — the two core services can't be containerized. Only `backend/Dockerfile.workers` exists.
- **No single orchestration** brings up the full stack. **No Postgres or canonical Redis in any compose**; Redis fragmented across 4 ports (conflicts).
- **`host.docker.internal` + hardcoded `localhost`** (`http://localhost:8000` ~18×, `127.0.0.1:9000`, `localhost:3000` email links ~12×) in backend source → breaks outside Docker Desktop / on staging.
- **Secrets baked into images** (`.dockerignore` omits `.env` for backend + ai-service; doc-validator has none).
- ~~**sandbox-service & plagiarism-service have no Dockerfile at all**~~ — moot: both **retired** (sandbox W4-S1 → runner-python; plagiarism W4-S2 → de-scoped `not_computed`). The whole `python-services/` dir is gone; ai-service vetting now uses the hardened runner-python HTTP runner.
- **CI/CD:** only `build-runner.yml`; no build/test/deploy/migrate pipeline for backend/frontend.
- **No reverse proxy / TLS / domain routing.** CORS allowlist hardcoded (staging origin rejected).
- **No migration step** in any container/compose (`Dockerfile.workers` only runs `prisma generate`).
- **No superadmin / role-permission seed** → a fresh DB has no admin access.
- `firebase.ts` calls `initializeApp` at import → **crashes boot** if Firebase env missing.
- `backend/.env` contains a corrupt `[object Promise]` line and `SHADOW_DATABASE_URL=${DATABASE_URL}` (dotenv won't expand; and shadow=primary means `migrate dev` would **wipe the primary DB**).

## 9. Fake / hollow / dead (must be finished or removed)

- **Payments:** `StripeGateway.ts` / `PayPalGateway.ts` never call any SDK; fabricate `mock_session_*` and `checkout.stripe.com/...` URLs; webhooks return `mock.payment.succeeded`. Frontend `payment/success` trusts the client with no server verification.
- **Per-role dead-ends:** company `postjob` Publish = `console.log`; `manage-hiring` = "Comming Soon"; `discover` = hardcoded cards; `public-profile/[id]` static; external-candidate **Invite** = `// TODO`. Admin sidebar **Analytics / Security-Log / Admins / Settings** → 404 (no pages). Candidate `analytics` = "coming soon"; `code-run` demo uses `mockQuestions`. Agency settings notification prefs not persisted (no table).
- **Verification signals** (`whois`/`website`/`linkedin`): ✅ **W4-S3** — `whois` real (RDAP), `website` real (SSRF-guarded cheerio scrape), `linkedin` honest empty gate; scraped text now R-34-fenced before the onboarding LLM; `file.ts` S3 fetch real. (The separate `verification.worker` "simulate" path + `registry` adapters remain mocked — out of this slice.) Assessment-ai-service Wafaa/Youssra **gRPC client stubs removed** (dead; real seam is Node HTTP/webhook).
- **Redundant subsystems:** `Question` vs `QuestionBank` (dead); 4 assessment systems; 2 scoring systems; 2 chat stores (`ChatHistory` dead). Dead tables: `QuestionBank`, `ChatHistory`. ✅ **W4-S4 (Consolidation A — Questions + Chat, R-37)** — `QuestionBank`/`ChatHistory` tables dropped (W2-S6); deleted the dead `QuestionGenerator.service.ts` + commented `mockQuestionService.ts` (canonical = `QuestionService`→`prisma.question`, live generator `aiQuestionGenerationService`); deleted both orphaned chat `message/mockData.ts` (shells already on the real API). Locked by `verify-subsystem-consolidation.mjs` (gate 40→41) + `verify-session-realtime.mjs`. **Still open → Consolidation B:** the 4 assessment flows + 2–3 scoring paths.
- **Dead code/files:** `backend/src/index.ts`, unmounted `health.routes.ts`, duplicate `scraping.scheduler.ts`, `ai-service/app/main_backup.py`, unmounted `ai-service/app/api/routes.py`, frontend orphaned `admin-auth.ts`/`api-client.ts`, second `ReactQueryProvider.tsx`, `backups-files-folders/**`, `test-signup.json`, `dev.db`.
- **Dependency debt:** `bcrypt` + `bcryptjs`; `redis` + `ioredis`; deprecated `crypto` pkg; `@fastify/helmet` in Express; two Pinecone clients; `zod` v3 (backend) vs v4 (frontend); `assessment-ai-service/requirements.txt` is UTF-16; `google-generativeai` at 3 versions; Pydantic v1 vs v2 split.

---

## 10. What's genuinely good (keep & build on)

- Transactional-outbox workers (`matching-outbox`, `jobApplication-outbox`, `assessment-outbox`) — resilient async.
- Auth module — Google OAuth + TOTP 2FA + recovery codes, clean layering.
- `matching-candidate-job` service — Qdrant + Redis queue + DLQ + retry + backend writeback.
- AI-interview frontend (proctoring: face/phone/camera, TTS/STT, recording) and Monaco code-runner (SSE streaming).
- `runner-python` batch executor — non-root, `--network none`, resource limits, optional gVisor.
- `candidateRanking.service.ts` — matching precomputed into `JobRecommendation`, read paginated with `select`.
- Overall domain modeling and role separation are coherent.

> Full detail for each area lives in the `matrices/` files and is turned into actionable work in the `waves/` files. Risks are ranked in [`01-RISK-REGISTER.md`](01-RISK-REGISTER.md).

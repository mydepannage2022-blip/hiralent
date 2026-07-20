# Wave 3 — Core Correctness & Wiring

> **Goal:** fix the silent-failure bugs — the "it shows but doesn't work" class — plus the missing error/health backbone, so the platform behaves predictably. **Runs after Wave 2.**
>
> **Pillars advanced:** P3 (Correctness), P6 (baseline reliability), P5 (env-driven URLs).
> **Risks closed:** R-22, R-24, R-25, R-26, R-27, R-36 · **starts:** R-13 (env-drive URLs), R-32 (email surfacing).
> **Entry state:** admin screen sends Bearer null, dangling/unmounted routes, wrong ports, env-var conflict, no global error handler, health route unmounted, inconsistent envelopes.

---

## Phase 3.1 — Fix the concrete wiring bugs
- [ ] Admin **Agencies** page: read the correct token key (`sessionToken`), not `adminToken` → fixes all agency approve/reject/list 401s. (R-22)
- [ ] Fix or implement `${AI_SERVICE_URL}/resume/extract` — either point to the real resume-extraction route or implement it in the ai-service; resume autofill must work. (R-24)
- [ ] Mount the **user session-management router** (`session.routes.ts`) at `/api/v1/auth/sessions` (replace the accidental `authRoutes` re-mount) → "sign out other devices" works. (R-25)
- [ ] Fix the **doc-validation webhook** callback URL/port (backend is 5000, not 4000); confirm end-to-end deep-validation result delivery. (R-26)

## Phase 3.2 — Unify frontend API configuration
- [ ] Collapse `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_BASE_URL` into **one** convention (decide whether the value includes `/api/v1`), update every consumer + the orphaned admin clients; one central client. (R-27)
- [ ] Replace scattered inline `fetch(${...})` and hardcoded `http://localhost:5000` call sites with the central client. (supports R-13, P4)

## Phase 3.3 — Make inter-service URLs env-driven (staging-ready)
- [ ] Replace hardcoded `http://localhost:8000` (question.controller ~18×), `127.0.0.1:9000` (case controller MinIO), and `localhost:3000` email/redirect links (~12×) with env config. (R-13)
- [ ] Route every backend→python call through the client factory using env base URLs (no `host.docker.internal` in source).

## Phase 3.4 — Error handling & health backbone
- [ ] Wire the central **`errorHandler` middleware** + a 404 handler in `app.ts`; standardize on **one response envelope** and typed error classes; migrate ad-hoc try/catch to it. (R-36)
- [ ] Mount **`health.routes.ts`** with liveness + readiness (Postgres/Redis/Mongo-if-used) so probes are meaningful. (supports P6)
- [ ] Make `sendEmail` surface failures (return/throw) so signup/invite flows can react + log. (R-32)

## Phase 3.5 — Realtime contract fixes
- [ ] Subscribe the frontend to the emitted-but-unhandled Socket.IO events (`reaction_added/removed`, `message_deleted`, `message_read`, `*_success`) so reactions/deletes/read-receipts update live. (R-36)

## Phase 3.6 — Response-shape consistency
- [ ] Normalize backend responses to the single envelope; fix client sites that read `res.data.data`/`res.data.profile` off endpoints returning top-level objects. (R-36)

---

## Exit criteria
- ✅ Admin agency verify/approve/reject fully works; resume autofill works; "sign out other devices" works; deep-validation results reach the backend.
- ✅ One frontend API base-URL convention; a single central client; no hardcoded service/email URLs in source (all env-driven).
- ✅ Central error handler + 404 handler live; consistent error/response envelope.
- ✅ `/health` + `/health/ready` mounted and truthful; email failures are visible, not swallowed.
- ✅ Reactions/deletes/read-receipts update in realtime.
- ✅ A pass over the canonical journeys shows no silent dead-ends from this class.
- ✅ PROGRESS-LOG updated per change.

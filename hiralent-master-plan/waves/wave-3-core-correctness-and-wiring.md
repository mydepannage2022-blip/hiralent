# Wave 3 — Core Correctness & Wiring

> **Goal:** fix the silent-failure bugs — the "it shows but doesn't work" class — plus the missing error/health backbone, so the platform behaves predictably. **Runs after Wave 2.**
>
> **Pillars advanced:** P3 (Correctness), P6 (baseline reliability), P5 (env-driven URLs).
> **Risks closed:** R-22, R-24, R-25, R-26, R-27, R-36 · **starts:** R-13 (env-drive URLs), R-32 (email surfacing).
> **Entry state:** admin screen sends Bearer null, dangling/unmounted routes, wrong ports, env-var conflict, no global error handler, health route unmounted, inconsistent envelopes.

---

## Phase 3.1 — Fix the concrete wiring bugs
- [x] Admin **Agencies** page: read the correct token key (`sessionToken`), not `adminToken` → fixes all agency approve/reject/list 401s. (R-22) — **done Session 7 (2026-08-04)**; 4 sites repointed; `verify-wave3-e2e.mjs` [J1] approves a pending agency (200) with the session token, no-token → 401.
- [x] Fix or implement `${AI_SERVICE_URL}/resume/extract` (R-24) — **done Session 7 (2026-08-04)**; the dangling caller was **dead code** (zero call-sites). Real autofill runs in-process via `extractSkillsFromText` (`lib/openai.ts`); removed the dead helper. `verify-wave3-e2e.mjs` [J2]: autofill-preview route mounted + guarded (real endpoint, not the dead-end).
- [x] Mount the **user session-management router** (`session.routes.ts`) at `/api/v1/auth/sessions` (replace the accidental `authRoutes` re-mount) → "sign out other devices" works. (R-25) — **done Session 4 (2026-08-03)**; `app.ts` now mounts `sessionRoutes` (was re-mounting `authRoutes`). Frontend was already complete (`DevicesAccount.tsx` + `auth.queries.ts` + `auth.api.ts`); verified live: terminate-others → revoked session's token 401, current session 200.
- [x] Fix the **doc-validation webhook** callback URL/port (backend is 5000, not 4000); confirm end-to-end deep-validation result delivery. (R-26) — **done Session 7 (2026-08-04)**; callback built from `getBackendUrl()` (:5000, appUrls.ts), receiver mounted with `internalAuth`. `verify-wave3-e2e.mjs` [J5]: no-header → 401, wrong token → 403, correct token → 200 (result reaches backend).

## Phase 3.2 — Unify frontend API configuration
- [x] Collapse `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_BASE_URL` into **one** convention (decide whether the value includes `/api/v1`), update every consumer + the orphaned admin clients; one central client. (R-27) — **done Session 6 (2026-08-04)**; canonical `NEXT_PUBLIC_API_URL` bare host + resolver `lib/config/api.ts`; `verify-api-config.mjs`.
- [x] Replace scattered inline `fetch(${...})` and hardcoded `http://localhost:5000` call sites with the central client. (supports R-13, P4) — **done Session 6**; ~72 files / ~138 sites repointed (`src` + `app`), grep-gate widened to whole `frontend/`.

## Phase 3.3 — Make inter-service URLs env-driven (staging-ready)
- [x] Replace hardcoded `http://localhost:8000` (question.controller ~18×), `127.0.0.1:9000` (case controller MinIO), and `localhost:3000` email/redirect links (~12×) with env config. (R-13) — **done Session 6**; question.controller AI fetches env-driven, `appUrls.ts` centralises FE/BE URLs; MinIO/`host.docker.internal` already clean (audit-confirmed). Container/host wiring → Wave 8.
- [x] Route every backend→python call through the client factory using env base URLs (no `host.docker.internal` in source). — **done Session 6** (env-base URLs; no `host.docker.internal` in BE source).

## Phase 3.4 — Error handling & health backbone  ✅ **done — Session 1 (2026-08-01)**
- [x] Wire the central **`errorHandler` middleware** + a 404 handler in `app.ts`; standardize on **one response envelope** and typed error classes; migrate ad-hoc try/catch to it. (R-36) — `errors/httpErrors.ts` (typed `AppError` classes) + `utils/apiResponse.ts` (`{success,data}`/`{success,error}`); `errorHandler`+`notFoundHandler` mounted terminal in `app.ts` (Express-5 async rejections auto-forward — **no stack/hang, no prod leak**). Auth slice migrated as the smoke consumer; **remaining controllers → per-slice S2–S6 (Phase 3.6).**
- [x] Mount **`health.routes.ts`** with liveness + readiness so probes are meaningful. (supports P6) — `/health` (liveness+DB, already mounted) kept as-is; **added `/health/ready`** readiness in the standard envelope (Postgres only — Mongo removed R-33; Redis is not a hard readiness dep).
- [x] Make `sendEmail` surface failures (return/throw) so signup/invite flows can react + log. (R-32) — `email.util.ts` returns `{delivered,error?}` + error-level log (no more swallow); `signup` surfaces `emailDelivered` and stays 201.
  - *Verified:* new `hiralent-master-plan/tools/verify-error-envelope.mjs` (throwing→500 envelope sync+async, 404 envelope, `/health`+`/health/ready` up→200 / down→503, signup envelope + `emailDelivered:false`, prod stack-suppression) — fail-proved teeth; every auth-touching gate verifier re-run green after the envelope wrap.

## Phase 3.5 — Realtime contract fixes  ✅ **done — Session 4 (2026-08-03)**
- [x] Subscribe the frontend to the emitted-but-unhandled Socket.IO events so reactions/deletes/read-receipts update live. (R-36) — **Revised premise:** `reaction_added/removed` + `message_deleted` were *already* live-wired in all three ChatShells; the genuinely-unhandled event was **`message_read`**. Consolidated all conversation listeners into one shared hook `frontend/src/hooks/useChatSocketEvents.ts` (candidate/company/agency shells now call it); added **read-receipts** — emit `mark_messages_read` on view + `message_read` listener + `is_read/read_at` → `LegacyMessage.read` → **✓/✓✓ checkmark UI** on `TextMessage/FileMessage/MediaMessage/VoiceMessage` (sender's own bubbles). Backend `socket.messaging.ts` now scopes `message_read` to the conversation room (was global broadcast). `markSocketRead(ids, conversationId)`. `*_success` actor-confirmations left as-is (optimistic local state already covers them).
  - *Verified:* new `hiralent-master-plan/tools/verify-session-realtime.mjs` (INFRA) — one boot, two `socket.io-client` clients sharing a conversation: reaction / read-receipt / delete round-trips assert live; **also carries the R-25 revoke proof**. Fail-proved (broke route → RED; static + runtime teeth). Added to `run-all-verifiers` (gate 34→35).

## Phase 3.6 — Response-shape consistency
- [x] Normalize backend responses to the single envelope; fix client sites that read `res.data.data`/`res.data.profile` off endpoints returning top-level objects. (R-36) — **canonical-journey slice done Session 7 (2026-08-04)**: `admin.agency` normalized to `sendSuccess`+typed errors; the confirmed frontend envelope mis-reads on the already-normalized auth endpoints fixed (silent-logout `refresh.ts` bug + login/signup/2FA/onboarding/google-callback reader cluster) + shared `extractApiError`; proven no-silent-dead-end by `verify-wave3-e2e.mjs`. **Long tail (~53 non-journey controllers + their FE readers — search/OCR/invites, admin company-verification `{ok}`, session/message controllers) carried forward under R-36** (journey-scoped, user-approved).

---

## Exit criteria
- ✅ Admin agency verify/approve/reject fully works; resume autofill works; "sign out other devices" works; deep-validation results reach the backend.
- ✅ One frontend API base-URL convention; a single central client; no hardcoded service/email URLs in source (all env-driven).
- ✅ Central error handler + 404 handler live; consistent error/response envelope.
- ✅ `/health` + `/health/ready` mounted and truthful; email failures are visible, not swallowed.
- ✅ Reactions/deletes/read-receipts update in realtime.
- ✅ A pass over the canonical journeys shows no silent dead-ends from this class.
- ✅ PROGRESS-LOG updated per change.

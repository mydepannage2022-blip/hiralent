# Wave 1 — Security Hardening

> **Goal:** close every Critical/High security hole so the platform is safe to expose. No feature work — just make what exists safe. **Runs after Wave 0 (a clean build) is verified.**
>
> **Pillar advanced:** P1 (Security).
> **Risks closed:** R-01, R-02, R-03 (lock the path), R-08, R-09, R-10, R-11, R-23, R-28, R-29 · **starts:** R-14 (rotate now, image fix in Wave 8).
> **Entry state:** default JWT secret, committed key, unguarded endpoints, host-exec fallback, no headers/rate-limit, prod-reachable mocks.

---

## Phase 1.1 — Secrets rotation (do first, treat all as compromised)
> **Session 9 (2026-07-23):** code half **DONE + verified**; provider half is **pending on the user** (see `runbooks/secret-rotation.md` Part B). Full detail in PROGRESS-LOG.
- [x] Generate a high-entropy `JWT_SECRET` (and confirm `ADMIN_JWT_SECRET` is strong); invalidate all existing tokens. (R-01)
  - _Both rotated to 288-bit values; the `'fallback-secret-change-this'` literal removed from **both** `admin.auth.service.ts` and `adminAuth.middleware.ts` (it made superadmin tokens forgeable when the env was unset). New `config/requireEnv.ts` + `assertCoreSecrets()` in `server.ts` makes a missing core secret crash at boot — green **and** red cases proven by `verify-secrets-hygiene.mjs`._
- [x] **Remove the hardcoded fallback** in `ai-service/app/gemini_service.py:47`; load only from env. (R-02)
  - [ ] **Revoke + rotate the key itself at Google AI Studio — USER ACTION, still outstanding.** The committed key stays live until this is done. Steps + the "old key → 403" check: `runbooks/secret-rotation.md` §B1. Three distinct Gemini keys are in play (the committed literal, `ai-service/.env`, and `assessment-ai-service/.env`'s `GOOGLE_API_KEY`).
- [x] Self-issued credentials rotated: `INTERNAL_SERVICE_KEY`, `BACKEND_INTERNAL_TOKEN` (both were absent from `backend/.env`), `INTERNAL_API_TOKEN`. Weak defaults removed everywhere — `super-secret-internal-token` (assessment config **and** its compose file), `minioadmin` (document-validator config, three `.env.example`s, and a fully hardcoded `S3Client` found in `candidate.case.controller.ts`), Pinecone's `|| ''`. Duplicate `lib/minio.ts` client deleted in favour of the shared `lib/s3.ts`. Secret-value `console.log` removed from `matching-outbox.runner.ts`. (R-02, R-14)
  - [ ] **Provider-held credentials — USER ACTION, still outstanding:** Pinecone, Cloudinary, SMTP, Firebase private key, and any shared/staging/prod MinIO. `runbooks/secret-rotation.md` §B2–B6. (Root `docker-compose.yml`'s MinIO creds are deliberately unchanged — local-only, per `docs/DEV_ARCHITECTURE.md`.)
- [x] Add secret scanning (gitleaks/trufflehog) to catch regressions.
  - _`.gitleaks.toml` (default rules + 3 project rules for the removed literals), `.github/workflows/secret-scan.yml` (`gitleaks detect --no-git` on push/PR), and `tools/verify-secrets-hygiene.mjs` in the local gate. CI scans the **working tree**, not history: the committed Gemini key is still in history and the rewrite is **deliberately deferred** (revocation is the real fix) — rationale and the later scrub procedure are in the runbook._

## Phase 1.2 — AuthN/session hardening
> **Session 10 (2026-07-25): DONE + verified** (except the deferred smoke-test bullet). Full detail in PROGRESS-LOG.
- [x] Short-lived access tokens + **refresh-token rotation**; make `refreshToken()` issue a genuinely new token, not re-sign. (R-29)
  - _Access token now `ACCESS_TOKEN_TTL` (default **15m**). The dead re-sign `refreshToken()` was deleted for a real rotating **opaque** refresh token: new `services/auth/tokenIssue.service.ts` (`issueAuthTokens`/`refreshTokens`/`logoutSession`) + `POST /auth/refresh`. Refresh rotates **both** tokens (old refresh → 401). New `refresh_token_hash` column (migration `20260725000000_auth_refresh_rotation`). Frontend rotates silently — proactive timer in `AuthContext` + reactive 401 retry on the shared clients — so 15m doesn't log users out. Also fixed a latent bug where the JWT's `session_id` never matched the DB row._
- [x] Remove the `session_id → 'bypass'` default in `checkAuth`; enforce active-session checks properly. (R-29)
  - _`checkAuth` rejects tokens with no `session_id` and validates the session is **active + unexpired** in the DB every request. The dead `checkAuthLegacy`/`requireActiveSession` bypasses were removed._
- [x] Make token blacklist/revocation mandatory so logout actually revokes. (R-29)
  - _Root cause was a hash mismatch (sessions stored bcrypt, the blacklist compared sha256 — never matched). Unified on deterministic `sha256Hex` (`utils/tokenHash.ts`); blacklist check is now mandatory (dropped the `?.`). New `POST /auth/logout` blacklists the access token **and** deactivates the session — proven revoked by the verifier._
- [ ] Add a login smoke test that exercises the **real** email-verify-gated path (real SMTP / mail catcher), not the `ENABLE_DEV_MINT` + bogus-SMTP bypass used by `verify-local-run.mjs` — the production login flow is currently unverified end-to-end. (surfaced Session 8)
  - _**Deferred (user decision, Session 10):** the new `verify-auth-session.mjs` already drives the real **MFA** login path (login → setup-with-token → speakeasy TOTP → verify-login), which was the bigger gap. The email-verify + mail-catcher piece stays open._
- [x] Replace `Math.random()` temp-password with `crypto.randomBytes`; MD5 device-hash → sha256. (R-28)
  - _New `utils/tempPassword.ts` (`crypto.randomInt`, guaranteed complexity) → `admin.agency.controller.ts`; `createDeviceHash` MD5 → sha256._

## Phase 1.3 — Default-deny authorization (close unguarded endpoints)
> **Sessions 3 / 3b / 3c (2026-07-25 → 26): DONE + verified.** Full detail in PROGRESS-LOG; the reviewed public allowlist + post-audit findings are in `waves/authz-public-allowlist.md`. Gate: `verify-default-deny-authz.mjs` + full suite **15/15 green**.
- [x] Add auth to the **document-validation webhook** — require `BACKEND_INTERNAL_TOKEN` (constant-time compare). (R-08)
  - _`internalAuth` (`secretsMatch` = sha256 + `timingSafeEqual`) on `POST /webhooks/document-validation`; Python sender now attaches the bearer header._
- [x] Guard `POST /api/ocr` — require auth, add file type/size limits + filter. (R-09)
  - _`checkAuth` + multer `limits.fileSize` (`OCR_MAX_UPLOAD_BYTES`, 10MB) + `fileFilter` (pdf/png/jpeg). Audit also closed a runId-ownership IDOR (company-scoped signal poisoning)._
- [x] Add auth + ownership checks to `GET /submissions/:id`, `/stream/:id`, and `POST /submissions` (never trust body `userId`). (R-10)
  - _`checkAuth` + `denyIfNotOwnSubmission`; `POST` derives owner from `req.user` (body `userId` dropped). SSE stream hardened beyond plan: signed, submission-bound, short-lived **stream ticket** (`utils/streamTicket.ts`) minted behind checkAuth+ownership — no raw access token in the URL._
- [x] Serve CVs/PII via **signed URLs**, not `express.static('/uploads')`. (R-11)
  - _Self-contained HMAC signed-token route `GET /api/v1/files/:token` (`utils/signedFile.ts`, traversal-safe) replaces the static mount; minted behind checkAuth. **Note:** local-disk signed tokens, not MinIO/S3 — the S3 migration proper stays in the storage/deploy wave; this closes the PII-exposure risk now. Public candidate profile no longer exposes any resume link._
- [x] Audit **every** route file for a guard; adopt a default-deny posture (global `checkAuth` + explicit reviewed public allowlist). Document each public route.
  - _Full audit closed ~8 more unguarded functional routes (admin.agency, verification.run + ownership, assessment answer/execution/telemetry, companyAssessmentInsights, questions read-routes + answer-leak block, insights.recompute + a cross-tenant `requireCompanyMember` bug). Reviewed public allowlist written: `waves/authz-public-allowlist.md`. (Earlier: Session-8 IDOR on all 8 `/:candidateId` endpoints via `denyIfNotOwnCandidate`.)_
- [ ] Review the unauthenticated `GET /health` probe (`routes/health.routes.ts`, mounted first in `app.ts`): it runs a DB `SELECT 1` per hit and echoes uptime/timing. Decide keep-public-but-rate-limited vs. move behind internal network; ensure the rate limiter (Phase 1.5) covers it. (info-leak / query-amplification)
  - _Documented as intentionally-public in the allowlist; the **rate-limit** decision is carried into Phase 1.5 (Redis limiter must cover `/health`)._

## Phase 1.4 — Lock down code execution
> **Session 4 (2026-07-26): DONE + verified.** Full detail in PROGRESS-LOG; gate `verify-runner-hardening.mjs` + suite **16/16 green**.
- [x] Make the hardened `docker run` path **mandatory**; remove the host/`entrypoint.py` and unauth HTTP-stub fallbacks in prod. (R-03)
  - _The host-`entrypoint.py` fallback now **fails closed** (`SecureRunnerUnavailableError` → submission FAILED) unless `RUNNER_ALLOW_HOST_EXEC=1`, which is off by default and **hard-refused in production** by `assertSafeRunner()` at boot. `RUNNER_MODE=docker` no longer silently degrades to host exec._
- [x] Add `--read-only`, `--user`, `--cap-drop ALL`, `--pids-limit`, `--security-opt no-new-privileges` (+ keep `--network none`, memory/cpus, optional gVisor).
  - _All added via the pure, unit-tested `buildDockerBaseArgs()` in `services/runner.security.ts` (+ `--ulimit`, writable `/work` bind mount + `/tmp` tmpfs + `HOME=/work` for compiled-language builds under a read-only rootfs, non-root `--user`). testInput heredoc interpolation replaced by a stdin-redirect file (no shell injection)._
- [x] Ensure the runner is never reachable unauthenticated from outside. (Full real sandbox-service build is Wave 4; here we guarantee containment.)
  - _The HTTP runner stub (`runner-python/http_service.py`) now requires a constant-time `X-Runner-Token` on `/run` + `/plagiarism` (fails closed 503 if `RUNNER_STUB_TOKEN` unset); the backend dispatcher sends it. `assertSafeRunner()` refuses to boot in prod if `RUNNER_HTTP_URL` is set without the token._
  - _⚠️ **Follow-up (needs a Docker daemon, not the CI env):** smoke-run one interpreted + one compiled submission through the hardened container to confirm `--read-only`+writable-`/work`+non-root `--user` still builds/runs (esp. dotnet/npx/javac). Argv flags are asserted; the live container run is deferred._

## Phase 1.5 — Transport, headers, CORS, rate limiting
- [x] Add real **`helmet`** (Express) — HSTS, CSP, X-Content-Type-Options, frame options. (R-28)
  - _`helmet@8` mounted first in `app.ts`; HSTS/CSP/`nosniff`/`X-Frame-Options: DENY`. `crossOriginResourcePolicy: cross-origin` set on purpose so the signed-file CV route + SSE stay reachable cross-origin. `trust proxy` set (env `TRUST_PROXY`) for correct client-IP rate-limit keys. Verifier asserts every header on `GET /health`._
- [x] Tighten CORS to an **env-driven allowlist** (no permissive `*` with credentials; fix ai-service `allow_origins=["*"]`). (R-28)
  - _Backend CORS reads `CORS_ALLOWED_ORIGINS` (comma-separated); prod = allowlist-only, non-prod also allows localhost. ai-service now uses `settings.CORS_ALLOW_ORIGINS` (new `core/config.py` setting). Verifier: disallowed origin not reflected, allowlisted one is._
- [x] Add a **Redis-backed global rate limiter** + stricter limits on auth/OCR/submissions/AI. (R-28)
  - _New `middlewares/rateLimit.ts`: `RedisStore` (shared across instances) when `REDIS_URL` set, graceful in-memory fallback otherwise (no boot crash). `globalLimiter` + stricter `authLimiter` (covers login), `ocrLimiter`, `submissionLimiter`, `aiLimiter`; all env-driven; `RATE_LIMIT_PREFIX` + `RATE_LIMIT_FORCE_MEMORY` knobs. Verifier proves single-instance 429; the 2-instance shared-store 429 auto-runs when Redis is up (skipped-with-log here)._
- [x] Set `express.json({ limit })`; add per-route upload size caps.
  - _`express.json({ limit: JSON_BODY_LIMIT ?? '1mb' })` + a JSON 413 handler (verifier: oversized body → 413). Upload caps (`MAX_UPLOAD_BYTES`, `OCR_MAX_UPLOAD_BYTES` + mime filter) already present — confirmed._

## Phase 1.6 — Remove prod-reachable dev/mock surface
- [x] Gate or delete `mockAssessment.routes` (currently mounted unconditionally). (R-23)
  - _DELETED entirely (route + `mockAssessmentResult` controller/service/types + the `app.ts` import/mount). It was an unauthenticated `prisma.skillAssessment.create` with no prod use._
- [x] Remove/prod-gate the dummy-admin `middlewares/auth.ts` and `compete` simulate endpoints. (R-23)
  - _`middlewares/auth.ts` (dead `authHook`) deleted. New reusable `middlewares/devOnly.ts` (404 unless `NODE_ENV!=='production' && ENABLE_DEV_MINT==='1'`) placed FIRST on `compete .../simulate`, before `checkAuth`._
- [x] Remove the internal-bearer-token `console.log` in `internalAuth.middleware.ts`. (supports P6/R-31)
  - _Removed; guard logic + the "never log the token" comment kept._

## Phase 1.7 — Internal service auth
- [x] Require an auth token (or network policy) on backend→python internal calls; don't rely on `0.0.0.0` + isolation alone. (part of R-13/P1)
  - _Consistent `X-API-Token`/`INTERNAL_API_TOKEN` guard (fail-closed, constant-time) wired on `assessment-ai`, `document-validator`, `job-creation-ai`, and `ai-service` (middleware); `matching` fail-open→fail-closed. Node side attaches the header via `config/internalServiceAuth.ts` across all 3 clients + the 5 ai-service:8000 call sites. `scraping-candidates:8010` (no runtime caller) = documented follow-up._
- [x] Confirm doc-validator/ai-service internal endpoints reject unauthenticated calls.
  - _New `verify-internal-service-auth.mjs` boots each service's real guard (TestClient) and proves no/wrong token → 403 (matching 401), correct → 200, `/health` open, unset → 500. Full gate 19/19._

---

## Exit criteria
- ✅ No default/placeholder secrets anywhere; all prior live keys rotated; secret scan clean.
- ✅ Forged token (old secret) is rejected; expired/blacklisted tokens rejected; refresh rotates.
- ✅ Every state-changing endpoint requires auth + correct role/ownership; IDOR on submissions blocked; webhook/OCR guarded.
- ✅ CVs only reachable via signed URLs.
- ✅ Candidate code cannot execute on the host; only the hardened container path exists.
- ✅ `helmet`, env-driven CORS, and Redis-backed rate limiting are live.
- ✅ No mock/simulate/dummy-auth endpoints reachable in prod.
- ✅ A written authz check (role × endpoint) passes; the Critical/High security risks reproduce as **fixed**.
- ✅ PROGRESS-LOG updated per change.

> **Session 7 (2026-07-26) — Wave 1 exit gate CLOSED.** Role × endpoint authz matrix (`tools/verify-authz-matrix.mjs`, **21/21**: no-token→401, wrong-role→403, correct→2xx). Every Critical/High reproduces as fixed — ledger in `matrices/wave-1-security-gate.md`. Supply-chain: prod `pnpm audit` High/Crit **backend 25→1** (`jws`, no upstream patch → Wave 8), **frontend 5→0** (`tools/verify-dependency-audit.mjs`, `matrices/dependency-audit.md`). Image hygiene: `.env`-in-image leaks closed on 3 services, gated by `tools/verify-image-hygiene.mjs` (real Trivy scan → Wave 8). `pnpm` builds green; `GET /health` ok. Per-role threat model seeded for Wave 8: `pillars/threat-model-per-role.md`. **New hole found + fixed this session:** R-44 (public signup `role:'admin'` priv-esc).
>
> **Still open (documented, not Wave-1 blockers):** provider-side secret rotation (user action, runbook §B); the Phase 1.2 real-SMTP email-verify login smoke; live-container code-exec smoke + real image Trivy scan (need a Docker daemon → Wave 4/8); `jws` High (Wave 8); `scraping-candidates:8010` inbound guard (no caller yet); role-string-drift unification.

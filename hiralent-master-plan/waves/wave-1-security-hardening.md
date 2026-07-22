# Wave 1 — Security Hardening

> **Goal:** close every Critical/High security hole so the platform is safe to expose. No feature work — just make what exists safe. **Runs after Wave 0 (a clean build) is verified.**
>
> **Pillar advanced:** P1 (Security).
> **Risks closed:** R-01, R-02, R-03 (lock the path), R-08, R-09, R-10, R-11, R-23, R-28, R-29 · **starts:** R-14 (rotate now, image fix in Wave 8).
> **Entry state:** default JWT secret, committed key, unguarded endpoints, host-exec fallback, no headers/rate-limit, prod-reachable mocks.

---

## Phase 1.1 — Secrets rotation (do first, treat all as compromised)
- [ ] Generate a high-entropy `JWT_SECRET` (and confirm `ADMIN_JWT_SECRET` is strong); invalidate all existing tokens. (R-01)
- [ ] Revoke + rotate the committed Gemini key; **remove the hardcoded fallback** in `ai-service/app/gemini_service.py:47`; load only from env. (R-02)
- [ ] Rotate every other live credential that has sat in a tracked/on-disk `.env` or image: Pinecone, Cloudinary, SMTP, Firebase private key, MinIO creds, `INTERNAL_API_TOKEN`, `BACKEND_INTERNAL_TOKEN`. (R-02, R-14)
- [ ] Add secret scanning (gitleaks/trufflehog) to catch regressions.

## Phase 1.2 — AuthN/session hardening
- [ ] Short-lived access tokens + **refresh-token rotation**; make `refreshToken()` issue a genuinely new token, not re-sign. (R-29)
- [ ] Remove the `session_id → 'bypass'` default in `checkAuth`; enforce active-session checks properly. (R-29)
- [ ] Make token blacklist/revocation mandatory so logout actually revokes. (R-29)
- [ ] Add a login smoke test that exercises the **real** email-verify-gated path (real SMTP / mail catcher), not the `ENABLE_DEV_MINT` + bogus-SMTP bypass used by `verify-local-run.mjs` — the production login flow is currently unverified end-to-end. (surfaced Session 8)
- [ ] Replace `Math.random()` temp-password with `crypto.randomBytes`; MD5 device-hash → sha256. (R-28)

## Phase 1.3 — Default-deny authorization (close unguarded endpoints)
- [ ] Add auth to the **document-validation webhook** — require `BACKEND_INTERNAL_TOKEN` (constant-time compare). (R-08)
- [ ] Guard `POST /api/ocr` — require auth, add file type/size limits + filter. (R-09)
- [ ] Add auth + ownership checks to `GET /submissions/:id`, `/stream/:id`, and `POST /submissions` (never trust body `userId`). (R-10)
- [ ] Serve CVs/PII via **signed MinIO/S3 URLs**, not `express.static('/uploads')`. (R-11)
- [ ] Audit **every** route file for a guard; adopt a default-deny posture (global `checkAuth` + explicit reviewed public allowlist). Document each public route.
  - _Already closed (Session 8, pulled forward): IDOR on all 8 `/:candidateId` endpoints in `candidate.controller.ts` — shared `denyIfNotOwnCandidate` guard; covered by the broadened `verify-match-jobs-idor.mjs`. Use this as the pattern for the rest of the audit._
- [ ] Review the unauthenticated `GET /health` probe (`routes/health.routes.ts`, mounted first in `app.ts`): it runs a DB `SELECT 1` per hit and echoes uptime/timing. Decide keep-public-but-rate-limited vs. move behind internal network; ensure the rate limiter (Phase 1.5) covers it. (info-leak / query-amplification)

## Phase 1.4 — Lock down code execution
- [ ] Make the hardened `docker run` path **mandatory**; remove the host/`entrypoint.py` and unauth HTTP-stub fallbacks in prod. (R-03)
- [ ] Add `--read-only`, `--user`, `--cap-drop ALL`, `--pids-limit`, `--security-opt no-new-privileges` (+ keep `--network none`, memory/cpus, optional gVisor).
- [ ] Ensure the runner is never reachable unauthenticated from outside. (Full real sandbox-service build is Wave 4; here we guarantee containment.)

## Phase 1.5 — Transport, headers, CORS, rate limiting
- [ ] Add real **`helmet`** (Express) — HSTS, CSP, X-Content-Type-Options, frame options. (R-28)
- [ ] Tighten CORS to an **env-driven allowlist** (no permissive `*` with credentials; fix ai-service `allow_origins=["*"]`). (R-28)
- [ ] Add a **Redis-backed global rate limiter** + stricter limits on auth/OCR/submissions/AI. (R-28)
- [ ] Set `express.json({ limit })`; add per-route upload size caps.

## Phase 1.6 — Remove prod-reachable dev/mock surface
- [ ] Gate or delete `mockAssessment.routes` (currently mounted unconditionally). (R-23)
- [ ] Remove/prod-gate the dummy-admin `middlewares/auth.ts` and `compete` simulate endpoints. (R-23)
- [ ] Remove the internal-bearer-token `console.log` in `internalAuth.middleware.ts`. (supports P6/R-31)

## Phase 1.7 — Internal service auth
- [ ] Require an auth token (or network policy) on backend→python internal calls; don't rely on `0.0.0.0` + isolation alone. (part of R-13/P1)
- [ ] Confirm doc-validator/ai-service internal endpoints reject unauthenticated calls.

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

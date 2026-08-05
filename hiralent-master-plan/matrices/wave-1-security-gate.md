# Wave 1 Security Gate — reproduce → now-fixed ledger

**Purpose.** The Wave-1 exit criterion is not "the code changed" — it is that each Critical/High
security risk **reproduces as fixed**: the original attack, run against the current code, is now
blocked, and a repeatable test proves it. This ledger maps every closed risk to the exact automated
proof. Run the whole set with:

```bash
node hiralent-master-plan/tools/run-all-verifiers.mjs
```

_Compiled: Session 7 (2026-07-26). Environment: Postgres on :5432 up; Redis down (rate-limit
shared-store cases skip-with-log); no Docker daemon (live-container + real image scan deferred)._

## Ledger

| R-ID | Risk (severity) | Reproduce (the original attack) | Now-fixed proof (verifier : case) | Status |
|---|---|---|---|---|
| **R-01** | Forgeable JWT / default secret (Crit) | Sign a token with the old/wrong secret (or omit `session_id`) → call an authed route | `verify-auth-session.mjs` — forged-secret token → `/me` 401; no-`session_id` token → 401; `verify-secrets-hygiene.mjs` — boot asserts a strong secret, red case proven | ✅ Fixed |
| **R-02** | Committed Gemini key / hardcoded fallbacks (Crit) | Grep source for the live key / weak literal defaults | `verify-secrets-hygiene.mjs` — no tracked file carries the key or weak literals; `.gitleaks.toml` + CI `secret-scan.yml` wired | ✅ Fixed (code); provider-side key **rotation is a user action** (runbook §B1) |
| **R-03** | Candidate code executes on host (Crit) | Force `RUNNER_MODE`/host fallback → run submitted code on the backend host | `verify-runner-hardening.mjs` — host fallback fails closed unless non-prod+flag; prod refuses to boot with host-exec; hardened `docker run` argv asserted | ✅ Fixed (containment); live-container smoke needs a daemon → Wave 4/8 |
| **R-08** | Unauth doc-validation webhook (High) | POST verification result with no token → spoof KYC | `verify-default-deny-authz.mjs` case 1 — no token → 401; correct `BACKEND_INTERNAL_TOKEN` → 200 | ✅ Fixed |
| **R-09** | Unauth `POST /api/ocr` (High) | POST OCR upload with no token / oversized / wrong type | `verify-default-deny-authz.mjs` case 2 — no token → 401; multer size/type limits asserted | ✅ Fixed |
| **R-10** | IDOR on submissions + spoofable `userId` (High) | Read another user's submission / SSE; POST with `body.userId=<victim>` | `verify-default-deny-authz.mjs` cases 3–4 — non-owner → 403, body `userId` ignored, SSE via signed ticket; `verify-match-jobs-idor.mjs` — `/match-jobs` cross-user → 403 | ✅ Fixed |
| **R-11** | CVs/PII served static from `/uploads` (High) | GET a CV path directly with no auth | `verify-default-deny-authz.mjs` case 5 — `/uploads/*` → 404; signed `GET /files/:token` → 200; tampered/expired → 401 | ✅ Fixed (signed local-disk tokens; S3 in storage wave) |
| **R-23** | Prod-reachable mock/dummy-auth (High) | Hit `mockAssessment` / dummy-admin / `compete/simulate` in prod | `verify-mock-dev-surface.mjs` — mock surface deleted; `devOnly` gates simulate (prod→404); no token `console.log` | ✅ Fixed |
| **R-13** | Unauth backend→Python internal calls (High/P1) | Reach a Python service port without the internal token | `verify-internal-service-auth.mjs` — each service's real guard: no/bad token → 403 (matching 401), correct → 200, unset → 500 (fail-closed) | ✅ Fixed (`scraping:8010` no caller = documented follow-up) |
| **R-28** | No security headers; permissive CORS; weak rate-limit (Med→High) | Missing HSTS/CSP; `*` CORS with creds; unlimited requests | `verify-transport-security.mjs` — helmet headers on `/health`, env CORS allowlist, Redis/in-mem limiter 429 | ✅ Fixed |
| **R-29** | 7-day tokens, no rotation, `session_id='bypass'`, optional blacklist (Med→High) | Replay old refresh; use a session-less token; logout doesn't revoke | `verify-auth-session.mjs` cases 4–5 — refresh rotates (old → 401); logout revokes access token | ✅ Fixed |
| **R-44** *(new, this session)* | Public signup self-assigns `role:'admin'` → cross-tenant priv-esc (High) | `POST /auth/signup {role:'admin'}` → get an admin-role session token that passes `requireCompanyMember` for any company | `verify-authz-matrix.mjs` case 7 — signup `{role:'admin'}` → 400 (enum rejects); no admin-role token issued | ✅ Fixed |

## Role × endpoint authorization (the matrix)

Beyond individual reproductions, `verify-authz-matrix.mjs` proves the general contract against a live
backend for every principal (candidate / company_admin / agency_admin / superadmin-ADMIN-JWT):

> **no token → 401 · wrong role → 403 · correct role → 2xx**

across question-bank reads, superadmin agency admin, company insights + recompute (`requireCompanyMember`,
incl. cross-company 403), COMPANY verification-run ownership (403 for non-owner — also an IDOR guard), and
the `/me` baseline. 21/21 cells pass.

## What is NOT closed here (carried forward, honestly)

- **Provider-side secret rotation** (Gemini key, Pinecone, Cloudinary, SMTP, Firebase key) — user action, runbook §B.
- **Live-container code-exec smoke** (R-03) + **real image build/Trivy scan** (R-14/R-12) — need a Docker daemon → Wave 4/8.
- **`jws` (firebase-admin) High** — no upstream patch → `matrices/dependency-audit.md`, Wave 8.
- **`scraping-candidates:8010`** internal guard — no runtime caller yet → follow-up.
- **Role-string drift** (`super_admin`/`superadmin`/`admin`) — hygiene risk documented in
  `pillars/threat-model-per-role.md`; not refactored this session (blast radius).

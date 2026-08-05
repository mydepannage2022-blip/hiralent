# Authz Public Allowlist — Wave 1 / Phase 1.3 (Default-Deny)

**Purpose.** Phase 1.3 made authentication the default: every mounted *functional* route now
carries a guard (`checkAuth`, `checkAuthQueryToken`, `adminSecurityStack`, `internalAuth`,
`requireScrapingAccess`, or a signed-token capability). This file is the **reviewed list of
routes that are intentionally reachable without a user session**, with the reason each is safe.
Anything not on this list must be guarded. When you add a genuinely-public route, add it here.

_Last reviewed: 2026-07-25 (Session 3)._

## Intentionally public (reviewed)

| Route(s) | Why public |
|---|---|
| `GET /health` | Liveness/readiness probe (no data). |
| `POST /api/v1/auth/signup \| login \| refresh \| verify-email \| forgot-password \| reset-password` | Auth entrypoints — the caller has no token yet. |
| `GET /api/v1/auth/google \| /google/callback`, `POST /2fa/setup-with-token \| /2fa/verify-login \| /2fa/verify-recovery` | OAuth + pre-session MFA steps (gated by short-lived `tempToken`, not a full session). |
| `POST /api/v1/admin/auth/login \| setup-mfa \| verify-mfa` | Admin login / MFA entrypoints (issue the ADMIN_JWT). |
| `GET /api/v1/search/candidates` (optionalAuth) `GET /api/v1/search/jobs` | Public discovery surface (mounted before jobRoutes deliberately). |
| `GET /api/v1/webhooks/document-validation/health` | Webhook health only. The **result** endpoint (`POST /document-validation`) is now `internalAuth`. |
| `GET /api/v1/subscription/plans \| plans/:planId`, `POST /api/v1/subscription/webhook/:gateway` | Public price list + payment-gateway webhook (gateway-signed in controller). |
| `POST /api/v1/agency/apply`, `GET /api/v1/agency/application/:id` | Agency self-application + status check (pre-account). |
| `POST /api/v1/compete-challenges/:id/results` | Service-key webhook (key checked in controller). |
| `GET /api/v1/candidates/public-profile/:candidateId` | Public candidate profile. **No resume/CV link** is exposed here anymore (resume carries PII); it is served only through the authenticated profile / resume-download paths. |
| `GET /api/v1/employer/public/:slug \| /public/:slug/jobs \| /check-slug/:slug` | Public employer pages. |
| `GET /api/v1/company/team/invitations/verify/:token`, `POST .../invitations/accept/:token` | Team-invite acceptance (token IS the capability). |
| `GET /api/v1/files/:token` | Signed CV/resume file serving — the expiring HMAC token IS the capability (replaces public `express.static('/uploads')`). |
| `GET /api/questions/*-service/health`, `/diagram-service/health`, `/vector*/health`, `/vetting/health`, etc. | Informational health checks (no data). |

## Closed this session (were unguarded → now guarded)

- `POST /api/ocr` → `checkAuth` + multer size/type limits.
- `POST /api/v1/webhooks/document-validation` → `internalAuth` (constant-time `BACKEND_INTERNAL_TOKEN`); Python sender now attaches the bearer header.
- `GET /api/v1/submissions/:id`, `GET /api/v1/submissions/stream/:id`, `POST /api/v1/submissions` → auth + **ownership** (`denyIfNotOwnSubmission`); SSE uses `checkAuthQueryToken`; body `userId` no longer trusted.
- `GET /api/v1/admin/agencies/*` (6 superadmin routes) → `adminSecurityStack`.
- `POST /api/v1/verification/run/create \| finalize` → `checkAuth`.
- `PUT/GET /api/v1/assessment-sessions/:id/answers`, `/telemetry`, `/questions/:qid/run`, `/submissions/:sid` → `checkAuth`.
- `GET /api/v1/candidates/:id/assessments/completed`, `/assessment-sessions/:id/insight \| analytics`, `/assessments/:id/analytics/candidates` → `checkAuth`.
- `GET /api/questions`, `GET /api/questions/:id`, `GET /api/questions/:id/diagram` → `checkAuth`.
- `express.static('/uploads')` removed → `GET /api/v1/files/:token` (signed).

## Post-implementation adversarial audit (same session) — extra holes found & fixed

- **`verification.run` privilege escalation → FIXED.** After the checkAuth mount, any authenticated
  user (incl. a candidate) could still `create`/`finalize` a **COMPANY** verification run and set that
  company's `verified=true`/verification state. Added ownership: for a COMPANY subject the caller's
  `req.user.company_id` must equal the subject company; `finalize` now authorizes against the **run's own
  stored subject** (not client-supplied) and updates that subject. (`routes/verification.run.routes.ts`)
- **OCR verification-signal poisoning (IDOR) → FIXED.** `POST /api/ocr` with another company's `runId`
  could inject `VerificationSignal` rows into that run (sabotage its KYC). Now, when a `runId` is present
  and its run is a COMPANY subject, the caller must own that company (403 otherwise), checked before OCR.
  (`routes/ocr.routes.ts`)
- **Question-bank answer leak → FIXED.** `GET /api/questions`, `/:id`, `/:id/diagram` return
  `canonicalSolution` + `testCases` (the answers). checkAuth alone let any candidate dump every solution.
  Added `denyNonBankReaders` (candidates/agencies → 403); all real callers are the company dashboard.
  (`routes/questions/question.routes.ts`)
- **Verified NOT vulnerable:** assessment answer/execution/telemetry and companyAssessmentInsights are
  ownership-scoped **inside their services/controllers** (`findFirst({ session_id, candidate_id })`,
  role + `companyId` checks with service-level `FORBIDDEN`) — checkAuth completes them, no IDOR.
- **`insights.recompute` + `requireCompanyMember` → FIXED (session close).**
  `POST /companies/:companyId/insights/recompute` was `requireAuth` only, so any authenticated user (incl. a
  candidate) could enqueue a recompute for **any** company. Added `requireCompanyMember`. Fixing that surfaced
  two bugs *in the middleware itself* (its only consumers are these two insights routes): it read
  `user.companyId` / `user.company_ids`, which `checkAuth` never sets (it sets `company_id`), so (a) legit
  `company` members were wrongly 403ed, and (b) `company_admin` was blanket-whitelisted with **no** company
  match — a cross-tenant IDOR (company A's admin could read/recompute company B). Rewrote it to read
  `user.company_id` and to keep only `admin`/`super_admin` as cross-company; `company_admin` must now match the
  requested company. (`middlewares/authz.middleware.ts`, `routes/insights.routes.ts`)

## Notes / follow-ups (documented, out of this session)

- **Dead, unmounted route files** (no `app.use` imports them; no live risk): `verification.routes.ts`,
  `verification.agency.routes.ts`, `verification.company.routes.ts`, `questions/pattern-to-question.routes.ts`,
  `questions/question.routes.debug.ts`. Leave untouched; delete in a cleanup pass. (Attempted `git rm` this
  session was blocked by the git guardrail — the user deletes them manually.)
- **Public-profile resume exposure → FIXED (session close).** `GET /public-profile/:candidateId` no longer
  returns any resume/CV link to anonymous visitors (a resume carries PII). The signed link is served only
  through the authenticated `getCandidateProfile` / resume-download paths. (`services/candidate.service.ts`)
- **SSE access token in URL → FIXED (session close).** The submission stream no longer takes the raw
  `?access_token=`. The browser first mints a signed, submission-bound, short-lived (~5-min) **stream ticket**
  via `POST /submissions/stream-ticket/:id` (behind `checkAuth` + ownership), then opens the EventSource with
  `?ticket=`. A leaked stream URL now exposes at most a few-minute view of that one submission, never the
  account. (`utils/streamTicket.ts`, `routes/execution.routes.ts`, frontend `lib/streamTicket.ts` +
  `useRunSubmission.ts` + `hooks/useSubmissionSSE.ts` + `CodeRunner.tsx`.)

### Remaining (genuine follow-ups, not blocking)
- **Signed CV mint authorization** is still `checkAuth`-level: any logged-in user can mint a signed link for a
  CV *path they already know*. Relationship-scoped mint authz (only the owner + employers/agencies actually
  reviewing them) is a follow-up.
- **Stream ticket is TTL-scoped, not server-state single-use.** True one-time (a used ticket is burned) would
  need a shared store (Redis/DB); the short TTL + submission binding already removes the
  account-credential-in-URL risk, which was the actual exposure.
- **`checkAuthQueryToken.middleware.ts` is now orphaned.** The SSE route no longer imports it (it was the
  old `?access_token=` seam). Harmless — not mounted anywhere — but a dead file to remove in the cleanup pass.

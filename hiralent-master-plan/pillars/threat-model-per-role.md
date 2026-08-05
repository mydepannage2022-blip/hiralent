# Threat Model — per Role (Wave 8 sign-off seed)

**Purpose.** A per-principal view of what each actor can touch, how they authenticate, the threats that
matter for them (STRIDE-lite: Spoofing / Tampering / Repudiation / Info-disclosure / DoS / Elevation),
the controls now in place after Wave 1, and the residual risk carried forward. This is the seed for the
Wave 8 production sign-off — each row should be re-confirmed (and residuals closed or explicitly accepted)
before go-live.

_Author: Session 7 (2026-07-26). Controls reference the guards in `backend/src/middlewares/**` and the
automated proofs in `hiralent-master-plan/tools/verify-*.mjs`._

## Principals & how they authenticate

| Principal | Auth mechanism | Token carries |
|---|---|---|
| **anonymous** | none | — |
| **candidate** | user JWT (signup/login → MFA) via `checkAuth` | `user_id`, `role='candidate'`, `session_id` |
| **company_admin** | user JWT via `checkAuth` | `user_id`, `role='company_admin'`, `company_id` (= own user_id at signup) |
| **agency_admin** | user JWT via `checkAuth` | `user_id`, `role='agency_admin'`, `agency_id` |
| **superadmin** | **separate ADMIN JWT** (`ADMIN_JWT_SECRET`) via `requireSuperAdmin` / `adminSecurityStack` | `role='superadmin'`, `authenticated=true` (+ optional Tailscale IP gate) |
| **internal-service** (Node ↔ Python, webhooks) | shared token headers (`X-API-Token` / `BACKEND_INTERNAL_TOKEN`, constant-time) | n/a — service identity, no user |

Every user token passes the same three mandatory `checkAuth` checks: blacklist (revocation) → signature/expiry
→ active DB session. There is no `session_id='bypass'` fallback (R-29).

---

## anonymous (unauthenticated)
- **Assets reachable:** public discovery (`/search/*`, employer public pages, subscription plans),
  auth entrypoints, gateway-signed payment webhook, signed-file `/files/:token` (token IS the capability),
  `/health`. Full list: `waves/authz-public-allowlist.md`.
- **Primary threats:** **S** forge a session (R-01); **E** reach a functional endpoint with no auth
  (default-deny gap); **I** read a CV/PII via static path (R-11); **D** unauthenticated OCR/AI abuse (R-09);
  **S** spoof a KYC webhook (R-08).
- **Controls now:** default-deny — every non-allowlisted route carries a guard; forged/expired tokens 401
  (`verify-auth-session`); CVs only via expiring signed token (`verify-default-deny-authz` case 5); webhook +
  OCR require tokens/limits; global rate limiter + helmet + CORS allowlist (`verify-transport-security`).
- **Residual:** `/health` runs `SELECT 1` per hit (documented intentional; rate-limited). Signed-file mint is
  `checkAuth`-level, not relationship-scoped (follow-up).

## candidate
- **Assets:** own profile/CV, own submissions & assessment sessions, own job applications, job recommendations.
- **Primary threats:** **I/E** read another candidate's submissions or profile (IDOR, R-10); **E** reach the
  question bank and dump `canonicalSolution`/`testCases` (answer leak); **T** finalize/tamper a **company's**
  KYC verification run; **E** self-assign a privileged role at signup (R-44).
- **Controls now:** ownership guards (`denyIfNotOwnSubmission`, `denyIfNotOwnCandidate`, `/match-jobs`
  `candidateId===user_id`); `denyNonBankReaders` blocks candidates from the bank (403); verification-run
  ownership (candidate → 403); signup role enum no longer accepts `admin` (R-44). All proven in
  `verify-authz-matrix` + `verify-default-deny-authz` + `verify-match-jobs-idor`.
- **Residual:** none Critical/High known for this role; keep the matrix current as new candidate routes land.

## company_admin
- **Assets:** own company profile, jobs, applicants, team, company insights, external-candidate sourcing,
  its own verification runs.
- **Primary threats:** **E/I** cross-tenant — read/recompute/modify **another** company's data (the
  `requireCompanyMember` bug class); **T** approve its own KYC without ownership binding; **E** act on a job
  it doesn't own.
- **Controls now:** `requireCompanyMember` is company-scoped (`company_admin` must match the requested
  `companyId`; only `admin`/`super_admin` are cross-company) — cross-company → 403; verification-run ownership
  binds to the caller's `company_id`; job controller checks `job.company_id`. `verify-authz-matrix` rows 3–5
  prove the cross-company 403 and same-company 200.
- **Residual:** several company scoping checks live **inside controllers** (jobs, external candidates), not in
  route middleware — lower-visibility; Wave 8 should spot-check external-candidates scoping end-to-end.

## agency_admin
- **Assets:** agency application/status, agency-scoped views (`agency_id`).
- **Primary threats:** **E** read the question bank (blocked like candidate); **E/I** reach another agency's data.
- **Controls now:** `denyNonBankReaders` blocks agency_admin from the bank (403, proven); agency scoping via
  `agency_id` claim.
- **Residual:** agency-vs-agency isolation is less exercised by tests than company isolation — a Wave 8/earlier
  pass should add agency ownership cases to the matrix. (agency_admin from signup has `agency_id=null` until
  provisioned — role-gate tests cover the deny paths; positive agency-data paths need a provisioned agency.)

## superadmin
- **Assets:** agency approve/reject, company verification approve/reject, platform admin views.
- **Primary threats:** **S** forge an admin token; **E** a normal user reaching an admin route; **E** a valid
  ADMIN-JWT whose role isn't superadmin.
- **Controls now:** admin routes behind `adminSecurityStack` → `requireSuperAdmin` verifies a **separate**
  ADMIN JWT (`ADMIN_JWT_SECRET`), requires `role==='superadmin' && authenticated`, optional Tailscale IP gate.
  A user JWT (wrong secret) → 401; an ADMIN-JWT with the wrong role → 403; superadmin → 200
  (`verify-authz-matrix` row 2).
- **Residual:** admin JWTs are **not** session-backed / blacklist-checked like user tokens — a leaked admin token
  is valid until expiry (no server-side revocation). Consider bringing admin tokens under the session/blacklist
  model in a later wave. Tailscale gate is off by default (`TAILSCALE_ENABLED`).

## internal-service (Node ↔ Python, webhooks)
- **Assets:** AI scoring/matching/validation endpoints; verification webhook.
- **Primary threats:** **S** an outsider reaching a Python service port and driving it; **T** injecting KYC
  signals; **fail-open** if the token is misconfigured.
- **Controls now:** every guarded Python service checks the shared token constant-time and **fails closed**
  (unset → 500); Node attaches the header via `internalTokenHeader()`; webhook uses `internalAuth`. Proven by
  `verify-internal-service-auth` (live) + `verify-default-deny-authz` case 1.
- **Residual:** `scraping-candidates:8010` has **no** inbound guard (no runtime caller yet) — must gain the token
  guard before any caller is added, or it's an open ingress. Shared static tokens (not per-service/mTLS) — a
  Wave 6/8 hardening candidate.

---

## Cross-cutting hygiene risks (tracked, not role-specific)

- **Role-string drift** — `super_admin` (authz.middleware) vs `superadmin` (ADMIN-JWT / `types/job.types.ts`)
  vs `admin` (a user role that `requireCompanyMember` treats as god-mode). Today each guard is internally
  consistent (the matrix pins the exact string each expects), but the divergence is a latent footgun: a future
  guard using the "wrong" spelling could silently over- or under-authorize. **Recommend** a single `Role`
  enum + constants before Wave 8 sign-off. Not refactored this session (touches auth core broadly).
- **Deprecated bare-JWT middleware** (`auth.middleware.ts`, `optionalAuth`) verify signature only (no
  blacklist/session). Keep them off privileged routes; delete `auth.middleware.ts` in a cleanup pass.
- **`/resume/extract`** dangling internal call (wrong header, no matching Python endpoint) — dead/broken, not a
  live auth hole; fix in Wave 3 feature-completion.
- **Stream ticket** is TTL-scoped, not server-state single-use; **signed-CV mint** is `checkAuth`-level, not
  relationship-scoped — both are documented follow-ups (acceptable now, revisit for sign-off).

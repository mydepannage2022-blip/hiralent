# Wave 3 Correctness & Wiring Gate — reproduce → now-fixed ledger

**Purpose.** The Wave-3 exit criterion is not "the code changed" — it is that each correctness/wiring
risk **reproduces as fixed**: the original silent failure, exercised against the current code, is now
prevented, and a repeatable test proves it. Wave 3 is the "it shows but doesn't work" class — a green
build hid a broken login, a broken token refresh, and a dead admin screen. This ledger maps every closed
Wave-3 risk to its automated proof and the composed canonical-journey pass that ties them together.

```bash
node hiralent-master-plan/tools/run-all-verifiers.mjs
```

_Compiled: Session 7 (2026-08-04). Environment: Postgres on :5432 up. Live checks run on a self-created
throwaway DB (`hiralent_w3_e2e`); ai-service + document-validator are stubbed (URL override) — no Python
service is booted; the primary `hiralent` is never touched._

## Ledger

| R-ID | Risk (severity) | Reproduce (the original failure) | Now-fixed proof (verifier : stage) | Status |
|---|---|---|---|---|
| **R-36** | Response-envelope inconsistency → sporadic `undefined`/silent-broken screens (Med) | Log in / sign up in the browser: the frontend read `data.token`/`data.user` off the enveloped body → `undefined` → login silently failed; `POST /auth/refresh` read top-level `data.token` → token never rotated → logout every ~15m | `verify-wave3-e2e.mjs` [refresh] — refresh returns the token under `data.token`, the rotated token authorizes `/me`, a bad refresh token → 401; **fail-proved** (revert backend to top-level `token` → RED). Auth-frontend cluster reconciled + `admin.agency` normalized to `sendSuccess`+typed errors (static teeth) | 🔶 Canonical journeys fixed + proven; ~53 non-journey controllers + their FE readers carried forward |
| **R-22** | Admin **Agencies** screen sends `Bearer null` (wrong token key) → whole approve/reject/list 401s (High) | Open admin → Agencies with a valid superadmin session → every action 401s (page reads `localStorage.getItem('adminToken')`, a key nothing sets) | `verify-wave3-e2e.mjs` [J1] — superadmin full MFA login → approve a PENDING agency → 200 `{success:true,data.status:'APPROVED'}`; **no-token → 401**; unknown id → typed-error envelope `{success:false,error:{code,message}}` | ✅ Fixed |
| **R-24** | `/resume/extract` dangling call → resume autofill 404s (Med) | Trace the resume-extraction call → a POST to a non-existent ai-service route | `verify-wave3-e2e.mjs` [J2] — the autofill-preview route is mounted + auth-guarded (no-token → 401): a **real** endpoint, not the dangling dead-end; **static** — the dead `triggerResumeExtraction`/`/resume/extract` call is gone from `profile.service.ts`. (Real autofill runs in-process via `extractSkillsFromText`, `lib/openai.ts`.) | ✅ Fixed (dead code; real path is in-process) |
| **R-25** | Session-management router never mounted → "sign out other devices" broken (Med) | 2 sessions → terminate-others → nothing revoked (call 404'd) | `verify-session-realtime.mjs` (Phase 3.5) + `verify-wave3-e2e.mjs` [J4] — 2nd MFA session terminates the 1st → `terminated_count>=1`, the 1st token then 401s | ✅ Fixed (Session 4) |
| **R-26** | Doc-validation webhook wrong port (4000 vs 5000) → deep-validation results silently lost (Med) | Queue a deep validation → the callback posts to :4000 → result never lands | `verify-wave3-e2e.mjs` [J5] — the receiver is mounted at `/api/v1/webhooks/document-validation` (callback built from `getBackendUrl()` :5000) and enforces the internal token: no-header → 401, wrong token → 403, correct token → 200 (result reaches the backend) | ✅ Fixed |
| **R-27** | `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_BASE_URL` conflict → class of FE calls 404 by env (Med) | Build for staging → half the FE calls resolve to the wrong/undefined host | `verify-api-config.mjs` — one convention (`NEXT_PUBLIC_API_URL` bare host) + resolver `lib/config/api.ts`; grep-gate (whole `frontend/`) + FE resolver probe, both fail-proved | ✅ Fixed (Session 6) |
| **R-13** | `host.docker.internal` + hardcoded `localhost` in BE source → inter-service/email links break on staging (High) | Deploy → AI-service calls & email links point at the dev laptop | `verify-api-config.mjs` — `appUrls.ts` (`getFrontendUrl`/`getBackendUrl`) + `AI_SERVICE_URL` env fallback; BE stub-server proof (backend calls the stub, not localhost) | 🔶 env-drive done (Session 6); container/host-network wiring → Wave 8 |
| **R-32** | `sendEmail` swallows failures → users stuck unverified silently (Med) | Break SMTP → signup still says "sent" | `verify-error-envelope.mjs` — broken SMTP → signup `data.emailDelivered:false` (surfaced, not swallowed) | ✅ Fixed (Session 1) |

## The composed journey (what the slices never proved together)

`verify-wave3-e2e.mjs` runs the **whole canonical path on ONE fresh throwaway DB, in one continuous flow** —
proving the "it shows but doesn't work" class has no silent dead-ends left on the journeys that matter:

> empty DB → `migrate deploy` → prod seed (loginable superadmin, no demo) → boot (`/health` db:up)
> → **token refresh** rotates under `data.token` + the new token authorizes `/me` (bad token → 401)
> → superadmin **full MFA login → approves a pending agency** (200, `APPROVED`, envelope; no-token → 401;
>   unknown-id → typed-error envelope)
> → **sign out other devices** revokes the 1st session (R-25)
> → **chat** conversation + message create return the envelope
> → **autofill** route mounted + auth-guarded (R-24 dead call gone)
> → **deep-validation webhook** mounted + internal-token-guarded (no-header 401, wrong-token 403, correct 200).

**Negative controls (teeth):** the refresh assertion is fail-proved — reverting the backend to a top-level
`token` turns the verifier RED on the exact `[refresh]` stage (that is the silent-logout regression). Every
guarded route asserts its no-token / wrong-token rejection, so a dropped guard flips the gate red too.

## What is NOT closed here (carried forward, honestly)

- **The full response-envelope sweep** (R-36): ~53 non-journey controllers (question/employer/candidate/
  company/team/message/session + the OCR/upload surface) and their frontend readers (search/OCR/invites,
  the admin **company-verification** `{ok}` client + its 3 pages) still emit/read legacy shapes. This was a
  deliberate **journey-scoped** decision (user-approved) — normalizing them wholesale risks breaking the
  many FE sites that already read `{success,data}` plus extra top-level keys, and needs lockstep FE changes.
  Next feature-slice sessions take them incrementally; R-36 stays 🔶 until the tail is done.
- **Live two-browser click-through** of the fixed FE reads — not run: every login path is MFA-gated (TOTP),
  so a quick manual browser pass is impractical; `verify-wave3-e2e.mjs` drives these exact flows
  programmatically (speakeasy TOTP) against a real backend, and the FE reader fixes are `tsc` + `next build`
  verified. A full-stack UI smoke belongs to CI / a deploy-prep session.
- **Container/host-network wiring** for inter-service URLs (R-13) → Wave 8.

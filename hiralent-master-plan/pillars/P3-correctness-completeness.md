# Pillar P3 — Correctness & Completeness

> **Principle:** if it's visible in the UI, it must actually work end-to-end. No mock data, no dead buttons, no silent failures in shipped features.

## Definition of done

1. **No hollow features in production:** every button/page either does the real thing or is removed/hidden behind a flag. No `console.log`-only submits, no "Coming Soon" in a shipped nav.
2. **Wiring integrity:** frontend→backend→python contracts match (paths, methods, tokens, response shapes). No dangling calls, no unmounted routers, no wrong ports/keys.
3. **Consistent API contract:** one response envelope convention across the backend; documented; clients rely on it safely.
4. **One system per concern:** redundant subsystems (Question/QuestionBank, the 4 assessment flows, 2 scoring systems, 2 chat stores) reconciled to a single canonical implementation each; dead tables dropped.
5. **Real integrations:** stubbed logic (payments, verification signals, sandbox, plagiarism, Wafaa/Youssra gRPC, resume extract) is either implemented or explicitly de-scoped and hidden.
6. **Data integrity:** correct column types (`postal_code` not Int), no duplicated sources of truth (certifications), coherent cascade-delete policy.
7. **Every core flow traced and green:** each role's primary journeys work start-to-finish (see the feature matrix).

## Current gaps (risks this pillar owns)
R-05 (payments), R-22, R-24, R-25, R-26, R-27, R-35, R-36, R-37, plus the per-role dead-ends and stubs catalogued in the matrices.

## Canonical user journeys that must be green
- **Candidate:** signup → onboarding → resume autofill → search → apply → assessment → coding → AI interview → results.
- **Company:** register + verify → post job (real) → source/rank candidates → invite to assessment → review → hire → subscribe/pay.
- **Agency:** apply → case → document upload + AI validation → embassy/housing/integration → messaging.
- **Admin:** login + MFA → verify companies → approve/reject agencies → (analytics/security-log/admins/settings exist and work).

## How we verify
- The [feature-completeness matrix](../matrices/feature-completeness-matrix.md) flips from 🟡/🔴 to 🟢 with a manual end-to-end pass per journey.
- The [api-contract-drift matrix](../matrices/api-contract-drift.md) reaches zero open mismatches.
- Integration tests cover each canonical journey.

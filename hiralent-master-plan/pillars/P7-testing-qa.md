# Pillar P7 — Testing & QA

> **Principle:** nothing reaches production untested. This project has never been tested end-to-end — that changes here. Tests are what let us refactor for security/scale without fear.

## Definition of done

1. **A real test framework** wired for backend (Jest/Vitest) and frontend (Vitest/RTL); the fake `echo` test script and orphan `__tests__` scripts replaced with runnable suites. Python services use pytest (extend existing).
2. **Unit tests** on core logic: auth/jwt, permissions/ownership, scoring, matching, execution grading, payment gateway logic, validation schemas.
3. **Integration tests** on each canonical user journey (candidate apply→assess→interview; company post→rank→invite→hire→pay; agency case→validate; admin verify/approve) hitting a test DB.
4. **Contract tests** for frontend↔backend↔python (paths, tokens, response shapes) so drift can't silently return.
5. **Security tests:** authz matrix (each role vs each endpoint), forged-token rejection, IDOR checks, code-exec containment.
6. **Load/performance tests** (k6/Artillery) codifying the P2 targets, runnable in CI/staging.
7. **CI gate:** type-check + lint + unit + integration must pass before merge/deploy; coverage tracked with a floor on critical modules.
8. **Manual QA pass** per role before staging and before production, tracked as a checklist.

## Current gaps (risks this pillar owns)
Effectively **~0% JS/TS coverage today**; no CI test gate; no load tests; no contract tests.

## Test strategy by layer
- **Fast unit** (pure logic, mocked IO) — run on every commit.
- **Integration** (test Postgres + Redis via compose) — run in CI.
- **E2E smoke** (Playwright optional) on the deployed staging stack — the canonical journeys.
- **Load** — scheduled/manual against staging.

## How we verify
- CI shows green unit+integration on every PR; coverage floor met on auth, payments, execution, matching.
- A per-role QA checklist is fully ticked before each of the staging and production gates.
- Load-test reports attached to the Wave 6/8 exit criteria.

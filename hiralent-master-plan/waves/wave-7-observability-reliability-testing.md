# Wave 7 — Observability, Reliability & Testing

> **Goal:** make the system operable and provably correct — you can see its health, it fails safely, and a test suite guards every critical path before we deploy. **Runs after Wave 6.**
>
> **Pillars advanced:** P6 (Observability & Reliability), P7 (Testing & QA).
> **Risks closed:** R-15, R-16, R-17, R-31, R-32 (finish).
> **Entry state:** no graceful shutdown, in-memory loss, no DLQ, no metrics endpoint, unstructured logs, ~0% tests.

---

## Phase 7.1 — Reliable lifecycle
- [ ] Add `uncaughtException` / `unhandledRejection` handlers (log context, exit cleanly). (R-15)
- [ ] **Graceful shutdown** on SIGTERM: drain HTTP, close BullMQ workers/queues, disconnect Prisma/Mongo/Redis. (R-15)
- [ ] Add a **reaper** that resets stale `RUNNING` submissions/jobs after restart. (R-15)

## Phase 7.2 — Durable jobs
- [ ] Remove in-memory queues/job-stores in prod (Redis/DB-backed); make any fallback fail loudly. (R-16)
- [ ] Make doc-validator deep-validation jobs durable (Redis/RQ) so they survive restarts + retry the webhook. (R-16)
- [ ] BullMQ: `attempts>1` + backoff, keep failed jobs / add a **DLQ**; alert when DB-outbox rows hit max attempts. (R-17)

## Phase 7.3 — Observability
- [ ] Expose **`/metrics`** (Prometheus) on backend + Python services; wire the existing `metrics.ts` counters; add queue-depth/run-duration/failure/external-latency. (R-31)
- [ ] Replace ~1371 `console.*` with the structured JSON logger; add levels + **request/correlation IDs** propagated backend→python. (R-31)
- [ ] Add **Sentry/APM** for request + worker + external-client errors. (R-31)
- [ ] Real health/readiness on Python services (copy the doc-validator pattern). (R-31)
- [ ] Confirm no secrets/tokens/PII in logs (bearer-token log already removed in Wave 1). (R-31)
- [ ] Alerting on: health down, queue backlog, DLQ growth, error-rate spikes, DB saturation.
- [ ] Finish email reliability: failures surfaced + logged + retried; a "failed email" state where it matters. (R-32)

## Phase 7.4 — Test framework & suites
- [ ] Wire a real test runner (Jest/Vitest) for backend + frontend; remove the fake `echo` script + orphan `__tests__`. (P7)
- [ ] **Unit tests:** jwt/auth, permissions/ownership, scoring, matching, execution grading, payment logic, validation schemas.
- [ ] **Integration tests** (test Postgres + Redis) for each canonical journey per role.
- [ ] **Contract tests** for frontend↔backend↔python (paths, tokens, envelopes) to prevent drift regressions.
- [ ] **Security tests:** authz matrix (role × endpoint), forged-token rejection, IDOR, code-exec containment.

## Phase 7.5 — CI quality gate
- [ ] CI runs type-check + lint + unit + integration on every PR; coverage floor on critical modules (auth, payments, execution, matching).

---

## Exit criteria
- ✅ Kill a worker mid-job → retried/DLQ'd, no stuck `RUNNING`; restart → state recovers, no data loss.
- ✅ Take down Postgres/Redis → `/health/ready` reports not-ready; alert fires.
- ✅ `/metrics` scrapes; a dashboard shows queue depth + latencies; a correlation ID traces a request across services.
- ✅ Unit + integration + contract + security tests pass in CI; coverage floor met.
- ✅ No in-memory job loss; DLQ in place; email failures visible.
- ✅ PROGRESS-LOG updated per change.

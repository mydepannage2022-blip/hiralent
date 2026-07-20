# Pillar P6 — Observability & Reliability

> **Principle:** we must always know the system's health, and it must fail safely — no invisible outages, no lost work on restart.

## Definition of done

1. **Health/readiness:** real `/health` (liveness) and `/health/ready` (checks Postgres/Redis/Mongo-if-used) mounted and used by probes/LB on every service — not a route that always returns 200.
2. **Graceful lifecycle:** `SIGTERM` drains HTTP, closes BullMQ workers/queues, disconnects Prisma/Mongo/Redis; `uncaughtException`/`unhandledRejection` handlers log context and exit cleanly. A **reaper** resets stale `RUNNING` submissions/jobs after restart.
3. **Durable work:** no in-memory queues/job-stores in prod (Redis/DB-backed); the in-memory fallback fails loudly, not silently. Deep-validation jobs survive restarts.
4. **Retry & DLQ:** BullMQ jobs use `attempts>1` + backoff and keep failures / route to a dead-letter; DB-outbox rows that hit max attempts raise an alert.
5. **Structured logging:** one JSON logger everywhere (replace ~1371 `console.*`); log levels; **request/correlation IDs** propagated across services. No secrets/tokens/PII in logs (remove the bearer-token log).
6. **Metrics:** `/metrics` exposed and scraped (Prometheus); key counters/histograms (queue depth, run duration, failures, external-call latency). Dashboards for the golden signals.
7. **Error tracking:** Sentry/APM capturing worker + request + external-client errors with context.
8. **External-call resilience:** timeouts + retries + circuit breakers on all cross-service/Gemini/SMTP/MinIO calls; `sendEmail` surfaces failure so flows can react.
9. **Alerting:** on-call-able alerts for down health, queue backlog, DLQ growth, error-rate spikes, DB saturation.

## Current gaps (risks this pillar owns)
R-15, R-16, R-17, R-31, R-32, R-33 (+ health route unmounted, metrics endpoint missing, token logging).

## How we verify
- Kill a worker mid-job → job retried/DLQ'd, no stuck `RUNNING`. Restart backend → in-flight state recovers, no data loss.
- Take down Postgres/Redis → `/health/ready` reports not-ready, LB stops routing, alert fires.
- A correlation ID traces one request across backend → python in logs.
- `/metrics` scrapes; a dashboard shows live queue depth and latencies.

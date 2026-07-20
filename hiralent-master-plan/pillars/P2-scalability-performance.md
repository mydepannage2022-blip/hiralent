# Pillar P2 — Scalability & Performance

> **Target:** comfortably serve **~2,000 RPS / 10,000 concurrent users** on good infra, with a clear, tested path to **100,000 users** — with no DB, service, or server collapse.

## Definition of done

1. **Database access:** exactly **one** shared `PrismaClient`; Postgres behind **PgBouncer** (transaction pooling) with bounded `connection_limit`. No unbounded query — every list endpoint paginated (`take`/`skip` or cursor) with `select` projections.
2. **Indexing:** every FK and every hot filter/sort column indexed; append-only firehose tables (analytics, telemetry, logs) partitioned or offloaded/retained on a policy.
3. **Caching:** Redis read-cache on hot paths (job lists, rankings, dashboards, profiles) with sane TTL + invalidation; HTTP `Cache-Control`/ETag on cacheable GETs.
4. **Async offload:** all heavy work (AI generation, code execution, OCR, matching, scraping, email) runs in queues/workers, never inline in the request path. Workers have tuned **concurrency** + rate limits + backpressure.
5. **Code runner at scale:** compile-once/run-many; a warm, bounded, autoscaled runner pool (or persistent runner service) instead of one cold container per test case.
6. **External calls:** every cross-service/LLM call has a timeout, bounded retries with backoff, and a **circuit breaker** + bulkhead so one slow dependency can't cascade.
7. **Statelessness (horizontal scale):** backend runs N instances behind a load balancer — Socket.IO Redis adapter; Redis-backed rate limiter; leader-elected/singleton cron; SSE via Redis pub/sub; uploads in MinIO/S3 (not local disk); no in-memory queue fallback in prod.
8. **Python services:** non-blocking (offload sync Gemini to threads/executor); run multiple workers + horizontal replicas.
9. **Frontend perf:** no `cache:"no-store"` blanket; React-Query `staleTime`; stable build IDs; route-level code-split; heavy ML (proctoring) lazy-loaded.

## Current gaps (risks this pillar owns)
R-06, R-18, R-19, R-20, R-30, R-42 (+ supports R-07, R-16).

## How we verify
- **Load tests** (k6/Artillery) at 500 → 2,000 RPS on key journeys; watch p95 latency, error rate, DB connections, CPU.
- DB connection count stays bounded under load; no pool-exhaustion errors.
- Chaos check: kill/slow one AI service → circuit breaker trips, rest of app stays up.
- Multi-instance test: run 2+ backend instances → realtime, rate-limit, and cron behave correctly.
- A documented **capacity model**: "at X infra we handle Y RPS; to reach 100k we scale Z."

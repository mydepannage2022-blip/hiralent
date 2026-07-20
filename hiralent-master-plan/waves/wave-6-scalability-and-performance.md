# Wave 6 — Scalability & Performance

> **Goal:** make the system survive real load (2k RPS / 10k users) with a proven path to 100k — stateless, cached, async, and resilient under dependency failure. Builds on the DB fixes from Wave 2. **Runs after Wave 5.**
>
> **Pillar advanced:** P2 (Scalability & Performance).
> **Risks closed:** R-18, R-19, R-20 (caching half), R-42.
> **Entry state:** no caching, inline heavy work, concurrency-1 workers, per-test containers, event-loop-blocking AI calls, non-stateless.

---

## Phase 6.1 — Statelessness (enable horizontal scaling)
- [ ] Add the **Socket.IO Redis adapter** so realtime works across instances. (R-19)
- [ ] Move SSE delivery (`push.ts`) onto Redis pub/sub (reuse the `submissionEmitter` bridge) so events reach clients on any instance. (R-19)
- [ ] Redis-backed rate limiter (from Wave 1) confirmed shared across instances. (R-19)
- [ ] **Leader-elected / singleton cron** (interview + scraping schedulers) so N instances don't duplicate work. (R-19)
- [ ] Serve/read uploads from **MinIO/S3**, not local disk. (R-19)
- [ ] Remove the in-memory queue fallback in prod (fail loud if Redis is down). (R-19)

## Phase 6.2 — Caching & read-path optimization
- [ ] Add a **Redis read-cache** on hot paths (job lists, candidate rankings, dashboards, profiles, search) with TTL + explicit invalidation. (R-20)
- [ ] Add HTTP `Cache-Control`/ETag on cacheable GETs.
- [ ] Confirm pagination + `select` projections from Wave 2 cover all list endpoints.

## Phase 6.3 — Async & worker throughput
- [ ] Raise BullMQ **worker concurrency** (tuned per queue) + add rate limiters/backpressure. (R-18)
- [ ] Ensure all heavy work (AI gen, OCR, matching, scraping, email, code-exec) runs in queues, never inline in the request path. (R-18)

## Phase 6.4 — Code runner at scale
- [ ] **Compile-once/run-many** per submission (stop recompiling per test case).
- [ ] A warm, bounded, autoscaled runner pool (or persistent runner service) instead of one cold container per test. (R-18 area)
- [ ] Cap concurrent runner containers to protect host CPU/Docker daemon.

## Phase 6.5 — External-call resilience
- [ ] Timeouts on **every** cross-service/Gemini/SMTP/MinIO call; bounded retries with backoff. (R-18)
- [ ] **Circuit breakers + bulkheads** so one slow/down dependency fast-fails instead of cascading into pool exhaustion. (R-18)

## Phase 6.6 — Python services performance
- [ ] Offload blocking Gemini calls (`asyncio.to_thread`/executor) so the event loop isn't blocked. (R-18)
- [ ] Run Python services with multiple workers (Gunicorn/uvicorn `--workers`) + horizontal replicas.

## Phase 6.7 — Frontend performance
- [ ] Remove blanket `cache:"no-store"`; set React-Query `staleTime`; drop `generateBuildId: Date.now()` (restore immutable caching). (R-42)
- [ ] Lazy-load heavy ML (TensorFlow/MediaPipe proctoring); route-level code-split; trim bundle.

---

## Exit criteria
- ✅ **Load test** (k6/Artillery) sustains ~2,000 RPS on key journeys with acceptable p95 and error rate; DB connections stay bounded; no pool exhaustion.
- ✅ Multi-instance run: realtime, rate-limits, cron, uploads all correct across ≥2 backend instances.
- ✅ Chaos test: a slow/down AI service trips the circuit breaker; the rest of the app stays healthy.
- ✅ Hot reads are cache-served; list endpoints paginated; code runner no longer recompiles per test.
- ✅ Python AI services handle concurrent requests without serializing.
- ✅ A written **capacity model** ("at X infra → Y RPS; scale Z for 100k") is documented.
- ✅ PROGRESS-LOG updated per change.

# 01 — Risk Register

> Every material risk found in the audit, ranked. Each has an ID (stable, referenced from wave files), severity, the pillar it threatens, and the **wave that closes it**. Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low.
> "Fixed in" points to the wave where the fix lands; verification is part of that wave's exit criteria.

## 🔴 Critical

| ID | Risk | Impact | Fixed in |
|---|---|---|---|
| R-01 | `JWT_SECRET=yourSuperSecretKey` | Anyone can forge tokens → full auth/authz bypass, superadmin takeover | Wave 1 |
| R-02 | Live Gemini API key committed in `ai-service/app/gemini_service.py:47` | Key theft, billing abuse, must be treated as compromised | Wave 1 |
| R-03 | Code-execution can run on the host (sandbox stubs + dispatcher host fallback + unauth runner HTTP stub) | Remote code execution on backend host | Wave 1 (lock path) + Wave 4 (real sandbox) |
| R-04 | Frontend `next build` fails; backend 153 TS errors | Cannot produce a production build at all | Wave 0 |
| R-05 | Payments entirely fake (no Stripe/PayPal SDK) | No revenue possible; "paid" users unpaid | Wave 5 |
| R-06 | 88 `new PrismaClient()` → DB connection exhaustion | Backend collapses in low-hundreds of concurrent users | Wave 2 |
| R-07 | `SHADOW_DATABASE_URL=${DATABASE_URL}` (latent — `schema.prisma` never declared `shadowDatabaseUrl` & `dotenv@16` doesn't expand `${...}`, so the var was inert) | Any `prisma migrate dev` wipes the primary/production DB **if** shadow ever gets wired to primary | ✅ **Wave 0 / Session 5** — line commented + documented; schema kept free of `shadowDatabaseUrl`; guarded by `verify-config-hygiene.mjs` |

## 🟠 High

| ID | Risk | Impact | Fixed in |
|---|---|---|---|
| R-08 | Unauthenticated doc-validation webhook | KYC/verification spoofing | Wave 1 |
| R-09 | Unauthenticated `POST /api/ocr` (no auth/size/type) | Resource-abuse DoS, arbitrary uploads | Wave 1 |
| R-10 | IDOR on `/submissions/:id` + `/stream/:id`; `POST /submissions` accepts body `userId` | Read any candidate's code; create submissions as anyone | Wave 1 |
| R-11 | CVs (PII) served static from `/uploads`, no auth | GDPR / data exposure | Wave 1 |
| R-12 | No Dockerfile for backend API or frontend; no full-stack orchestration | Cannot deploy the two core services | Wave 8 |
| R-13 | `host.docker.internal` + hardcoded `localhost` in backend source | Inter-service calls & email links break on staging/prod | Wave 3 (env-drive) + Wave 8 |
| R-14 | Secrets baked into Docker images (`.dockerignore` gaps) | Credential leak in shipped images | Wave 8 (+ rotate in Wave 1) |
| R-15 | No graceful shutdown / crash handlers; stuck-`RUNNING` submissions | Lost/duplicated work, zombie states on every deploy | Wave 7 |
| R-16 | In-memory queues + doc-validator job dict | Job/result loss on restart | Wave 7 |
| R-17 | BullMQ `attempts:1, removeOnFail:true` (no DLQ) | Silent job loss on transient failure | Wave 7 |
| R-18 | Python AI services block event loop; single worker; no retries/circuit-breakers on AI calls | AI features serialize; slow AI cascades to full outage | Wave 6 |
| R-19 | Not horizontally scalable (Socket.IO no Redis adapter, in-proc SSE, cron per instance, MemoryStore limiter, local uploads) | Adding instances breaks realtime, dupes work, splits limits | Wave 6 |
| R-20 | No caching + ~153 unpaginated `findMany` | Every read hits DB; unbounded payloads; DB overload | Wave 2 (indexes/pagination) + Wave 6 (cache) |
| R-21 | No superadmin/role-permission seed; no migration step in deploy | Fresh DB unusable (no admin, unmigrated) | Wave 2 + Wave 8 |
| R-22 | Admin Agencies page sends `Bearer null` (wrong token key) | Whole agency-verification admin screen non-functional | Wave 3 |
| R-23 | `mockAssessment.routes` + dummy-admin middleware reachable in prod | Integrity bypass / fake scoring injection | Wave 1 |

## 🟡 Medium

| ID | Risk | Impact | Fixed in |
|---|---|---|---|
| R-24 | `/resume/extract` dangling call | Resume autofill 404s | Wave 3 |
| R-25 | Session-management router never mounted | "Sign out other devices" broken | Wave 3 |
| R-26 | Doc-validation webhook wrong port (4000 vs 5000) | Deep-validation results silently lost | Wave 3 |
| R-27 | `NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_BASE_URL` conflict | Class of frontend calls 404 depending on env | Wave 3 |
| R-28 | No security headers (helmet wrong framework); rate-limit only on auth | XSS/clickjacking exposure; brute-force/DoS | Wave 1 |
| R-29 | 7-day tokens, no rotation; `session_id` defaults to `'bypass'`; optional blacklist | Weak session/logout enforcement | Wave 1 |
| R-30 | Missing indexes on hot tables; unbounded firehose tables (UsageAnalytics, telemetry, logs) | Slow queries, DB bloat as data grows | Wave 2 |
| R-31 | No structured logging / correlation IDs / metrics endpoint / APM | Outages are invisible; no debugging trail | Wave 7 |
| R-32 | `sendEmail` swallows errors | Users stuck unverified with no signal | Wave 3/7 |
| R-33 | Mongo hard-required at boot but stores no data | Unused dependency can crash-loop prod | Wave 2/3 |
| R-34 | Prompt-injection surface (scraped/OCR content → Gemini) | Skewed verdicts/scores driving hiring | Wave 4/6 |
| R-35 | `postal_code Int`; certifications triplicated; 44/142 relations missing `onDelete` | Data-loss/insert failures; inconsistent deletes | Wave 2 |
| R-36 | Response-envelope inconsistency; unhandled promise paths | Sporadic `undefined`/crash bugs | Wave 3 |
| R-37 | Redundant subsystems (Question/QuestionBank, 4 assessments, 2 scoring, 2 chat) | Split query paths, maintenance hazard, confusion | Wave 4 |

## ⚪ Low / hygiene

| ID | Risk | Impact | Fixed in |
|---|---|---|---|
| R-38 | Dual lockfiles (npm + pnpm) at 3 levels | Non-reproducible installs | Wave 0 |
| R-39 | Duplicate/wrong deps (bcrypt+bcryptjs, redis+ioredis, `crypto`, `@fastify/*`, 2 Pinecone clients, zod v3/v4) | Bloat, inconsistency | Wave 0 |
| R-40 | Dead files/entry points, committed backups/logs/temp/`dev.db`, `.lnk` | Repo bloat, confusion, accidental use | Wave 0 |
| R-41 | UTF-16 `requirements.txt`; unpinned Python deps; google-generativeai/pydantic version spread | Docker build breakage, drift | Wave 0/8 |
| R-42 | `generateBuildId: Date.now()`; `cache:"no-store"` everywhere; no `staleTime` (frontend nav perf) | Slow UX, busted browser caching | Wave 6 |
| R-43 | Corrupt `[object Promise]` line in `backend/.env` | Confusing config errors | ✅ **Wave 0 / Session 5** — line removed; guarded by `verify-config-hygiene.mjs` |

---

## How to use this register

- When a wave starts, its file lists the R-IDs it must close.
- When a risk is fixed, mark it in the wave's checklist and add a [`PROGRESS-LOG.md`](PROGRESS-LOG.md) entry referencing the R-ID.
- A risk is only "closed" once its fix is **verified** (test, manual check, or reproduction gone) — not merely coded.

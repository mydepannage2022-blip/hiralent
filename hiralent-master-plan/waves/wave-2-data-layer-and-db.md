# Wave 2 — Data Layer & Database

> **Goal:** make the database layer correct, safe to deploy fresh, and ready to scale — the single biggest scalability blocker (Prisma client sprawl) lives here. **Runs after Wave 1.**
>
> **Pillars advanced:** P2 (Scalability), P3 (Correctness), P5 (deploy seeds/migrations).
> **Risks closed:** R-06, R-21, R-30, R-35 · **finishes:** R-07 · **reduces:** R-20 (indexes/pagination), R-33 (Mongo).
> **Entry state:** 88 Prisma clients, no pooling, missing indexes, no migration/seed on deploy, data-model bugs.

---

## Phase 2.1 — One Prisma client + pooling (the #1 scale fix)
- [x] **[S1]** Replace all `new PrismaClient()` across `src/**` (actual: 102 occurrences / **83 instantiating files**) with the shared `lib/prisma.ts` singleton; add a grep/CI gate forbidding new instantiations. (R-06) — done via risk-spike → deterministic codemod (73) + hand-fix (10); new `tools/verify-prisma-singleton.mjs` (comment/template-literal aware, 1 allowlisted separate-DB script); `tsc` + boot (`verify-local-run`) + full gate **23/23** green. Seeds/root-scripts deferred (S3/throwaway).
- [x] **[S2]** Configure a bounded `connection_limit` + `pool_timeout`; stand up **PgBouncer** (transaction pooling) in front of Postgres; set `directUrl` for migrations. (R-06) — `DATABASE_URL` now carries `connection_limit=10&pool_timeout=20` (pool math `(1+6)×10=70 < 100`); `directUrl = env("DIRECT_DATABASE_URL")` added to `schema.prisma` + `.env.example` (runtime-safe: Client boot/`generate` don't need it, only `migrate`); `pgbouncer` service (transaction mode, 6432) **defined** in root `docker-compose.yml` under a dormant `pooler` profile — **live wiring (`pgbouncer=true`, per-worker sizing) deferred to Wave 8**. Gated by new `tools/verify-db-pool-config.mjs`. `prisma.ts` untouched (S1 export contract).
- [x] **[S2]** Load-sanity check: under concurrency, backend holds a bounded, small connection count. — new INFRA gate `tools/verify-connection-pool.mjs` proves it **live** via `pg_stat_activity`: Test A (15 concurrent queries on a `connection_limit=5` client → peak 5/5) + Test B (real booted server, 30 parallel signups → peak 5/5). Measurement isolated by `application_name` (confirmed to pass through Prisma 6.19). Full gate **25/25 green**.

## Phase 2.2 — Migration & fresh-setup safety
- [x] **[S3]** Confirm the 57-migration chain applies cleanly from an empty DB (`migrate deploy`); document the duplicate-label pair as harmless. — proven live by new `tools/verify-migration-safety.mjs`: creates a **throwaway** DB, `migrate deploy` applies all 57 (`_prisma_migrations` == on-disk folders), `migrate status` up-to-date; static half asserts exactly one documented-harmless dup-label (`add_pattern_generation_fields`) and fails on any NEW dup.
- [x] **[S3]** Add an automated **`prisma migrate deploy`** step to the deploy/container flow (wired fully in Wave 8; defined here). (R-21) — `db:migrate` = `prisma migrate deploy` asserted present; dormant `backend/Procfile` (`release: pnpm db:migrate`) added. Full platform wiring = Wave 8.
- [x] **[S3]** Verify `SHADOW_DATABASE_URL` separation from Wave 0 holds; ensure `migrate dev` is never run against prod. (R-07) — `verify-migration-safety.mjs` re-asserts no `shadowDatabaseUrl` in schema (complements `verify-config-hygiene.mjs`); all live migrate/seed tests run on self-created `hiralent_s3_*test` throwaways, never the primary.

## Phase 2.3 — Seeds for a usable environment
- [x] **[S3]** Add a **superadmin** seed + **RolePermission** matrix seed (none exist today → fresh DB has no admin). (R-21) — new `seeds/superadmin.seed.ts` (idempotent upsert, prod-safe creds policy) + `seeds/rolePermissions.seed.ts` (4 roles × 12 modules = 48, deterministic-PK upsert). Also fixed an admin **login-route shadow** in `app.ts` so the seeded superadmin can actually authenticate (`/api/v1/admin/auth/login` → 200).
- [x] **[S3]** Wire the orphaned `seed-assessment-templates.ts` into the seed flow; confirm plans/badges seed. — plans + badges confirmed seeding in the core flow (badges de-duplicated to one canonical 8-badge source). `seed-assessment-templates.ts` made a **gated opt-in** standalone (`seed:assessment-templates`, degrades gracefully) — deliberately kept OUT of the prod-safe bootstrap because it needs a running API + valid token + question bank.
- [x] **[S3]** Provide an idempotent, prod-safe seed (no blind `deleteMany`) for staging/prod bootstrap. — `seed.ts` split into `seedCore()` (upsert-only, always) + `seedDemo()` (dev-only, `NODE_ENV`-gated); blind `subscriptionPlan.deleteMany` and the `companyJob.create` dup-loop removed. Proven by `tools/verify-seed-safety.mjs` (2nd run = identical counts; prod-mode runs no demo/destructive op).

## Phase 2.4 — Indexing & pagination for scale
- [x] Add indexes on hot/append-only tables: `UsageAnalytics`, `Message(conversation_id, sent_at)`, `CommunicationLog`, `CodeSubmission`, `AdminAuditLog`, and every unindexed `candidate_id`/`company_id`/`agency_id`/status/created_at FK & filter column. (R-30) — **Session 4 (2026-07-27):** 36 indexes across 22 **curated** hot tables in one additive migration (`20260727164418_add_hot_table_indexes`); cold lookup tables + already-`@unique` columns deliberately skipped to avoid write-bloat. Proven via `verify-index-coverage.mjs` — `EXPLAIN` shows Index Scan on all 5 flagged hot queries + Seq-Scan control (gate 27→28).
- [x] Add pagination (`take`/`skip` or cursor) + `select` projections to the ~153 unbounded `findMany` list endpoints (prioritize dashboards, messages, notifications, candidates, jobs, cases). (R-20/R-30) — **Session 5 (2026-07-27):** the real unbounded user-facing set was **7 endpoints + 1 count-misuse** (most were already bounded). Added a shared `parsePagination`/`setPaginationHeaders` helper (single clamp surface, `MAX_LIMIT`), unified the 3 drifting legacy clamps, and bounded 7 list endpoints (job applicants, my-jobs ×2, conversations, agency cases, candidate cases, browse agencies) with cap + optional `?page`/`?limit` + `select`. **Non-breaking**: response bodies unchanged, pagination metadata via `X-*` headers (CORS-exposed) — frontend stays green. Count-misuse (`getDashboardStats`) → DB-side `groupBy`. **Deferred (flagged):** `getClientsForAgency` + agency dashboard analytics are *aggregations* (blind cap would corrupt stats) → DB-side aggregation follow-up; frontend see-beyond-cap paging UI. Proven by `verify-pagination.mjs` (unit + static + live cap + header) (gate 28→29).
- [x] Define a retention/partition policy for firehose tables (analytics, telemetry, audit/comm logs). (R-30) — **Session 5 (2026-07-27):** per-table policy map + **opt-in** batched reaper (`RETENTION_ENABLED=false` default) in `retention.service.ts` + `retention.scheduler.ts` (node-cron), wired in `server.ts`. Reaps 6 already-indexed firehose tables by age cutoff. Native/pg_partman **partitioning deferred to Wave 8** (migration-heavy). Proven by `verify-pagination.mjs` retention mutation test (aged-only deletion).

## Phase 2.5 — Data-model correctness
- [x] Fix `CandidateProfile.postal_code Int → String`. (R-35) — **Session 6:** schema `String?` + `ALTER … TYPE TEXT` (migration `..100200_data_model_fixes`); backend zod + types `number→string`; frontend input `type="text"`, `Number()` coercion removed. Alphanumeric insert live-proven by `verify-data-model.mjs`.
- [x] Resolve certifications duplication (Json copy vs `Certification` table) — pick the relation as source of truth. (R-35) — **Session 6:** dropped `CandidateProfile.certifications` Json; `Certification` table is sole source; `search.service.ts` rewritten to an `EXISTS` join; live-proven cert-only match.
- [x] Define & apply a coherent `onDelete` policy for the 44/142 relations missing one; decide soft-delete vs cascade for `User` deletion (GDPR). (R-35) — **Session 6:** all **142 FKs** declare explicit `onDelete` (migration `..100000_fk_ondelete_policy`: 23 Cascade + 2 audit SetNull; rest default-correct). **Decision: HARD delete + cascade** (owned PII cascaded, audit rows de-identified). Hard-delete of company_admin/candidate live-proven.
- [x] Drop/deprecate dead tables `QuestionBank`, `ChatHistory` (and write-only `CandidateGlobalScore*`) via a migration once confirmed unused. (supports R-37) — **Session 6:** dropped `question_bank`, `chat_history`, `candidate_global_score(+history)` + the write-only global-score writer (migration `..100100_drop_legacy_tables`); absence asserted by `verify-data-model.mjs`.

## Phase 2.6 — Mongo decision
- [x] Decide: remove the unused MongoDB dependency, **or** keep it but stop the hard `process.exit(1)` boot dependency (it stores no app data today). Document the decision. (R-33) — **Session 6 — DECISION: remove entirely** (0 data, 0 reads). Deleted `lib/mongo.ts` + wiring, dropped `mongodb`/`@types/mongodb` + all Mongo env, removed the dead live Atlas cred. Mongo-less boot (`/health` db:up) live-proven by `verify-data-model.mjs`.

---

## Exit criteria
- ✅ Exactly one `PrismaClient` in the codebase (CI-enforced); PgBouncer + bounded pool in place; connection count stays bounded under load.
- ✅ A fresh DB can be created via `migrate deploy` + seed and immediately has a working superadmin, roles, and plans.
- ✅ No command can wipe the primary DB.
- ✅ All flagged hot tables/FKs indexed; list endpoints paginated; `EXPLAIN` on top queries shows index use.
- ✅ `postal_code`, certifications, and `onDelete` policy fixed; dead tables removed.
- ✅ Mongo boot behaviour decided and safe.
- ✅ PROGRESS-LOG updated per change.

---

## Wave 2 gate — CLOSED (Session 7, 2026-07-29)

The wave exits on a **composed** proof, not just per-slice checks. `tools/verify-e2e-fullpath.mjs` runs the whole path on **one** fresh throwaway DB in one continuous flow: empty → `migrate deploy` → core seed (loginable superadmin, no demo) → boot (`/health` db:up) → superadmin full MFA login (wrong password rejected) → **30 concurrent paginated reads** (each ≤ cap + `X-Total-Count`) with the **server pool bounded** ≤ `connection_limit` → hot query **Index-Scan at 20k rows** (Seq-Scan control) → `/health` still db:up. `tools/verify-guard-teeth.mjs` is the negative control — reintroducing a stray `new PrismaClient()`/`$disconnect()` flips the singleton gate RED (teeth), and the blind-`deleteMany` guard is intact.

Full ledger: [`matrices/wave-2-data-gate.md`](../matrices/wave-2-data-gate.md). **Full verifier gate `run-all-verifiers.mjs` → 32/32 green** (30 prior + 2 new). **R-30 closed** (was the last unmarked Wave-2 risk). Carried forward (documented): PgBouncer live wiring + platform `db:migrate` (Wave 8), aggregation reads + caching (Wave 6), remaining subsystem consolidation (Wave 4), `deleteAccount` cascade timeout for very large employers (Wave 8).

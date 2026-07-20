# Wave 2 — Data Layer & Database

> **Goal:** make the database layer correct, safe to deploy fresh, and ready to scale — the single biggest scalability blocker (Prisma client sprawl) lives here. **Runs after Wave 1.**
>
> **Pillars advanced:** P2 (Scalability), P3 (Correctness), P5 (deploy seeds/migrations).
> **Risks closed:** R-06, R-21, R-30, R-35 · **finishes:** R-07 · **reduces:** R-20 (indexes/pagination), R-33 (Mongo).
> **Entry state:** 88 Prisma clients, no pooling, missing indexes, no migration/seed on deploy, data-model bugs.

---

## Phase 2.1 — One Prisma client + pooling (the #1 scale fix)
- [ ] Replace all **88 `new PrismaClient()`** across 85 files with the shared `lib/prisma.ts` singleton; add a grep/CI gate forbidding new instantiations. (R-06)
- [ ] Configure a bounded `connection_limit` + `pool_timeout`; stand up **PgBouncer** (transaction pooling) in front of Postgres; set `directUrl` for migrations. (R-06)
- [ ] Load-sanity check: under concurrency, backend holds a bounded, small connection count.

## Phase 2.2 — Migration & fresh-setup safety
- [ ] Confirm the 56-migration chain applies cleanly from an empty DB (`migrate deploy`); document the duplicate-label pair as harmless.
- [ ] Add an automated **`prisma migrate deploy`** step to the deploy/container flow (wired fully in Wave 8; defined here). (R-21)
- [ ] Verify `SHADOW_DATABASE_URL` separation from Wave 0 holds; ensure `migrate dev` is never run against prod. (R-07)

## Phase 2.3 — Seeds for a usable environment
- [ ] Add a **superadmin** seed + **RolePermission** matrix seed (none exist today → fresh DB has no admin). (R-21)
- [ ] Wire the orphaned `seed-assessment-templates.ts` into the seed flow; confirm plans/badges seed.
- [ ] Provide an idempotent, prod-safe seed (no blind `deleteMany`) for staging/prod bootstrap.

## Phase 2.4 — Indexing & pagination for scale
- [ ] Add indexes on hot/append-only tables: `UsageAnalytics`, `Message(conversation_id, sent_at)`, `CommunicationLog`, `CodeSubmission`, `AdminAuditLog`, and every unindexed `candidate_id`/`company_id`/`agency_id`/status/created_at FK & filter column. (R-30)
- [ ] Add pagination (`take`/`skip` or cursor) + `select` projections to the ~153 unbounded `findMany` list endpoints (prioritize dashboards, messages, notifications, candidates, jobs, cases). (R-20/R-30)
- [ ] Define a retention/partition policy for firehose tables (analytics, telemetry, audit/comm logs).

## Phase 2.5 — Data-model correctness
- [ ] Fix `CandidateProfile.postal_code Int → String`. (R-35)
- [ ] Resolve certifications duplication (Json copy vs `Certification` table) — pick the relation as source of truth. (R-35)
- [ ] Define & apply a coherent `onDelete` policy for the 44/142 relations missing one; decide soft-delete vs cascade for `User` deletion (GDPR). (R-35)
- [ ] Drop/deprecate dead tables `QuestionBank`, `ChatHistory` (and write-only `CandidateGlobalScore*`) via a migration once confirmed unused. (supports R-37)

## Phase 2.6 — Mongo decision
- [ ] Decide: remove the unused MongoDB dependency, **or** keep it but stop the hard `process.exit(1)` boot dependency (it stores no app data today). Document the decision. (R-33)

---

## Exit criteria
- ✅ Exactly one `PrismaClient` in the codebase (CI-enforced); PgBouncer + bounded pool in place; connection count stays bounded under load.
- ✅ A fresh DB can be created via `migrate deploy` + seed and immediately has a working superadmin, roles, and plans.
- ✅ No command can wipe the primary DB.
- ✅ All flagged hot tables/FKs indexed; list endpoints paginated; `EXPLAIN` on top queries shows index use.
- ✅ `postal_code`, certifications, and `onDelete` policy fixed; dead tables removed.
- ✅ Mongo boot behaviour decided and safe.
- ✅ PROGRESS-LOG updated per change.

# Wave 2 Data-Layer Gate — reproduce → now-fixed ledger

**Purpose.** The Wave-2 exit criterion is not "the code changed" — it is that each data-layer risk
**reproduces as fixed**: the original failure, exercised against the current code, is now prevented,
and a repeatable test proves it. This ledger maps every closed Wave-2 risk to the exact automated
proof, and adds the end-to-end composed journey that ties the slices together. Run the whole set with:

```bash
node hiralent-master-plan/tools/run-all-verifiers.mjs
```

_Compiled: Session 7 (2026-07-29). Environment: Postgres on :5432 up (superuser). All live checks run
on self-created throwaway DBs (`hiralent_s{3,4,5,6,7}_*`) — the primary `hiralent` is never touched._

## Ledger

| R-ID | Risk (severity) | Reproduce (the original failure) | Now-fixed proof (verifier : stage) | Status |
|---|---|---|---|---|
| **R-06** | 88 `new PrismaClient()` → connection exhaustion; unbounded pool (Crit) | Grep `src/**` for stray clients; flood the pool past its limit | `verify-prisma-singleton.mjs` — exactly one client in `src/**` (+1 allowlisted separate-DB script); `verify-guard-teeth.mjs` — reintroducing a stray `new PrismaClient()`/`$disconnect()` flips the gate RED (teeth); `verify-connection-pool.mjs` + `verify-e2e-fullpath.mjs [E]` — live `pg_stat_activity` peak ≤ `connection_limit` under 30 concurrent reads | ✅ Fixed (PgBouncer live-wiring + per-worker sizing → Wave 8) |
| **R-07** | `migrate dev` could wipe the primary DB via a wired shadow (Crit) | Point a shadow at primary and run `prisma migrate dev` | `verify-migration-safety.mjs` — no `shadowDatabaseUrl` in schema, fresh `migrate deploy` chain applies on a throwaway, `migrate diff --exit-code` = 0 (no drift); `verify-config-hygiene.mjs` — no uncommented `SHADOW_DATABASE_URL`; only `db:migrate = migrate deploy` is wired | ✅ Fixed (full deploy wiring → Wave 8) |
| **R-21** | Fresh DB unusable — no superadmin/roles/plans, no migrate step (High) | Point at an empty DB → no admin can log in | `verify-seed-safety.mjs` — fresh DB → `migrate deploy` + `db seed` → plans/badges/48-row RBAC + superadmin completes the full MFA login; idempotent; prod-safe (no default admin, no blind deleteMany); `verify-e2e-fullpath.mjs [A][B][D]` — empty → migrate → core seed → superadmin full login end-to-end | ✅ Fixed (platform runs `db:migrate` → Wave 8) |
| **R-30** | Missing hot-table indexes; unbounded firehose tables (Med) | Run a hot query at scale → Seq Scan; let firehose tables grow forever | `verify-index-coverage.mjs` — required indexes declared + 5 hot queries `EXPLAIN` Index-Scan (Seq-Scan control) at 20k rows; `verify-pagination.mjs` — retention reaper deletes aged-only; `verify-e2e-fullpath.mjs [E][F]` — indexed read Index-Scans at 20k on the SAME journey DB | ✅ Fixed |
| **R-20** | ~153 unpaginated `findMany` → unbounded payloads (High) | Request a list endpoint with `?limit=99999` → whole table returned | `verify-pagination.mjs` — `parsePagination` clamp (unit) + 7 endpoints bounded (static) + hostile `?limit=99999` returns ≤ cap with `X-Total-Count` (live); `verify-e2e-fullpath.mjs [E]` — 30 concurrent reads each ≤ 100 + `X-Total-Count` under load | 🟡 Read-side bounded (aggregation reads + caching → Wave 6) |
| **R-33** | Mongo hard-required at boot but stores no data (Med) | Make Mongo unreachable → prod `process.exit(1)` crash-loop | `verify-data-model.mjs` — Mongo fully removed (lib/wiring/deps/env), backend boots healthy with no Mongo env (`/health` db:up); `verify-e2e-fullpath.mjs [C]` — real boot to `/health` db:up with no Mongo | ✅ Fixed |
| **R-35** | `postal_code Int`; certifications triplicated; 44/142 FKs missing `onDelete` (Med) | Enter "SW1A 1AA"; delete a company account → FK RESTRICT error | `verify-data-model.mjs` — postal_code String, certifications single-source (`EXISTS`), all 142 FKs explicit `onDelete`; hard-delete of company_admin/candidate succeeds with cascade + audit de-identified | ✅ Fixed |
| **R-37** | Redundant/dead tables (partial) | Query a dead table / trace a write-only writer | `verify-data-model.mjs` — `question_bank`/`chat_history`/`candidate_global_score(+history)` dropped and absent; no references to dropped models | 🟡 3 dead tables gone (remaining consolidation → Wave 4) |

## The composed journey (what the slices never proved together)

Beyond the per-slice proofs above, `verify-e2e-fullpath.mjs` runs the **whole path on ONE fresh
throwaway DB, in one continuous flow** — the thing each isolated verifier never exercises together:

> empty DB → `migrate deploy` → core seed (loginable superadmin, **no** demo) → boot (`/health` db:up)
> → superadmin **full MFA login** (wrong password rejected) → **30 concurrent paginated reads**
> (each ≤ 100 + `X-Total-Count` correct) with the **server pool bounded** at ≤ `connection_limit`
> → hot query **Index-Scan at 20k rows** (Seq-Scan control) → `/health` still db:up.

And `verify-guard-teeth.mjs` is the negative control: it proves the safety gates have **teeth** —
reintroducing a stray `new PrismaClient()` or a request-path `$disconnect()` flips the singleton gate
RED (and names the file), and the behavioral blind-`deleteMany` guard in `verify-seed-safety` is intact.
A green gate only means something because it turns red when the invariant is violated.

## What is NOT closed here (carried forward, honestly)

- **PgBouncer live wiring** + per-worker pool sizing (R-06) → Wave 8 (service defined, dormant profile).
- **Platform-run `db:migrate`** on deploy (R-21) → Wave 8 (dormant `Procfile release:` present).
- **Aggregation reads** (`getClientsForAgency`, agency dashboard analytics) + **caching** (R-20) → Wave 6;
  **see-beyond-cap paging UI** (frontend) → later.
- **Remaining duplicate subsystems** (`Question` canonical, 4 assessment flows, `CandidateScore`) (R-37) → Wave 4.
- **`deleteAccount` 30s transaction timeout** for a very large employer (cascade volume) → Wave 8 (scale item).
- **Native/pg_partman partitioning** of firehose tables (R-30) → Wave 8 (retention reaper covers it for now).

# Wave 0 — Triage & Foundation

> **Goal:** get the project to a clean, buildable, runnable baseline on one consistent toolchain — without changing behaviour. Nothing else can be trusted until the thing builds and runs. **This wave is completed and verified in full before Wave 1.**
>
> **Pillars advanced:** P4 (Code Quality), P5 (DevOps — config hygiene).
> **Risks closed:** R-04, R-38, R-39, R-40, R-41, R-43 · **partially:** R-07 (shadow DB), R-33 (Mongo boot).
> **Entry state:** neither app builds; dual lockfiles; dead code; corrupt `.env`; Prisma client not generated.

---

## Phase 0.1 — Freeze & safety net
- [ ] Create a working branch off `main` (e.g. `stabilize/wave-0`); confirm clean `git status` baseline.
- [ ] Snapshot current `.env` files securely (they hold live creds we will rotate in Wave 1) and record every var into `matrices/env-var-matrix.md`.
- [ ] Confirm we can run the existing dev flow at least partially (document what starts and what doesn't) — this is our "before" reference for PROGRESS-LOG.

## Phase 0.2 — One toolchain
- [ ] Choose **one** package manager (recommend **pnpm**, given `pnpm-lock.yaml` + workspace stub already present). Decide and document. (R-38)
- [ ] Delete the other lockfiles (`package-lock.json`) at root/backend/frontend; keep only the chosen one.
- [ ] Fix or remove the junk **root `package.json`** — either make it a real workspace root (`pnpm-workspace.yaml` with `packages:`) or remove it so backend/frontend are independent. (R-39)
- [ ] Reinstall cleanly from a single lockfile in backend + frontend; confirm reproducible install.

## Phase 0.3 — Dependency cleanup (no behaviour change)
- [ ] Backend: remove wrong/dead deps — `@fastify/helmet`, `@fastify/cors`, `redis` + `@types/redis`, deprecated `crypto`, one of the two Pinecone clients; standardize on **one** of `bcrypt`/`bcryptjs`; note (don't yet fix) the missing real `helmet` for Wave 1. (R-39)
- [ ] Frontend: add the genuinely-missing deps `country-list`, `iso-639-1`; restore/verify missing local modules `src/lib/queryClient`, `message/message.types`. (R-04)
- [ ] Align `zod` to one major across shared usage (plan the v3→v4 path; execute carefully). (R-39)
- [ ] Python: re-save `assessment-ai-service/requirements.txt` as **UTF-8**; pin unpinned deps; converge `google-generativeai` to one version and Pydantic to one major per service. (R-41)

## Phase 0.4 — Make the backend build
- [ ] Run `npx prisma generate` and wire `postinstall` so the Prisma client always exists. (R-04)
- [ ] Turn on the type-check as a gate: run `tsc --noEmit`, then fix the **153 errors** in categories — untyped `req.query/params` (`string | string[]`), `unknown`/`void` results, stale service imports (`certification.service` path, `subscription.types` Prisma path), missing `PrismaClient`/`cron` types. (R-04)
- [ ] Flip `tsconfig` toward safety incrementally: keep `strict:false` **only** until errors are cleared, then move to `strict:true` + `noEmitOnError:true` (full strictness may finish in Wave 4/P4, but `noEmitOnError:true` is the Wave-0 target once errors are zero).
- [ ] `npm run build` (backend `tsc`) produces `dist/` with **zero errors**.

## Phase 0.5 — Make the frontend build
- [ ] Resolve the ~65 genuine TS errors (implicit any, type mismatches, the 2 broken local imports, missing deps from 0.3). (R-04)
- [ ] Fix the phantom `next/*` "missing declaration" errors by ensuring a single clean install (they stem from the mixed npm/pnpm node_modules). Re-check `tsc --noEmit`.
- [ ] `next build` completes successfully (no `ignoreBuildErrors` escape hatch used).

## Phase 0.6 — Config hygiene
- [ ] Fix the corrupt `[object Promise]` line in `backend/.env`. (R-43)
- [ ] Separate `SHADOW_DATABASE_URL` from `DATABASE_URL` (point to a throwaway shadow DB or leave unset for deploy-only) so no command can wipe the primary DB. (R-07)
- [ ] Guard `firebase.ts` init so a missing Firebase env doesn't crash boot (defer full fix to Wave 3/8 but stop the crash now). (supports R-33)
- [ ] Author `.env.example` for **backend** and **frontend** (full var list from the matrix) — the start of P5 config docs.

## Phase 0.7 — Dead code & artifact removal (safe deletions)
- [ ] Delete confirmed-dead files: `backend/src/index.ts`, unmounted `routes/health.routes.ts` (re-added properly in Wave 3), duplicate `scheduler/scraping.scheduler.ts`, `ai-service/app/main_backup.py`, unmounted `ai-service/app/api/routes.py`, frontend orphaned `lib/admin-auth.ts` + `lib/api-client.ts`, second `providers/ReactQueryProvider.tsx`. (R-40)
- [ ] Remove committed artifacts: `backups-files-folders/**`, `test-signup.json`, `runner-python/runner-stub.log`, `backend/temp_processing_*.pdf`, `backend/*.log`, `dev.db`, `src - Raccourci.lnk`. Add them to `.gitignore`. (R-40)
- [ ] Fix the double `insightsRoutes` mount in `app.ts:138-139`. (R-40)
- [ ] Record all deletions in `matrices/dead-code-and-cleanup.md`.

## Phase 0.8 — Local run baseline
- [ ] Stand up local infra (Postgres, Redis, MinIO) and get the backend, one worker, and the frontend running together in dev; confirm the app loads and a basic authenticated call works.
- [ ] Document the exact local run steps (supersede/refresh `docs/DEV_ARCHITECTURE.md`).

---

## Exit criteria (all must be true & verified)
- ✅ `pnpm install` (one lockfile) reproducible in backend + frontend.
- ✅ Backend `tsc --noEmit` = **0 errors**; `build` emits `dist/`.
- ✅ Frontend `next build` **succeeds**.
- ✅ App runs locally (backend + worker + frontend + infra); a login + one dashboard read works.
- ✅ No dual lockfiles, no dead entry points, no committed secrets/logs/temp/`dev.db`.
- ✅ `SHADOW_DATABASE_URL` can never wipe the primary DB; `firebase.ts` doesn't crash on missing env.
- ✅ `.env.example` exists for backend + frontend.
- ✅ PROGRESS-LOG updated with every change (before → after → why).

> **Note:** Wave 0 deliberately does **not** change security, features, or scale — only "make it build & run cleanly." Resist scope creep; log anything discovered for the wave that owns it.

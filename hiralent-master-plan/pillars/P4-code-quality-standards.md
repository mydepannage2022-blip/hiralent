# Pillar P4 — Code Quality & Standards

> **Principle:** the code was written by 5 developers with divergent styles and merged without review. We converge it onto one consistent, type-safe, maintainable standard so future work is fast and safe.

## Definition of done

1. **TypeScript strictness:** backend `strict: true`, `noEmitOnError: true`; zero `tsc` errors; `as any`/`@ts-ignore` eliminated or justified. Frontend already strict — keep it green in CI.
2. **One toolchain:** a single package manager (one lockfile per project); no dual npm+pnpm. Root `package.json` fixed or removed. Python deps pinned, UTF-8, versions aligned (one `google-generativeai`, one Pydantic major).
3. **No duplicate/wrong deps:** one hashing lib, one Redis client, one Pinecone client, real `helmet`, no deprecated `crypto` pkg, aligned `zod`.
4. **Consistent structure:** one Prisma singleton; one HTTP-client factory with shared retry/timeout/error handling; unified auth-middleware (collapse the 7 overlapping ones); consistent route naming and mount order (no order-dependent fragility, no double mounts).
5. **Error handling convention:** central error middleware + typed error classes + one error envelope; no scattered ad-hoc try/catch shapes.
6. **Validation convention:** Zod schemas for all inputs, enforced uniformly.
7. **No dead code / artifacts:** dead entry points, duplicate routers/components, committed backups/logs/temp/`dev.db`/`.lnk` removed. `.gitignore`/`.dockerignore` correct.
8. **Readability:** new code matches surrounding style; comments meaningful; no leftover debug `console.log` in shipped paths (use the logger).

## Current gaps (risks this pillar owns)
R-04 (type errors), R-38, R-39, R-40, R-41, R-43 (+ the structural debt: 88 Prisma clients, 7 auth middlewares, duplicate mounts, unwired error handler).

## Standing conventions (to be documented in a CONTRIBUTING/STYLE note during Wave 0)
- Layering: `route → controller → service → lib`. Controllers thin, services hold logic.
- One `PrismaClient` imported from `lib/prisma.ts`.
- All external HTTP through one client factory.
- Every input validated; every route guarded; every error goes through the central handler.
- Log via the structured logger, never raw `console.*` in shipped code.

## How we verify
- CI runs `tsc --noEmit` (backend + frontend), lint, and a dead-dep check — all must pass.
- Grep gates: zero `new PrismaClient()` outside `lib/prisma.ts`; zero committed `.env`/lockfile-dupes; zero conflict markers.

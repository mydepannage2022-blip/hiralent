# Zod v3 → v4 Migration Path (PLAN ONLY — not executed in Session 2)

> Wave 0 / Session 2 scope was **one toolchain + dependency cleanup**. Zod's major
> upgrade is intentionally deferred: it is a behaviour-touching change across many
> validation schemas and needs its own session with tests. This note captures the
> plan so the next session can execute it safely.

## Current state (verified 2026-07-21)
- **backend**: `zod@^3.25.76` — used in **26 files** (`process.env`-independent; request/DTO validation).
- **frontend**: `zod@^4.1.12` — already on v4 (form/resolver validation via `@hookform/resolvers`).
- The split means shared validation logic cannot be copied verbatim between the two until backend is on v4.

**Target:** backend → `zod@^4.x`, so both apps share one major version.

## Migration hotspots (backend/src)
A grep for v4-breaking patterns found **56 occurrences across 15 files**. Highest-touch:
- `validation/team.schema.ts` (10), `middlewares/question.validation.middleware.ts` (8),
  `workers/ai_company_setup.worker.ts` (8), `validation/auth.schema.ts` (4),
  `workers/run.worker.ts` (3), `services/runner.dispatcher.ts` (3),
  `validation/subscription.schema.ts` (3), `validation/message.schema.ts` (3).
- Remaining `.ts` schemas under `validation/` and route files carry the rest.

## Known breaking changes to check per file
1. **Error customization**: v3 `{ required_error, invalid_type_error }` and `errorMap`
   are replaced by a unified `error` param / `z.config`. Any schema passing those options
   must be rewritten.
2. **`ZodError` shape**: `.errors` → `.issues` is stable, but formatting helpers
   (`.format()`, `.flatten()`) changed defaults — audit any code that reads parse errors
   and shapes an API response from them.
3. **`.default()` + `.optional()` interaction**: v4 changed how defaults apply inside
   optional/nullable — re-verify every `.default(...)` produces the same value on `undefined`.
4. **`z.record(...)`**: v4 requires an explicit key schema (`z.record(z.string(), V)`).
5. **String formats**: `z.string().email()/.url()/.datetime()` moved to top-level
   `z.email()` etc. (the chained forms are deprecated in v4).
6. **`.strict()` / `.passthrough()`**: object-mode API adjusted — confirm unknown-key
   behaviour on every `.strict()` schema.

## Recommended execution (next session)
1. Add a minimal test harness first (currently no JS/TS test runner — see Wave 7):
   snapshot each schema's `safeParse` result for a valid + an invalid fixture **on v3**.
2. Bump backend `zod` to `^4`, run `pnpm exec tsc --noEmit`, fix type errors file-by-file
   using the checklist above.
3. Re-run the snapshot tests; any diff is a behaviour change to reconcile.
4. Manually exercise auth + upload + question-validation flows (highest-risk schemas).

**Do not** attempt this as a blind find-replace — the error-shape and default changes are
silent at runtime and only a fixture/snapshot test will catch regressions.

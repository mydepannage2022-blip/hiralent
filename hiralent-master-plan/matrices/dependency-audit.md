# Dependency Audit — Wave 1 / Session 7 (supply-chain gate)

**Purpose.** Record the `pnpm audit` baseline, what was remediated, and the small set of advisories
deliberately **accepted-and-deferred** (no upstream fix). Enforced by
[`tools/verify-dependency-audit.mjs`](../tools/verify-dependency-audit.mjs): production High/Critical
must stay ⊆ the accepted-allowlist below, or the gate fails.

**Scope = `pnpm audit --prod`** — the shipped attack surface. Dev-only tooling advisories are listed
under "Dev-only (not gated)" and are not part of the production posture.

_Date: 2026-07-26 · pnpm 11.15.1 · independent projects (backend/, frontend/)._

## Result

| Project | Before (`--prod` distinct High/Crit modules) | After | Build |
|---|---|---|---|
| backend | 25 (6 direct + 19 transitive; incl. 2 Critical) | **1** (`jws`, accepted) | ✅ `tsc` exit 0 |
| frontend | 5 (2 direct + 3 transitive) | **0** | ✅ `next build` exit 0 |

## How it was remediated

**Direct deps — bumped in `package.json`** (same-major except nodemailer, all build-verified):

| Package | From → To | Project |
|---|---|---|
| axios | ^1.13.2 → ^1.15.1 (1.18.1) | backend + frontend |
| multer | ^2.0.2 → ^2.1.0 (2.2.0) | backend |
| nodemailer | ^7.0.4 → ^9.0.1 (9.0.3) — major; API (`createTransport`/`sendMail`) unchanged, tsc green | backend |
| sharp | ^0.34.5 → ^0.35.0 (0.35.3) | backend |
| langchain | ^1.0.3 → ^1.2.3 (1.5.4) | backend |
| next | ^15.5.9 → ^15.5.21 | frontend |

**Transitive deps — pinned via `overrides:` in each project's `pnpm-workspace.yaml`** (pnpm v11
location; same file as `allowBuilds`). Every pin is a same-major patch/minor of an already-installed
package, so no API surface we call changes:

- backend: `form-data ≥4.0.6`, `@langchain/core ≥1.1.8`, `langsmith ≥0.6.0`, `protobufjs ≥7.5.5`,
  `websocket-driver ≥0.7.5`, `@grpc/grpc-js ≥1.14.4`, `@xmldom/xmldom ≥0.8.12`, `defu ≥6.1.5`,
  `effect ≥3.20.0`, `engine.io ≥6.6.7`, `socket.io-parser ≥4.2.6`, `fast-xml-parser ≥5.3.4`,
  `lodash ≥4.17.24`, `node-forge ≥1.3.4`, `path-to-regexp ≥8.4.0`, `postcss ≥8.5.12`,
  `underscore ≥1.13.8`, `undici ≥7.24.0`, `ws ≥8.21.0`.
- frontend: `form-data ≥4.0.6`, `postcss ≥8.5.12`, `sharp ≥0.35.0`.

**Verification that the overrides didn't break runtime:** the two override-heavy subsystems are
Prisma (`defu`/`effect`) and the realtime/AI stack (`engine.io`/`socket.io-parser`/`@langchain/core`).
Both are exercised by the runtime gate — `verify-authz-matrix.mjs` and `verify-default-deny-authz.mjs`
boot the real backend and drive signup / `findMany` / SSE through Prisma and the socket layer — so a
broken pin would fail the gate, not slip through.

## Accepted & deferred (no upstream patch — gated allowlist)

| Project | Advisory | Reached via | Why accepted | Target |
|---|---|---|---|---|
| backend | **`jws = 4.0.0`** (High) | `firebase-admin` | No patched `jws` release exists; the fix requires a **firebase-admin major upgrade**, which is a Wave 8 dependency-modernisation item (larger blast radius than a security gate should take on). | **Wave 8** |

This is the only entry in `ACCEPTED` inside the verifier. Removing firebase-admin's vulnerable `jws`
requires bumping firebase-admin itself; tracked for Wave 8.

## Dev-only (not gated — not shipped)

`nodemon` (dev) pulls `brace-expansion`/`minimatch`/`picomatch` advisories. These never run in
production, so they are excluded from the `--prod` gate. They clear whenever nodemon is next bumped.

## Notes
- The **full** (`--dev` included) audit still shows more advisories; the gate intentionally tracks the
  production surface only. Run `pnpm audit` (no `--prod`) in each project to see the dev set.
- When a new production High/Critical appears, either remediate it (bump/override) or, only if there is
  no upstream fix, add a justified row here **and** to `ACCEPTED` in the verifier — otherwise the gate fails.

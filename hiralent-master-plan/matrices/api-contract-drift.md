# API Contract Drift — Wiring Mismatches

> Reference for **Wave 3** (and some Wave 8). Every known frontend↔backend↔python mismatch that silently fails. Close each and tick it; add a PROGRESS-LOG entry. Target: zero open items.

## P0 — wired in UI but silently fails
| # | Mismatch | Effect | Fix |
|---|---|---|---|
| 1 | Admin **Agencies** page reads `localStorage.adminToken` (never written; login writes `sessionToken`) | `Bearer null` → all agency stats/list/approve/reject 401 | use `sessionToken` (R-22, Wave 3) |
| 2 | `${AI_SERVICE_URL}/resume/extract` — no such route in any Python service (comment: "CHANGE THIS PATH") | resume autofill 404 on every upload | implement/point correctly (R-24, Wave 3) |
| 3 | `session.routes.ts` (sessions CRUD) **never mounted**; `app.ts` re-mounts `authRoutes` at `/auth/sessions` | "sign out other devices / active sessions" 404 | mount the real router (R-25, Wave 3) |
| 4 | Doc-validator webhook default `:4000`; backend runs `:5000` (payload shape IS correct) | deep-validation results silently vanish; `CaseDocument` never updates | fix `BACKEND_URL`/`BACKEND_WEBHOOK_URL` to :5000 (R-26, Wave 3) |

## P1 — config landmines
| # | Mismatch | Effect | Fix |
|---|---|---|---|
| 5 | `NEXT_PUBLIC_BASE_URL` (must include `/api/v1`) vs `NEXT_PUBLIC_API_URL` (some append it, some don't) | **no single env value works for all consumers** → 404s or `/api/v1/api/v1/...` | one convention + central client (R-27, Wave 3) |
| 6 | Duplicate admin clients (`lib/api-client.ts`, `lib/admin-auth.ts`) use wrong token key (`admin_session_token`) + wrong paths (`/verifications/*` missing `/admin`, `/auth/setup-mfa` vs `/admin/auth/*`) | dead but a trap; the working page hardcodes `http://localhost:5000` (breaks in prod) | delete orphans (Wave 0) + env-drive (Wave 3) |

## P2 — partial contracts / silent degradation
| # | Mismatch | Effect | Fix |
|---|---|---|---|
| 7 | Backend emits `reaction_added/removed`, `message_deleted`, `message_read`, `*_success`; frontend never subscribes | reactions/deletes/read-receipts don't update live (need refresh) | add listeners (R-36, Wave 3) |
| 8 | Inconsistent response envelopes (`res.json(data)` vs `{user}` vs `{success,data}`) | clients read `res.data.data`/`.profile` and get `undefined` without a network error | one envelope (R-36, Wave 3) |

## Verified FINE (no action)
Main auth Bearer flow · SSE `/submissions/stream/:id` (unauth by design, EventSource-compatible) · talent-ai & matching-ai client paths · doc-validator webhook **payload shape** (only URL/port wrong).

## Backend → Python call map (for env config in Wave 3/8)
`AI_SERVICE_URL`→8000 · `AI_SERVICE_BASE_URL`(assessment)→8001 · `DOC_VALIDATOR_URL`→8002 · `TALENT_AI_BASE_URL`→8003 · scraping→8010 · `MATCHING_AI_BASE_URL`→8011. Dangling: `/resume/extract` (no impl).

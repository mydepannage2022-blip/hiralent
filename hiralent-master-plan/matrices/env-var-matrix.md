# Environment Variable Matrix

> **To be completed in Wave 0 (Phase 0.1/0.6)** — the full inventory feeds every `.env.example`. Backend uses **~132** distinct `process.env.*` vars, Python ~26, frontend ~14. Below: the deployment-critical subset + the structure to fill in.
>
> Columns: Var · Service · Purpose · Default observed · Documented? · **Action**.

## Critical — insecure defaults / must-rotate (see Wave 1)
| Var | Service | Default observed | Action |
|---|---|---|---|
| `JWT_SECRET` | backend | `yourSuperSecretKey` | rotate to high-entropy (R-01) |
| `ADMIN_JWT_SECRET` | backend | real-looking hex | rotate for prod |
| `INTERNAL_API_TOKEN` | assessment (+ hardcoded in compose) | `super-secret-internal-token` | rotate, move to secrets |
| `BACKEND_INTERNAL_TOKEN` | backend/doc-validator | placeholder | set strong, enforce on webhook |
| `MINIO_ROOT_USER/PASSWORD`, `S3_ACCESS/SECRET_KEY` | infra/all | `minioadmin/minioadmin` | change, scope access |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | ai/assessment/doc/talent | live key committed (ai-service) | **revoke & rotate** (R-02) |
| `PINECONE_API_KEY`, `CLOUDINARY_URL`, `SMTP_PASS`, `FIREBASE_PRIVATE_KEY`, `UNREAL_SPEECH_API_KEY` | backend/ai | live values on disk | rotate, move to secrets |

## Critical — correctness / deploy
| Var | Service | Note | Action |
|---|---|---|---|
| `DATABASE_URL` | backend | localhost dev; Railway prod commented | env per environment |
| `SHADOW_DATABASE_URL` | backend | `=${DATABASE_URL}` (dotenv won't expand; = primary) | separate/unset (R-07, Wave 0) |
| `MONGO_URI` | backend | required at boot, stores no data | decide (R-33, Wave 2) |
| `REDIS_URL` | backend/workers/python | fragmented across ports | one canonical Redis (Wave 8) |
| `AI_SERVICE_URL` / `AI_SERVICE_BASE_URL` / `DOC_VALIDATOR_URL` / `TALENT_AI_BASE_URL` / `MATCHING_AI_BASE_URL` | backend | localhost defaults | env-drive, no hardcoded localhost (Wave 3) |
| `RUNNER_MODE` + `RUNNER_*_IMAGE` / limits | backend | code-runner config | pin for prod (Wave 6/8) |
| `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_FRONTEND_URL` | frontend | localhost; conflicting convention; baked at build | unify (R-27) + set per env build (Wave 8) |
| `NODE_ENV` / `SERVICE_ENV` / `DEBUG` | all | `DEBUG=true` with `SERVICE_ENV=prod` seen | correct per env |
| `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` | backend | init at import → crash if missing | guard init (Wave 0/3) |

## Documentation status (target: every service has `.env.example`)
| Service | `.env.example` today | Action |
|---|---|---|
| backend (~132 vars) | ❌ none | author in Wave 0 |
| frontend | ❌ none | author in Wave 0 |
| ai-service | ❌ none | author (Wave 0/8) |
| assessment-ai-service | ❌ none | author |
| talent-ai (×3) | ❌ none | author |
| document-validator-service | ✅ exists | verify complete |
| python-services | ✅ exists | verify complete |

## To fill in (Wave 0): complete var list
> Run the env grep across `backend/src`, all Python `settings`/`os.getenv`, and frontend `NEXT_PUBLIC_*`; list **every** var with service, purpose, default, and required-vs-optional. This table becomes the source for all `.env.example` files and the secret-manager inventory.

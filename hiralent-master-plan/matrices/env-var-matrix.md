# Environment Variable Matrix

> **Status: completed in Wave 0 / Session 1** (freeze & env inventory). This is the source-of-truth for every `.env.example` and the future secret-manager inventory.
>
> **Counts (measured, `tools/verify-env-matrix.mjs`):** distinct `.env` keys = **88**, distinct env vars referenced in code = **190**, **union to document = 200**. The handoff's "~132" referred to backend `process.env.*` code references (132), **not** `.env` keys — backend `.env` holds **49** keys. `.env` keys ≠ code refs: code reads many vars that rely on defaults and are absent from `.env`.
>
> **Verification:** `node hiralent-master-plan/tools/verify-env-matrix.mjs` asserts every discovered var (union of `.env` keys ∪ code refs) is documented below; exit 0 = complete. Run with `--report` to dump the raw per-service inventory.
>
> ⚠️ Secret **values** are never recorded here — only var name, purpose, and safe (non-secret) defaults.

---

## Critical — insecure defaults / must-rotate (Wave 1)
| Var | Service | Default observed | Action |
|---|---|---|---|
| `JWT_SECRET` | backend | `yourSuperSecretKey` | rotate to high-entropy (R-01) |
| `ADMIN_JWT_SECRET` | backend | real-looking hex | rotate for prod |
| `INTERNAL_API_TOKEN` | assessment (+ hardcoded in compose) | `super-secret-internal-token` | rotate, move to secrets |
| `BACKEND_INTERNAL_TOKEN` | backend/doc-validator | placeholder/empty | set strong, enforce on webhook |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`, `S3_ACCESS_KEY` / `S3_SECRET_KEY` | infra/all | `minioadmin/minioadmin` | change, scope access |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | ai/assessment/doc/talent | live key committed (ai-service) | **revoke & rotate** (R-02) |
| `PINECONE_API_KEY`, `CLOUDINARY_URL`, `SMTP_PASS`, `FIREBASE_PRIVATE_KEY`, `UNREAL_SPEECH_API_KEY` | backend/ai | live values on disk | rotate, move to secrets |

## Critical — correctness / deploy
| Var | Service | Note | Action |
|---|---|---|---|
| `DATABASE_URL` | backend | POOLED runtime path; localhost dev; Railway prod commented. Carries bounded `connection_limit`/`pool_timeout` (R-06, Wave 2); fronts PgBouncer `pgbouncer=true` in Wave 8 | env per environment + pool params |
| `DIRECT_DATABASE_URL` | backend | DIRECT un-pooled path for `prisma migrate` (`directUrl`) — bypasses PgBouncer (transaction pooling breaks DDL); no pool/pgbouncer params. Required by migrate/validate, unused at runtime | set per env (Wave 2/8) |
| `SHADOW_DATABASE_URL` | backend | `=${DATABASE_URL}` (dotenv won't expand; = primary) | separate/unset (R-07, Wave 0) |
| `REDIS_URL` | backend/workers/python | fragmented across ports | one canonical Redis (Wave 8) |
| `AI_SERVICE_URL` / `AI_SERVICE_BASE_URL` / `DOC_VALIDATOR_URL` / `TALENT_AI_BASE_URL` / `MATCHING_AI_BASE_URL` | backend | localhost defaults | env-drive, no hardcoded localhost (Wave 3) |
| `RUNNER_MODE` + `RUNNER_*_IMAGE` / limits | backend | code-runner config | pin for prod (Wave 6/8) |
| `NEXT_PUBLIC_API_URL` (canonical) / `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_FRONTEND_URL` (+ deprecated `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`) | frontend | **R-27 RESOLVED (Session 6):** unified on `NEXT_PUBLIC_API_URL`=bare host; one resolver `src/lib/config/api.ts` derives all bases. Still baked at build → set per env before `next build` (Wave 8) |
| `NODE_ENV` / `SERVICE_ENV` / `DEBUG` | all | `DEBUG=true` with `SERVICE_ENV=prod` seen | correct per env |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | backend | init at import → crash if missing | guard init (Wave 0/3) |

## Documentation status (target: every service has `.env.example`)
| Service | `.env` keys | `.env.example` today | Action |
|---|---|---|---|
| backend | 47 | ✅ **authored (Session 5)** | done (Phase 0.6) |
| frontend | 7 | ✅ **authored (Session 5)** | done (Phase 0.6) |
| ai-service | 8 | ✅ **authored (Session 5)** | done (placeholders for live keys) |
| assessment-ai-service | 12 | ✅ **authored (Session 5)** | done |
| document-validator-service | 19 | ✅ **completed (Session 5)** | added `SERVICE_VERSION`, `CORS_ORIGINS`, `OCR_TARGET_MIN_WIDTH` |
| python-services | 10 | ✅ exists (verified complete) | done |
| talent-ai-service | — (no `.env`; 3 sub-services) | ✅ **authored (Session 5)** | one `.env.example` per sub-service (job-creation-ai, matching-candidate-job, scraping-candidates) from each `settings.py` |
| runner-python | — (no `.env`) | ✅ **authored (Session 5)** | `TEST_TIMEOUT_S` |

> **Guarded by** `tools/verify-config-hygiene.mjs`: every service's `.env.example` must exist, cover every key in its real `.env`, and leak no real secret.

---

# Complete inventory (per service)

> `Required?` = **YES** means boot/critical-path crashes if absent. Defaults shown only when safe (ports, localhost, booleans, model names). Secrets = `—`.
>
> ⚠️ **Defaults accuracy:** values were **code-verified** where a fallback exists (e.g. `PORT`→5000, `SMTP_PORT`→587, `CLAMAV_PORT`→3310, all doc-validator pydantic defaults) or read from a service config; where no in-code default was found, the value is marked **(assumed)** and MUST be confirmed when authoring each `.env.example` (Phase 0.6). Do not treat unmarked backend defaults as authoritative for the full set — only the spot-checked ones are guaranteed.

## backend (135 vars)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `ADMIN_JWT_SECRET` | Admin JWT signing secret | — | YES (admin auth) |
| `ADMIN_SESSION_DURATION` | Admin session TTL | — | no |
| `AI_FAKE` | Return fake AI responses (dev) | false | no |
| `AI_MODEL_PROVIDER` | AI provider selector | gemini | no |
| `AI_SERVICE_URL` | ai-service base URL | localhost | no |
| `AI_SERVICE_BASE_URL` | ai-service base URL (alt) | localhost | no |
| `AI_SERVICE_TIMEOUT_MS` | ai-service HTTP timeout | — | no |
| `AI_VETTING_URL` | AI vetting service URL | localhost | no |
| `ALLOWED_MIME` | Allowed upload MIME types | — | no |
| `APP_URL` | Application base URL | — | no |
| `BACKEND_INTERNAL_TOKEN` | Internal/webhook auth token | — | should-set (Wave 1) |
| `BACKEND_URL` | Backend self URL | localhost | no |
| `CLAMAV_HOST` | ClamAV scanner host | — | no |
| `CLAMAV_PORT` | ClamAV port | 3310 | no |
| `CLIENT_URL` | Frontend URL (CORS) | localhost:3000 | no |
| `CLOUDINARY_URL` | Cloudinary media creds | — (secret) | no |
| `CRON_GITHUB` | Cron for GitHub scraping | — | no |
| `CRON_HACKERRANK` | Cron for HackerRank scraping | — | no |
| `CRON_LEETCODE` | Cron for LeetCode scraping | — | no |
| `CRON_STACKOVERFLOW` | Cron for StackOverflow scraping | — | no |
| `DATABASE_URL` | Postgres connection (Prisma) | — | **YES (boot)** |
| `DEBUG` | Debug flag | false | no |
| `DEV_BYPASS_CREATE_SUBMISSION` | Dev: bypass submission create | false | no (dev-only) |
| `DIRECT_DATABASE_URL` | Direct Postgres URL for `prisma migrate` (PgBouncer bypass); runtime unused | — | should-set (migrations; Wave 2/8) |
| `DISABLE_AV` | Disable antivirus scan | false | no |
| `DOC_VALIDATOR_URL` | document-validator-service URL | localhost:8002 | no |
| `ENABLE_DEV_MINT` | Dev: enable token mint | false | no (dev-only) |
| `EXTERNALS_MOCK` | Mock external services | false | no |
| `FILE_URL_SECRET` | HMAC secret for signed CV/resume file URLs (falls back to `JWT_SECRET` if unset) | — (secret; `JWT_SECRET`) | should-set (Wave 1) |
| `FILE_URL_TTL_SECONDS` | Signed file-URL lifetime | 600 | no |
| `FIREBASE_CLIENT_EMAIL` | Firebase service-account email | — (secret) | YES* (crash at import) |
| `FIREBASE_PRIVATE_KEY` | Firebase service-account key | — (secret) | YES* |
| `FIREBASE_PROJECT_ID` | Firebase project id | — | YES* |
| `FORCE_INMEMORY` | Force in-memory queue | false | no |
| `FRONTEND_UPLOAD_PATH` | Path for frontend uploads | — | no |
| `FRONTEND_URL` | Frontend URL | localhost:3000 | no |
| `GEMINI_API_KEY` | Google Gemini API key | — (secret) | no (AI features) |
| `GEMINI_MODEL` | Gemini model name | gemini-1.5-flash | no |
| `GENERATE_LIBRARY_QUESTIONS` | Toggle library question gen | false | no |
| `GITHUB_AUTO` | Auto-scrape GitHub toggle | false | no |
| `GITHUB_HARD_CAP` | Max GitHub items cap | — | no |
| `GITHUB_MAX_PAGES` | Max GitHub pages | — | no |
| `GITHUB_MAX_PROBLEMS` | Max GitHub problems | — | no |
| `GITHUB_STOP_AFTER_EMPTY` | Stop scrape after N empty | — | no |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback | — | no (Google login) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id | — | no |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | — (secret) | no |
| `HACKERRANK_AUTO` | Auto-scrape HackerRank | false | no |
| `HACKERRANK_HARD_CAP` | Max HackerRank items | — | no |
| `HACKERRANK_MAX_PAGES` | Max HackerRank pages | — | no |
| `HACKERRANK_MAX_PROBLEMS` | Max HackerRank problems | — | no |
| `HACKERRANK_STOP_AFTER_EMPTY` | Stop after N empty | — | no |
| `IHSSANE_API_KEY` | Ihssane microservice key | — (secret) | no |
| `IHSSANE_BASE_URL` | Ihssane service base URL | — | no |
| `INTERNAL_API_TOKEN` | Shared token backend sends to Python services as the X-API-Token header (assessment-ai, ai-service, doc-validator, job-creation-ai) | — (secret) | should-set (Wave 1, Phase 1.7) |
| `INTERNAL_SERVICE_KEY` | Internal service auth key. Backend sends its **value** to the matching service as the `X-Service-Key` header. The matching service accepts this value under **either** `SERVICE_API_KEY` **or** `INTERNAL_SERVICE_KEY` (fallback added Session 5), so setting the same secret works regardless of name. | — (secret) | no |
| `JWT_EXPIRES_IN` | JWT token TTL | 7d | no |
| `JWT_SECRET` | JWT signing secret | `yourSuperSecretKey` (INSECURE) | **YES (auth; rotate R-01)** |
| `LEETCODE_AUTO` | Auto-scrape LeetCode | false | no |
| `LEETCODE_CSRF` | LeetCode CSRF token | — (secret) | no |
| `LEETCODE_HARD_CAP` | Max LeetCode items | — | no |
| `LEETCODE_MAX_PROBLEMS` | Max LeetCode problems | — | no |
| `LEETCODE_SESSION` | LeetCode session cookie | — (secret) | no |
| `LEETCODE_STOP_AFTER_EMPTY` | Stop after N empty | — | no |
| `LIBRARY_DATABASE_URL` | Question-library DB URL | — | no |
| `LOG_LEVEL` | Log verbosity | info | no |
| `MATCHING_AI_BASE_URL` | Matching AI service URL | localhost | no |
| `MAX_FILE_SIZE` | Max upload size | — | no |
| `MAX_UPLOAD_BYTES` | Max upload bytes | — | no |
| `MAX_VIDEO_UPLOAD_BYTES` | Max video upload bytes | — | no |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` (INSECURE) | no |
| `MINIO_BUCKET_NAME` | MinIO bucket name | — | no |
| `MINIO_ENDPOINT` | MinIO endpoint | localhost:9000 | no |
| `MINIO_PORT` | MinIO port | 9000 | no |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` (INSECURE) | no |
| `MINIO_USE_SSL` | MinIO SSL toggle | false | no |
| `NODE_ENV` | Node environment | development | no |
| `OCR_HANDWRITING` | OCR handwriting toggle | false | no |
| `OCR_LANGS` | OCR languages | eng+fra | no |
| `OCR_MAX_UPLOAD_BYTES` | Max OCR upload size (`POST /api/ocr`) | 10485760 (10MB) | no |
| `OCR_TARGET_MIN_W` | OCR min width (backend) | — | no ⚠️ see drift note |
| `OPENAI_API_KEY` | OpenAI API key | — (secret) | no |
| `PINECONE_API_KEY` | Pinecone API key | — (secret) | no (vector search) |
| `PINECONE_ENVIRONMENT` | Pinecone environment | — | no |
| `PINECONE_INDEX_NAME` | Pinecone index name | `hiralent-candidates` | no — auto-created on first use |
| `PORT` | Backend HTTP port | 5000 | no |
| `REDIS_URL` | Redis connection | localhost:6379 | no (queues) |
| `RUNNER_MODE` | Code-runner mode (docker/http) | — | no |
| `RUNNER_HTTP_URL` | Runner HTTP endpoint | — | no |
| `RUNNER_DOCKER_IMAGE` | Default runner image | — | no |
| `RUNNER_PY_IMAGE` | Python runner image | — | no |
| `RUNNER_TS_IMAGE` | TypeScript runner image | — | no |
| `RUNNER_JAVA_IMAGE` | Java runner image | — | no |
| `RUNNER_CPP_IMAGE` | C++ runner image | — | no |
| `RUNNER_CS_IMAGE` | C# runner image | — | no |
| `RUNNER_GO_IMAGE` | Go runner image | — | no |
| `RUNNER_RUBY_IMAGE` | Ruby runner image | — | no |
| `RUNNER_DOCKER_CPUS` | Runner CPU limit | — | no |
| `RUNNER_DOCKER_MEMORY` | Runner memory limit | — | no |
| `RUNNER_TIMEOUT_MS` | Runner exec timeout | — | no |
| `RUNNER_RETRIES` | Runner retry count | — | no |
| `RUNNER_USE_RUNSC` | Use gVisor runsc runtime | false | no |
| `RUNNER_ALLOW_HOST_EXEC` | Dev-only: allow running candidate code on the host when no container runner is available. **Hard-refused in production** (see `assertSafeRunner`). Off unless `=1`. | — (off) | no (dev-only) |
| `RUNNER_DOCKER_USER` | Non-root uid:gid the runner container runs as (`--user`) | 1000:1000 | no |
| `RUNNER_PIDS_LIMIT` | Runner container PID cap (`--pids-limit`) | 128 | no |
| `RUNNER_STUB_TOKEN` | Shared secret for the HTTP runner stub (`X-Runner-Token`, constant-time). Required if `RUNNER_HTTP_URL` is set in prod. | — (secret) | if HTTP runner used |
| `RUNNER_STRICT_COMPARE` | Strict output compare | false | no |
| `RUNNER_COMPARE_IGNORE_CASE` | Compare ignoring case | false | no |
| `RUNNER_COMPARE_COLLAPSE_WHITESPACE` | Compare collapsing whitespace | false | no |
| `S3_ACCESS_KEY` | S3/MinIO access key | `minioadmin` (INSECURE) | no |
| `S3_SECRET_KEY` | S3/MinIO secret key | `minioadmin` (INSECURE) | no |
| `S3_BUCKET` | S3 bucket name | — | no |
| `S3_ENDPOINT` | S3 endpoint | localhost:9000 | no |
| `S3_REGION` | S3 region | — | no |
| `S3_FORCE_PATH_STYLE` | S3 path-style addressing | false (code: `=== "true"`, so unset → false) | no |
| `SCRAPING_SCHEDULER_ENABLED` | Enable scraping scheduler | false | no |
| `SCRAPING_SECRET` | Scraping endpoint secret | — (secret) | no |
| `SHADOW_DATABASE_URL` | Prisma shadow DB | `=${DATABASE_URL}` (R-07 danger) | no |
| `SIGNED_URL_TTL_SECONDS` | Signed URL TTL | — | no |
| `SMTP_FROM` | Email "from" address | — | no |
| `SMTP_HOST` | SMTP host | — | no |
| `SMTP_PORT` | SMTP port | 587 | no |
| `SMTP_USER` | SMTP username | — | no |
| `SMTP_PASS` | SMTP password | — (secret) | no |
| `STACKOVERFLOW_AUTO` | Auto-scrape StackOverflow | false | no |
| `STACKOVERFLOW_HARD_CAP` | Max SO items | — | no |
| `STACKOVERFLOW_MAX_PAGES` | Max SO pages | — | no |
| `STACKOVERFLOW_MAX_PROBLEMS` | Max SO problems | — | no |
| `STACKOVERFLOW_STOP_AFTER_EMPTY` | Stop after N empty | — | no |
| `STORAGE_PROVIDER` | Storage backend selector | minio (assumed — no in-code default found) | no |
| `STREAM_TICKET_TTL_SECONDS` | Submission SSE stream-ticket lifetime (falls back to `FILE_URL_SECRET`/`JWT_SECRET` for signing) | 300 | no |
| `SUPERADMIN_EMAIL` | Superadmin seed email (`prisma/seeds/superadmin.seed.ts`); dev fallback `admin@hiralent.com` | admin@hiralent.com (dev) | no |
| `SUPERADMIN_PASSWORD` | Superadmin seed password (bcryptjs-hashed). In production the seed SKIPS admin creation if unset (never ships a known default); dev fallback used otherwise | — (required in prod to seed admin) | should-set (prod bootstrap) |
| `SYSTEM_CREATOR_ID` | System user id for records | — | no |
| `TAILSCALE_ENABLED` | Tailscale networking toggle | false | no |
| `TALENT_AI_BASE_URL` | talent-ai-service base URL | localhost | no |
| `TEST_EMAIL_TO` | Test email recipient | — | no |
| `TEST_TIMEOUT_S` | Test timeout seconds | — | no |
| `UNREAL_SPEECH_API_KEY` | UnrealSpeech TTS key | — (secret) | no |
| `UNREAL_SPEECH_VOICE_ID` | UnrealSpeech voice id | — | no |
| `UPLOAD_DIR` | Local upload directory | uploads | no |
| `USE_IN_MEMORY_QUEUE` | Use in-memory queue | false | no |
| `VECTOR_ENGINE_ENABLED` | Enable vector engine | false | no |
| `WAFAA_API_KEY` | Wafaa microservice key | — (secret) | no |
| `WAFAA_BASE_URL` | Wafaa service base URL | — | no |
| `YOUSSRRA_WEBHOOK_KEY` | Youssra webhook key (⚠️ triple-R typo) | — (secret) | no |

## frontend (15 vars)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **CANONICAL (R-27, Session 6): BARE backend host** (scheme+host+port, no path). The central resolver `frontend/src/lib/config/api.ts` derives `/api/v1`, `/api` (OCR only) and the socket host from it. | `http://localhost:5000` | no |
| `NEXT_PUBLIC_API_BASE_URL` | Deprecated (R-27): backward-compat fallback only — prefer `NEXT_PUBLIC_API_URL`. | localhost | no |
| `NEXT_PUBLIC_BASE_URL` | Deprecated (R-27): legacy base with `/api/v1` suffix; resolver strips it as a fallback. Prefer `NEXT_PUBLIC_API_URL`. | localhost | no |
| `NEXT_PUBLIC_FRONTEND_URL` | Frontend self URL | localhost:3000 | no |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io host (optional; falls back to `NEXT_PUBLIC_API_URL` host via the resolver) | localhost | no |
| `NEXT_PUBLIC_SOCKET_RECONNECT_ATTEMPTS` | Socket reconnect tries | — | no |
| `NEXT_PUBLIC_MAX_FILE_SIZE` | Client max file size | — | no |
| `NEXT_PUBLIC_DEBUG_MESSAGES` | Debug messages toggle | false | no |
| `NEXT_PUBLIC_DEBUG_SOCKET` | Debug socket toggle | false | no |
| `NEXT_PUBLIC_DEV_TOKEN` | Dev auth token | — | no (dev-only) |
| `NEXT_PUBLIC_DEV_TOKEN_KEY` | Dev token storage key | — | no (dev-only) |
| `NEXT_PUBLIC_DEV_TOKEN_STORE` | Dev token store name | — | no (dev-only) |
| `NEXT_PUBLIC_DEV_USER` | Dev user impersonation | — | no (dev-only) |
| `LOGO_PATH` | Logo asset path | — | no |
| `NODE_ENV` | Node environment | development | no |

## ai-service (16 vars)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `AI_MODEL` | AI model name | — | no |
| `ALLOW_LEGACY_LEETCODE_FULL_SCRAPE` | Allow legacy full scrape | false | no |
| `API_HOST` | Service bind host | 0.0.0.0 | no |
| `API_PORT` | Service port | — | no |
| `CLOUDINARY_URL` | Cloudinary media creds | — (secret) | no |
| `DEBUG` | Debug flag | false | no |
| `GEMINI_API_KEY` | Gemini API key (⚠️ committed live) | — (secret) | no |
| `GITHUB_TOKEN` | GitHub API token | — (secret) | no |
| `LEETCODE_CSRF` | LeetCode CSRF token | — (secret) | no |
| `LEETCODE_SESSION` | LeetCode session cookie | — (secret) | no |
| `NODE_BACKEND_URL` | Node backend URL | localhost | no |
| `PATH` | OS PATH (runtime-provided) | (OS) | no — not an app config var |
| `REDIS_URL` | Redis connection | localhost:6379 | no |
| `REQUEST_TIMEOUT` | HTTP request timeout | — | no |
| `SANDBOX_SERVICE_URL` | Sandbox service URL | localhost | no |
| `STACKEXCHANGE_KEY` | StackExchange API key | — (secret) | no |

## assessment-ai-service (12 vars)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `GOOGLE_API_KEY` | Google/Gemini API key | — (secret) | no |
| `INTERNAL_API_TOKEN` | Internal auth token | `super-secret-internal-token` (INSECURE) | no |
| `LOG_LEVEL` | Log verbosity | info | no |
| `REDIS_URL` | Redis connection | localhost:6379 | no |
| `SERVICE_ENV` | Service environment | — | no |
| `SERVICE_NAME` | Service name | assessment-ai | no |
| `SERVICE_PORT` | Service port | — | no |
| `SPACY_MODEL` | spaCy model name | — | no |
| `USE_MOCK_WAFAA` | Mock Wafaa QGen | false | no |
| `USE_MOCK_YOUSSRA` | Mock Youssra exec | false | no |
| `WAFAA_QGEN_ADDR` | Wafaa QGen gRPC address | — | no |
| `YOUSSRA_EXEC_ADDR` | Youssra exec gRPC address | — | no |

## document-validator-service (24 vars)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `SERVICE_NAME` | Service name | document-validator | no |
| `SERVICE_VERSION` | Service version | 1.0.0 | no |
| `DEBUG` | Debug flag | false | no |
| `HOST` | Bind host | 0.0.0.0 | no |
| `PORT` | Service port | 8002 | no |
| `CORS_ORIGINS` | Allowed CORS origins | localhost:3000,4000 | no |
| `S3_ENDPOINT` | S3/MinIO endpoint | 127.0.0.1:9000 | no |
| `S3_ACCESS_KEY` | S3 access key | `minioadmin` (INSECURE) | no |
| `S3_SECRET_KEY` | S3 secret key | `minioadmin` (INSECURE) | no |
| `S3_BUCKET` | S3 bucket | hiralent-uploads | no |
| `S3_SECURE` | S3 TLS toggle | false | no |
| `OCR_LANGS` | OCR languages | eng+fra | no |
| `OCR_CONFIDENCE_THRESHOLD` | OCR confidence cutoff | 0.85 | no |
| `OCR_TARGET_MIN_WIDTH` | OCR min width | 1800 | no ⚠️ see drift note |
| `TESSERACT_CMD` | Path to tesseract binary | "" | no |
| `USE_EASYOCR` | Use EasyOCR vs Tesseract | false | no |
| `REDIS_URL` | Redis connection | 127.0.0.1:6379 | no |
| `BACKEND_WEBHOOK_URL` | Backend webhook target | localhost:4000/...webhooks | no |
| `BACKEND_INTERNAL_TOKEN` | Webhook auth token | "" | should-set |
| `VALIDATION_TIMEOUT_SECONDS` | Validation timeout | 120 | no |
| `OPENAI_API_KEY` | OpenAI API key | — (secret) | no |
| `OPENAI_MODEL` | OpenAI model | gpt-4o-mini | no |
| `GEMINI_API_KEY` | Gemini API key | — (secret) | no |
| `GEMINI_MODEL` | Gemini model | gemini-1.5-flash | no |

## python-services (10 vars)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `REDIS_URL` | Redis connection | — | no |
| `RABBITMQ_URL` | RabbitMQ connection | — | no |
| `S3_ENDPOINT` | S3/MinIO endpoint | — | no |
| `S3_ACCESS_KEY` | S3 access key | `minioadmin` (INSECURE) | no |
| `S3_SECRET_KEY` | S3 secret key | `minioadmin` (INSECURE) | no |
| `S3_BUCKET` | S3 bucket | — | no |
| `DOCKER_HOST` | Docker daemon socket | — | no |
| `SUBMISSION_GRPC_PORT` | Submission gRPC port | — | no |
| `SANDBOX_GRPC_PORT` | Sandbox gRPC port | — | no |
| `PLAGIARISM_GRPC_PORT` | Plagiarism gRPC port | — | no |

> Consumed via docker-compose env / gRPC config (no `os.getenv`/`BaseSettings` detected in `.py`).

## talent-ai-service (19 vars)
> No `.env` file — vars come from pydantic `BaseSettings` defaults + deploy env. Uses **Qdrant** as its vector store (⚠️ different from backend's Pinecone — two vector engines in the codebase).

| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `SERVICE_NAME` | Service name | — | no |
| `SERVICE_API_KEY` | Service auth key (matching); compared against the `X-Service-Key` header the backend sends. The service now **accepts either `SERVICE_API_KEY` or `INTERNAL_SERVICE_KEY`** (`effective_service_key`, prefers `SERVICE_API_KEY`) — set **one** of them to the backend's `INTERNAL_SERVICE_KEY` value. Footgun (two names, same secret) resolved Session 5. | — (secret) | no |
| `PORT` | Service port | — | no |
| `ENV` | Environment name | — | no |
| `BACKEND_BASE_URL` | Node backend URL | — | no |
| `BACKEND_INTERNAL_TOKEN` | Backend auth token | — (secret) | no |
| `GEMINI_API_KEY` | Gemini API key | — (secret) | no |
| `GEMINI_MODEL` | Gemini model | — | no |
| `EMBEDDING_PROVIDER` | Embedding provider | — | no |
| `EMBEDDING_MODEL` | Embedding model | — | no |
| `VECTOR_SIZE` | Embedding vector dimension | — | no |
| `QDRANT_URL` | Qdrant vector DB URL | — | no |
| `QDRANT_COLLECTION_CANDIDATES` | Qdrant candidates collection | — | no |
| `QDRANT_COLLECTION_JOBS` | Qdrant jobs collection | — | no |
| `REDIS_URL` | Redis connection | — | no |
| `REDIS_QUEUE_NAME` | Redis queue name | — | no |
| `REDIS_DLQ_NAME` | Redis dead-letter queue name | — | no |
| `WORKER_MAX_RETRIES` | Worker max retries | — | no |
| `WORKER_RETRY_BASE_SECONDS` | Worker retry backoff base | — | no |

## runner-python (1 var)
| Var | Purpose | Default (safe) | Required? |
|---|---|---|---|
| `TEST_TIMEOUT_S` | Test execution timeout | — | no |

---

# Cross-cutting findings (from the inventory)

## Vars referenced in code but absent from any `.env` (112) — default-reliant
These work off in-code defaults today. They must be surfaced in each `.env.example` so deployment doesn't silently rely on localhost/dev defaults. Regenerate anytime with `verify-env-matrix.mjs`. Representative examples (full list = `--report`): `RUNNER_*` image/limit family, `GITHUB_* / HACKERRANK_* / LEETCODE_* / STACKOVERFLOW_*` scraper knobs, `QDRANT_*`, `MINIO_*`, `AI_SERVICE_BASE_URL`, `DOC_VALIDATOR_URL`, `MATCHING_AI_BASE_URL`, `TALENT_AI_BASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `IHSSANE_*`, `WAFAA_*`, `UNREAL_SPEECH_*`.

## Vars in `.env` but never referenced in code (10) — possibly dead / infra-only
`DOCKER_HOST`, `JWT_EXPIRES_IN`, `NEXT_PUBLIC_MAX_FILE_SIZE`, `PLAGIARISM_GRPC_PORT`, `RABBITMQ_URL`, `REQUEST_TIMEOUT`, `SANDBOX_GRPC_PORT`, `SHADOW_DATABASE_URL`, `STORAGE_PROVIDER`, `SUBMISSION_GRPC_PORT`.
> Note: several are legitimately consumed outside JS/PY scanning — `DOCKER_HOST`/`*_GRPC_PORT`/`RABBITMQ_URL` via docker-compose & gRPC, `SHADOW_DATABASE_URL` by Prisma CLI, `JWT_EXPIRES_IN`/`STORAGE_PROVIDER` may be genuinely unused. Confirm before deleting (Wave 0 Phase 0.7 / later).

## Duplicate keys in `.env` (silent override — fix in Phase 0.6)
- `backend/.env` defines **`GEMINI_API_KEY` twice** (raw `KEY=` lines = 50, distinct = 49). `dotenv` keeps the **last** occurrence, so the first value is silently dropped — a footgun if the two values ever differ. De-dupe when authoring `backend/.env.example`. (Separate from the corrupt `[object Promise]` line at `backend/.env:41`, R-43, which has no `=` and is not counted.)

## Naming drift & anomalies to reconcile (later waves)
- `OCR_TARGET_MIN_W` (backend `.env`) vs `OCR_TARGET_MIN_WIDTH` (document-validator pydantic field) — same concept, two names; doc-validator's `extra="ignore"` means the backend-style name is silently dropped.
- `YOUSSRRA_WEBHOOK_KEY` (backend, **triple R**) vs `YOUSSRA_EXEC_ADDR` (assessment) — inconsistent spelling of the same vendor.
- ~~Frontend URL convention conflict: `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_BASE_URL` overlap (R-27).~~ **RESOLVED Session 6** — canonical = `NEXT_PUBLIC_API_URL` (bare host); central resolver `frontend/src/lib/config/api.ts` derives `/api/v1`+`/api`+socket; old vars kept as back-compat fallback. Backend AI-service URLs also env-driven (R-13): `question.controller.ts` no longer hardcodes `localhost:8000`; `backend/src/config/appUrls.ts` centralises the `FRONTEND_URL`/`BACKEND_URL` defaults. Guarded by `tools/verify-api-config.mjs`.
- Two vector stores: backend → **Pinecone** (`PINECONE_*`), talent-ai-service → **Qdrant** (`QDRANT_*`). Decide canonical engine (Wave 2/6).
- `PATH` appears as a code ref in ai-service — OS-provided, not app config (documented for completeness).

---

# Phase 1.5 — Edge hardening (added Session 5)
Transport/headers/CORS/rate-limit/body-limit vars introduced in Wave 1 Phase 1.5. All are code-referenced (backend `app.ts` / `middlewares/rateLimit.ts`, ai-service `core/config.py`) with in-code defaults, and documented in the matching `.env.example`.

| Var | Service | Purpose | Safe default |
|---|---|---|---|
| `CORS_ALLOWED_ORIGINS` | backend | Comma-separated browser origins allowed with credentials (no wildcard). | `http://localhost:3000` |
| `TRUST_PROXY` | backend | Reverse-proxy hops to trust for the real client IP (rate-limit key). | `1` |
| `JSON_BODY_LIMIT` | backend | Max JSON request body; oversized → 413. | `1mb` |
| `RATE_LIMIT_GLOBAL_WINDOW_MS` / `RATE_LIMIT_GLOBAL_MAX` | backend | Global limiter window (ms) + max requests/IP. | `900000` / `600` |
| `RATE_LIMIT_AUTH_WINDOW_MS` / `RATE_LIMIT_AUTH_MAX` | backend | Auth surface (login/refresh/forgot) limiter. | `900000` / `20` |
| `RATE_LIMIT_OCR_WINDOW_MS` / `RATE_LIMIT_OCR_MAX` | backend | OCR upload limiter (heavy CPU). | `900000` / `30` |
| `RATE_LIMIT_SUBMISSION_WINDOW_MS` / `RATE_LIMIT_SUBMISSION_MAX` | backend | Code-submission/enqueue limiter. | `900000` / `60` |
| `RATE_LIMIT_AI_WINDOW_MS` / `RATE_LIMIT_AI_MAX` | backend | AI-service fan-out limiter (cost control). | `900000` / `60` |
| `RATE_LIMIT_PREFIX` | backend | Optional namespace prepended to Redis rate-limit keys (isolate deployments/tests sharing one Redis). | (empty) |
| `RATE_LIMIT_FORCE_MEMORY` | backend | Kill-switch (set to 1) forcing the in-memory limiter store even when REDIS_URL is set. | (off) |
| `CORS_ALLOW_ORIGINS` | ai-service | Comma-separated CORS allowlist (replaces `allow_origins=["*"]`). | `http://localhost:3000,http://localhost:5000` |

> Rate limits are enforced **across instances** when `REDIS_URL` is set (shared `RedisStore`); otherwise per-process (in-memory) with a boot warning.

### Firehose retention (Wave 2 / Phase 2.4, R-30)

Opt-in reaper for append-only/firehose tables. Code-referenced in `server.ts` + `scheduler/retention.scheduler.ts`; off by default so a deploy never deletes data unless it consciously enables it. Per-table retention windows are code constants in `services/retention.service.ts`.

| Var | Service | Purpose | Safe default |
|---|---|---|---|
| `RETENTION_ENABLED` | backend | Opt-in switch for the firehose retention reaper (batched deleteMany of aged rows). Reaper runs only when set to `true`. | `false` |
| `RETENTION_CRON` | backend | Cron expression for the retention reaper (low-traffic window). | `15 3 * * *` |

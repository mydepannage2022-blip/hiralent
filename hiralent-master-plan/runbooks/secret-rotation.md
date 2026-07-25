# Runbook — Secret Rotation (Wave 1 / Phase 1.1)

> **Premise:** every credential that has ever sat in a tracked file, an on-disk `.env`, a
> `.env-snapshots/` backup, or a built image is treated as **compromised**. Rotation is the
> only real revocation lever — this codebase has no token denylist.

This runbook has two halves:

- **Part A — already done in code** (Session 1). No action needed.
- **Part B — you must do at each provider.** Claude cannot revoke or mint provider keys.

---

## Part A — done in code (Session 1)

| What | Where |
|---|---|
| Removed hardcoded `ADMIN_JWT_SECRET` fallback (2 files) | `services/admin.auth.service.ts`, `middlewares/adminAuth.middleware.ts` |
| Removed committed Gemini key literal | `ai-service/app/gemini_service.py` |
| Removed hardcoded internal-token default | `assessment-ai-service/app/core/config.py` + its `docker-compose.yml` |
| Removed hardcoded S3 credentials + duplicate client | `controller/candidate/candidate.case.controller.ts` (now reuses `lib/s3.ts`); `lib/minio.ts` deleted |
| Removed weak `minioadmin` defaults | `document-validator-service/app/config.py`, three `.env.example` files |
| Removed secret-value log line | `workers/matching-outbox.runner.ts` |
| Fail-fast env helper + boot assertion | `backend/src/config/requireEnv.ts`, called in `server.ts` |
| **Self-issued secrets rotated** (new 288-bit values written to local `.env`) | `JWT_SECRET`, `ADMIN_JWT_SECRET`, `INTERNAL_SERVICE_KEY`, `BACKEND_INTERNAL_TOKEN`, `INTERNAL_API_TOKEN` |

**Side effect of the JWT rotation:** every previously issued user and admin token is now
invalid. All users are logged out. That is intended — it is what "invalidate old tokens" means.

Pre-rotation copies of each `.env` are in `.env-snapshots/` (git-ignored) if you need to roll back.

---

## Part B — do these at each provider

Order matters: **revoke first, then mint, then paste, then restart, then verify.** Revoking
first guarantees the leaked value is dead even if the rest is interrupted.

### B1. Google Gemini — 3 separate keys ⚠️ highest priority

The first key below was **committed to git** and is in history. Revoke it before anything else.

| # | Leaked where | Paste new value into | Env var |
|---|---|---|---|
| 1 | `ai-service/app/gemini_service.py:47` (committed to git) | `ai-service/.env` | `GEMINI_API_KEY` |
| 2 | `ai-service/.env` (on disk) | `ai-service/.env` | `GEMINI_API_KEY` |
| 3 | `assessment-ai-service/.env` (on disk) | `assessment-ai-service/.env` | `GOOGLE_API_KEY` |

> Keys 1 and 2 are the same variable — you end up with **one** new key for `ai-service`, plus
> **one** for `assessment-ai-service`. Both old values must be deleted at the provider.

**Steps**
1. Go to <https://aistudio.google.com/app/apikey>.
2. **Delete** every existing key listed there that this project used.
3. Create a new key → paste into `ai-service/.env` as `GEMINI_API_KEY=`.
4. Create a second new key → paste into `assessment-ai-service/.env` as `GOOGLE_API_KEY=`.
5. Restart both services.

**Verify (the "old key → 403" check).** With the OLD key value in hand:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://generativelanguage.googleapis.com/v1beta/models?key=OLD_KEY_HERE"
```

Expect `400` or `403` (key rejected). A `200` means the old key is still live — go back to step 2.

**Verify the service still works from env:**

```bash
cd ai-service && python -c "from app.gemini_service import gemini_ai_service; print('available:', gemini_ai_service.is_available)"
```

Expect `available: True`. If it prints `False`, `GEMINI_API_KEY` is not reaching the process —
that is the fail-safe working (it now drops to demo mode instead of silently using a baked key).

### B2. Pinecone

1. <https://app.pinecone.io> → API Keys → delete the old key → create new.
2. Paste into `backend/.env` as `PINECONE_API_KEY=`.
3. Restart backend. First vector operation will fail loudly if the key is wrong (no longer an empty-key client).

### B3. Cloudinary

1. Cloudinary console → Settings → Access Keys → rotate the API key/secret.
2. Paste the full URL into `backend/.env` as `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`.

### B4. SMTP

1. In your mail provider, revoke the existing app password / SMTP credential and issue a new one.
2. Update `SMTP_USER` / `SMTP_PASS` in `backend/.env`.
3. Verify: `cd backend && pnpm exec tsx src/scripts/testEmail.ts` (sends a test mail).

### B5. Firebase service account

Heavier than the others — this is a Google Cloud service-account key, not a console toggle.

1. GCP Console → IAM & Admin → Service Accounts → the account in `FIREBASE_CLIENT_EMAIL`.
2. Keys tab → **delete** the existing key → **Add key → JSON** → download.
3. From the JSON, update in `backend/.env`: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   and `FIREBASE_PRIVATE_KEY` (keep it one line with `\n` escapes, quoted).
4. Restart backend. `utils/firebase.ts` initialises lazily, so a bad value surfaces on first
   token verification, not at boot.

### B6. MinIO / S3

Local dev uses the credentials in the root `docker-compose.yml`; those are **local-only** and
documented as such in `docs/DEV_ARCHITECTURE.md` — they are deliberately unchanged.

**For any shared/staging/prod MinIO:**
1. MinIO console → Identity → Service Accounts → delete the old access key → create new.
2. Update `S3_ACCESS_KEY` / `S3_SECRET_KEY` in `backend/.env`, `document-validator-service/.env`,
   and `python-services/.env`.
3. Restart the services that upload/serve documents.

### B7. Peer services holding shared secrets

Two self-issued secrets were rotated for you, but they must **match** on the other side:

| Secret | Already updated | Must also be updated on |
|---|---|---|
| `BACKEND_INTERNAL_TOKEN` | `backend/.env`, `document-validator-service/.env` | any other caller of the backend webhook |
| `INTERNAL_SERVICE_KEY` | `backend/.env` | the matching-AI service that validates `x-internal-key` |
| `INTERNAL_API_TOKEN` | `assessment-ai-service/.env` | whatever calls the assessment service (and the deploy env, since compose now reads `${INTERNAL_API_TOKEN}` from the environment) |

> `assessment-ai-service/docker-compose.yml` no longer hardcodes the token. Export
> `INTERNAL_API_TOKEN` in the deploy environment before `docker compose up`, or the container
> starts unconfigured and every internal call returns **500 "INTERNAL_API_TOKEN is not configured"**.

---

## After rotating — verify

```bash
node hiralent-master-plan/tools/verify-secrets-hygiene.mjs
```

Then the full gate:

```bash
node hiralent-master-plan/tools/run-all-verifiers.mjs --skip-local
```

---

## Deliberately deferred: git history scrub

The Gemini key at `ai-service/app/gemini_service.py:47` remains in **git history**.

**Why not scrubbed now:** revocation (B1) makes the value worthless, which is the actual
security fix. Rewriting history with `git-filter-repo`/BFG changes every commit SHA and needs a
force-push plus re-clones by anyone else working on the repo — real coordination cost for no
additional security once the key is dead.

**Consequence:** CI scans the working tree (`gitleaks detect --no-git`), not history, so the old
commit does not fail the build. This still catches any **new** secret before it lands.

**If you later want history clean** (e.g. before open-sourcing or handing over the repo):

```bash
# Recover the old value from git history first — do NOT write it into any tracked file:
#   git show <old-commit>:ai-service/app/gemini_service.py | grep AIza
# Then, with that value in a LOCAL, git-ignored file (one `OLD_KEY==>REDACTED` line):
git filter-repo --replace-text /path/to/local-replacements.txt
```

Then force-push, have every collaborator re-clone, and drop `--no-git` from
`.github/workflows/secret-scan.yml` so history is scanned too (adding any legacy finding
fingerprints to `.gitleaksignore`).

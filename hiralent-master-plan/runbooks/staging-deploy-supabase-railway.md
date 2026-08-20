# Runbook — Staging deploy: Supabase + Railway + Vercel

> Step-by-step for **Phase 1** of [`wave-8-lite-staging.md`](../waves/wave-8-lite-staging.md):
> get the backend live on Railway, the database on Supabase, and the existing Vercel frontend
> talking to it. End state = a link you can send to the client.
>
> Everything the code needs is already built (W-1, W-2, W-3, W-7, W-9) and the secrets are
> generated (W-4). What is left is wiring.
>
> **Time:** about 60–90 minutes, most of it waiting on the first Docker build.

---

## Before you start

- [ ] **Push the branch.** Railway deploys from GitHub, so the new files (`backend/Dockerfile`,
      `backend/railway.toml`, `staging-entry.ts`, `release.ts`, the demo seed) must be committed and
      pushed. There is a lot of uncommitted Wave 5 work in the tree — decide deliberately what goes.
- [ ] Open `.env-snapshots/wave-8-lite-staging/staging-secrets.env` — you will paste from it
      repeatedly. **Never** commit it or paste it into chat.
- [ ] Have the Gemini API key ready (Phase 2 needs it; Phase 1 does not).

Legend: `<…>` = something you copy from a dashboard.

---

## Step 1 — Supabase: the database

1. Create a new project. **Pick the region closest to the Railway region you will use** — every
   query crosses this hop.
2. Save the database password Supabase generates. You cannot see it again.
3. Go to **Connect** (or Project Settings → Database) and copy **two different** strings:

   | Which | Port | Used for |
   |---|---|---|
   | **Transaction pooler** | `6543` | `DATABASE_URL` — the app's runtime pool |
   | **Session pooler** | `5432` | `DIRECT_DATABASE_URL` — migrations only |

4. **Add the pool parameters to the transaction-pooler string.** Supabase does not include them, and
   the backend **refuses to boot in production without `connection_limit`**
   (`config/requireEnv.ts:96` — an unbounded Prisma pool is R-06, the #1 scale blocker):

   ```
   DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"
   DIRECT_DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:5432/postgres"
   ```

> ⚠️ **Do not use `db.<ref>.supabase.co:5432`** for `DIRECT_DATABASE_URL`, even though Supabase calls
> it "direct connection". That host is **IPv6-only** and Railway's egress is IPv4 — migrations would
> fail with a connection error that looks nothing like the real cause. Use the **session pooler**
> host (gotcha G-2).
>
> ⚠️ Leave `SHADOW_DATABASE_URL` **unset**. Pointing it at the primary would let `migrate dev` wipe it
> (R-07). The release step uses `migrate deploy`, which needs no shadow database.

---

## Step 2 — Supabase: file storage (replaces MinIO)

1. **Storage → Create bucket** → name it exactly `hiralent-uploads`. Keep it **private** — CVs are
   PII, and the backend serves them through short-lived signed URLs, never public links.
2. Create an **S3 access key** (Storage settings → S3 access keys). You get an access key ID and a
   secret. Copy both now.
3. These become:

   ```
   STORAGE_PROVIDER=s3
   S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3
   S3_REGION=<your project region, e.g. eu-west-3>
   S3_BUCKET=hiralent-uploads
   S3_ACCESS_KEY=<access key id>
   S3_SECRET_KEY=<secret>
   S3_FORCE_PATH_STYLE=true
   ```

No code change is needed — `backend/src/lib/s3.ts` is a plain AWS SDK client.

---

## Step 3 — SMTP (W-5) — do not skip this

Without working email, **nobody can complete signup**, so staging is unusable. The local bypass
(`ENABLE_DEV_MINT`) is forbidden here because it un-gates the dev mint routes.

**Brevo** (free, 300 emails/day, works with any recipient address) is the simplest:

1. Create an account → **SMTP & API → SMTP**.
2. Copy the login and the SMTP key:

   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=<brevo login>
   SMTP_PASS=<brevo smtp key>
   SMTP_FROM=no-reply@hiralent.com
   ```

Gmail with an app password also works, with a much lower send limit.

---

## Step 4 — Railway: create the service

1. **New Project → Deploy from GitHub repo** → select the repo.
2. **Service Settings → Root Directory → `backend`.** This matters: it is what makes Railway find
   `backend/Dockerfile` and `backend/railway.toml`.
3. Confirm the builder is **Dockerfile**, not Nixpacks. `railway.toml` requests it, but check —
   Nixpacks cannot build this service (`canvas` compiles from source and needs the cairo/pango
   headers the Dockerfile installs).
4. **Settings → Networking → Generate Domain.** You need this URL *before* setting the env vars
   below, because several of them contain it.
5. **Settings → Deploy** — confirm a **Pre-Deploy Command** of:

   ```
   node dist/src/scripts/release.js
   ```

   > ⚠️ **Gotcha G-21.** `railway.toml`'s `preDeployCommand` key was written from the plan and has
   > **not** been verified against Railway's live schema. If Railway silently ignores it, the release
   > never runs and the app boots against an **unmigrated database** — which surfaces as a hundred
   > unrelated errors, not as a migration error. Setting it in the dashboard as well costs nothing
   > and removes the risk.

6. **Keep replicas at 1.** In-memory queues, in-process cron and the MemoryStore rate limiter are all
   per-process. Two replicas double-fire every cron job and split the queue (shortcut S-1).

---

## Step 5 — Railway: environment variables

Paste this block into the service's variable editor, filling the `<…>` placeholders. Secrets marked
**[secrets file]** come from `.env-snapshots/wave-8-lite-staging/staging-secrets.env`.

```bash
# ---- core ----
NODE_ENV=production
APP_URL=https://<railway-domain>
BACKEND_URL=https://<railway-domain>
CLIENT_URL=https://<vercel-domain>
FRONTEND_URL=https://<vercel-domain>
# ENABLE_DEV_MINT -> leave UNSET

# ---- database (Step 1) ----
DATABASE_URL=<transaction pooler + ?pgbouncer=true&connection_limit=10&pool_timeout=20>
DIRECT_DATABASE_URL=<session pooler, port 5432>

# ---- no Redis: single-process topology ----
FORCE_INMEMORY=1
RATE_LIMIT_FORCE_MEMORY=1
# REDIS_URL -> leave UNSET  (setting it WITHOUT FORCE_INMEMORY makes the app refuse to boot,
#                            on purpose — see bootstrap/assertSingleProcessTopology.ts)

# ---- secrets [secrets file] ----
JWT_SECRET=
ADMIN_JWT_SECRET=
FILE_URL_SECRET=
INTERNAL_API_TOKEN=
INTERNAL_SERVICE_KEY=
BACKEND_INTERNAL_TOKEN=
SUPERADMIN_EMAIL=admin@hiralent.com
SUPERADMIN_PASSWORD=

# ---- storage (Step 2) ----
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3
S3_REGION=<region>
S3_BUCKET=hiralent-uploads
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_FORCE_PATH_STYLE=true

# ---- email (Step 3) ----
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@hiralent.com

# ---- edge ----
CORS_ALLOWED_ORIGINS=https://<vercel-domain>
TRUST_PROXY=1

# ---- AI: Phase 2, leave UNSET for now ----
AI_MODEL_PROVIDER=gemini
AI_FAKE=0
GEMINI_API_KEY=<optional in Phase 1>

# ---- payments (Stripe TEST mode) ----
STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET -> filled in Step 8

# ---- schedulers ----
SUBSCRIPTION_EXPIRY_ENABLED=true
PAYMENT_RECONCILIATION_ENABLED=true
RETENTION_ENABLED=false
SCRAPING_SCHEDULER_ENABLED=false

# ---- runner: OFF until Phase 3.5 ----
# RUNNER_HTTP_URL / RUNNER_STUB_TOKEN -> leave UNSET (setting the URL without the token
#                                         makes the app refuse to boot, by design)
DISABLE_AV=1
```

Do **not** set `PORT` — Railway injects it and `server.ts:109` already reads it.

---

## Step 6 — Deploy and verify the backend

Trigger the deploy, then check **in this order** — each one rules out a different failure:

- [ ] **Build succeeded.** First build is slow (`canvas` compiles from source). If it fails here, it
      is the native toolchain, not your config.
- [ ] **The release step ran.** Find this in the logs:
      ```
      [release] ✅ release complete — migrations applied, core data present
      ```
      If it is missing, the pre-deploy hook did not fire (G-21) — fix Step 4.5 before going further.
      If it *failed*, it tells you exactly which post-condition is missing (no `plan_free`, no
      superadmin, empty RBAC) — that is the script doing its job.
- [ ] **Boot log looks right:**
      ```
      FORCE_INMEMORY enabled — using in-memory queue
      🧩 staging-entry: single-process mode (API + in-process pollers)
         ↳ poller started: run
         ↳ poller started: assessment-outbox
         ↳ poller started: assessment-insight
         ↳ poller started: assessment-invite-sweeper
         ↳ poller started: jobApplication-outbox
         ↳ poller SKIPPED: matching-outbox (MATCHING_AI_BASE_URL not set)
      ✅ Postgres connected
      🚀 Server listening on port ...
      ```
- [ ] **Health check:** `https://<railway-domain>/health` → `{"status":"ok","db":"up"}`

---

## Step 7 — Vercel: point the frontend at the backend

1. Project Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://<railway-domain>
   NEXT_PUBLIC_SOCKET_URL=https://<railway-domain>
   NEXT_PUBLIC_FRONTEND_URL=https://<vercel-domain>
   ```
   Do **not** also set `NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL` — those are deprecated
   fallbacks and setting both invites drift.

2. **Redeploy.** This is not optional. `NEXT_PUBLIC_*` is inlined into the client bundle at **build**
   time (`frontend/src/lib/config/api.ts:18`), so changing the variable without rebuilding leaves the
   browser calling `http://localhost:5000` — and it fails silently, only in production (G-4).

3. Back on Railway, confirm `CORS_ALLOWED_ORIGINS` is exactly the Vercel origin (scheme + host, no
   trailing slash, no path) and redeploy the backend if you changed it.

- [ ] Open the site, sign up, and confirm the verification email arrives.
- [ ] Open the browser console — no CORS errors, and the Socket.IO connection upgrades to **WSS**.

---

## Step 8 — Stripe (test mode)

1. Stripe Dashboard in **Test mode** → Developers → Webhooks → Add endpoint.
2. Endpoint URL — note the lowercase `stripe` segment, which is the `PaymentGatewayType` enum value
   the router resolves (`subscription.routes.ts:77` → `POST /webhook/:gateway`):

   ```
   https://<railway-domain>/api/v1/subscription/webhook/stripe
   ```

   > The path must stay under `/api/v1/subscription/webhook`, because `app.ts:80` mounts
   > `express.raw()` on exactly that prefix **before** the global JSON parser. Signature verification
   > needs the raw body; a parsed body silently fails to verify.

3. Copy the signing secret (`whsec_…`) into Railway as `STRIPE_WEBHOOK_SECRET`, redeploy.
4. Send a test event and confirm a row appears in `ProcessedWebhookEvent` (the idempotency ledger —
   a Stripe retry of the same event id must be a no-op, not a double-apply).

Never use real card details here. Test mode only.

---

## Step 9 — Demo fixture

Once the release step has succeeded at least once, run the fixture **once** from the Railway service
shell:

```bash
ALLOW_DEMO_SEED=1 DEMO_USER_PASSWORD='<from the secrets file>' node dist/prisma/seeds/staging-demo.seed.js
```

It is intentionally not part of the deploy. Full details, and what each demo account demonstrates, are
in [`staging-demo-accounts.md`](staging-demo-accounts.md).

---

## Step 10 — Smoke test

- [ ] Sign up as a new candidate — verification email arrives, login works
- [ ] Log in as each demo account (company, candidate, agency) and as the superadmin
- [ ] Company: the demo job is listed, the demo application shows in the pipeline
- [ ] Upload a file → confirm the object appears in the Supabase bucket and its signed URL opens
- [ ] Chat: send a message, confirm it arrives live (Socket.IO over WSS)
- [ ] Billing page loads; Stripe test checkout completes

**Expected to be unavailable in Phase 1** (not bugs): AI question/JD generation, document validation,
candidate matching (all Phase 2–3), the coding-assessment **Run** button (Phase 3.5), and company
AI-insight recompute — which returns a clear `503 AI_COMPANY_SETUP_UNAVAILABLE` because it needs Redis.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Boot: `Refusing to start: DATABASE_URL is missing a valid connection_limit` | Pasted Supabase's string as-is | Append `?pgbouncer=true&connection_limit=10&pool_timeout=20` (G-1) |
| Release step: connection error on migrate | Used `db.<ref>.supabase.co` (IPv6-only) | Use the **session pooler** host for `DIRECT_DATABASE_URL` (G-2) |
| Boot: `REDIS_URL is set but FORCE_INMEMORY is not enabled` | Both set, or Redis left over | Set `FORCE_INMEMORY=1` or unset `REDIS_URL` — this guard is deliberate |
| Boot: `Refusing to start: missing required secret(s)` | `JWT_SECRET` / `ADMIN_JWT_SECRET` not set | Paste from the secrets file |
| Every gated feature returns 403; quotas read 0 | `plan_free` missing — the seed did not run | Check the release step ran (G-21, G-5) |
| Cannot log in as admin at all | Seed skipped the admin (`SUPERADMIN_PASSWORD` unset) | Set it and redeploy — the release step should have failed the deploy for this |
| Frontend still calls `localhost:5000` | Vercel env changed without a rebuild | Redeploy Vercel (G-4) |
| CORS errors in the browser | `CORS_ALLOWED_ORIGINS` mismatch | Exact origin, no trailing slash |
| Site suddenly dead after a quiet week | Supabase free pauses after 7 days idle | Resume it from the Supabase dashboard (G-3) |
| First request after idle takes 20–30 s | Sleeping HF Space + no retries/circuit breakers yet | Expected in Phase 2+; Wave 6 work (G-16) |

---

## What this staging environment is not

Recorded in full as shortcuts S-1…S-9 in the plan. The short version: **single instance**, no CI/CD,
no rollback, no backups, no monitoring, self-managed runner VM, and Wave 5 paused mid-wave (agency
billing unbuilt). It is a demo environment, not a production one.

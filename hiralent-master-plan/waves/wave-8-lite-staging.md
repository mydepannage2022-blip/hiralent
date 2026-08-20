# Wave 8-lite — Free Staging Deployment (Railway + Vercel + Supabase)

> **Goal:** get the whole product onto a **public staging URL** that a client can click through, at
> **~$0/month** infrastructure cost (only the AI provider key is paid), *without* doing the full
> Wave 8 production programme.
>
> ## 🅿️ PARKED — 2026-08-19. Do not continue this track.
>
> **Decision:** deployment goes back to **Wave 8, in wave order** (finish Wave 5 → Wave 6 → Wave 7 →
> Wave 8). Wave 5 is being resumed instead.
>
> **Why:** this track jumped from the middle of Wave 5 straight to the last wave, skipping Waves 6
> and 7 entirely. That would have demoed a product with **no agency billing** (S5 unbuilt, so agency
> users pass company quota gates), **no observability** (Wave 7 — every problem debugged by reading
> Railway logs), and **no load headroom** (Wave 6 — AI calls still inline in the request path). Every
> shortcut recorded in §9 (S-1…S-9) would then have had to be redone in Wave 8 anyway.
>
> **What survives and is already on `main`:** the Dockerfile (W-1), the single-process entry (W-2),
> the release step (W-3), the demo fixture (W-7), the generated secret set (W-4), this plan and both
> runbooks. All of it is reusable **verbatim** in Wave 8 — nothing here needs rewriting, only
> re-deciding (Wave 8 replaces the free-tier hosts and the S-1…S-9 shortcuts with real ones).
>
> **Two fixes from this track are NOT deployment work and stay live on `main`:** the
> `aiCompanySetup.queue` module-scope Redis boot blocker (**W-9**) and the `.gitignore` secret-leak
> gap (**W-4**). Both were latent defects independent of any deployment.
>
> **To resume:** the code is done through Phase 1. What was never started is the account wiring —
> W-5 (SMTP) and W-6 (Supabase project + Railway service + Vercel rebuild). Follow
> [`runbooks/staging-deploy-supabase-railway.md`](../runbooks/staging-deploy-supabase-railway.md).
>
> ---
>
> **Original status line:** written 2026-08-19, after Wave 5 S4 was closed and Wave 5 was paused at
> the user's request. Phase 1 code was then built (W-1, W-2, W-3, W-4, W-7, W-9) before the
> direction was reconsidered.
>
> **This is NOT Wave 8.** Wave 8 (`wave-8-deployment-staging-to-production.md`) stays the canonical
> production plan — CI/CD, TLS, image scanning, PgBouncer, rollback, prod launch. This file is the
> minimum honest path to a *demoable staging environment*, and it deliberately takes shortcuts that
> §9 lists explicitly so they are never mistaken for production-ready.

---

## 0. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Backend host | **Railway** | User's call. WebSockets work, no cold-start sleep, real logs. Render free was the $0 alternative but sleeps after 15 min idle and caps at 512 MB — a demo that takes 50 s to answer reads as "broken". |
| Frontend host | **Vercel** (already deployed) | Free Hobby plan. |
| Database | **Supabase** Postgres (free) | Already provisioned by the user. Fits the existing `directUrl` split exactly. |
| Object storage | **Supabase Storage** (S3-compatible) | Replaces MinIO with zero code change — `lib/s3.ts` is a plain AWS SDK client. |
| Redis (backend) | **NONE** | `FORCE_INMEMORY=1`. See §3. |
| Redis (matching service only) | **Upstash** free | The matching service has its own queue + DLQ. It does not touch the backend's queues. |
| Vector store | **Qdrant Cloud** free (1 GB) | Required by the matching service. |
| Python AI services | **Hugging Face Spaces** (Docker SDK, free) | Every service already has a `Dockerfile`. Free 2 vCPU / 16 GB — the only free tier that fits the OCR image. |
| AI service coverage | **All five** (user decision, 2026-08-19) | `ai-service`, `job-creation-ai`, `assessment-ai`, `document-validator`, `matching-candidate-job`. Only `scraping-candidates` stays out. |
| Demo data | **One of each, explicitly labelled** (user decision, 2026-08-19) | See **W-7**. |
| Code execution | **Deploy the runner** (user decision, 2026-08-19) — but **NOT on HF Spaces** | The runner shells out to `docker run`; it needs a host with a real Docker **daemon**. See **W-8** and gotcha **G-17**. |
| Environment name | `staging` | `NODE_ENV=production` is still set (see §7 gotcha G-7). |

### Cost

| Item | Cost |
|---|---|
| Vercel Hobby, Supabase free, HF Spaces free, Brevo free, Stripe test mode | **$0** |
| Railway | **$5 one-time trial credit**, then Hobby **$5/month** |
| Gemini API key | user-provided (Google AI Studio free tier is sufficient for staging) |

> ⚠️ Railway has **no perpetual free plan**. The trial credit will run a small backend container for
> roughly 2–4 weeks. Budget $5/month after that, or fall back to Render free and accept the sleep.

---

## 1. Scope

**In scope** — a staging environment where all four roles (candidate · company · agency · admin) can
sign up, log in, and complete their canonical journeys, with Stripe in **test mode**.

**Out of scope** (deliberately — these belong to real Wave 8):
- CI/CD pipeline, image scanning, secret scanning, rollback
- Custom domain + TLS termination we own (Railway/Vercel-provided HTTPS is used as-is)
- PgBouncer (Supabase's Supavisor is used instead), read replicas, backups/restore drill
- Horizontal scaling, Socket.IO Redis adapter, leader election for cron
- Load testing (Wave 6), observability stack (Wave 7)

---

## 2. Target architecture

```
   Vercel (free)                  Railway (1 container)              Supabase (free)
┌────────────────────┐  HTTPS   ┌──────────────────────────┐       ┌──────────────────┐
│  Next.js 15        │─────────>│  Express 5 API           │──────>│  Postgres        │
│  frontend          │<── WSS ──│  + Socket.IO             │       │  (Supavisor)     │
│  (already live)    │          │  + node-cron schedulers  │──────>│  Storage (S3)    │
└────────────────────┘          │  + in-process outbox     │       └──────────────────┘
                                │    pollers               │
                                └───────────┬──────────────┘
                                            │ X-API-Token (INTERNAL_API_TOKEN)
                                ┌───────────▼──────────────┐
                                │  HF Spaces (free)        │
                                │  ai-service      :8000   │  ← Phase 2
                                │  job-creation-ai :8003   │  ← Phase 2
                                │  assessment-ai   :8001   │  ← Phase 3
                                │  doc-validator   :8002   │  ← Phase 3
                                │  matching        :8011   │  ← Phase 3
                                └───────────┬──────────────┘
                                            │  (matching only)
                                ┌───────────▼──────────────┐
                                │  Qdrant Cloud (free 1 GB)│
                                │  Upstash Redis (free)    │
                                └──────────────────────────┘

   Railway backend ──X-Runner-Token──> ┌────────────────────────────────┐
                                       │  Isolated VM with Docker       │  ← Phase 3.5 (W-8)
                                       │  runner-python/http_service.py │
                                       │  + hardened `docker run` jails │
                                       │  HOLDS NO OTHER SECRETS        │
                                       └────────────────────────────────┘
```

**Dropped from the local stack:** MinIO ❌ · PgBouncer ❌ · MongoDB ❌ (already removed in Wave 2 S6) ·
`scraping-candidates` ❌ · runner-python ❌ (see §9 shortcut S-3). Redis survives **only** as the
matching service's private queue — the Node backend still runs without any broker.

---

## 3. Why no Redis (the single biggest cost saving)

Verified in code, not assumed:

- `backend/src/workers/queue.ts:9` — `FORCE_INMEMORY=1` swaps BullMQ for an in-memory queue. Same for
  `assessmentQueue.ts:12`, `run.worker.ts:168`, `assessment-outbox.worker.ts:143`,
  `assessment-insight.worker.ts:70`.
- The **outbox workers** (`matching-outbox`, `jobApplication-outbox`, `assessment-outbox`) are a
  transactional-outbox pattern — they poll a **Postgres table**, not Redis. They work across processes
  with no broker at all.
- `RATE_LIMIT_FORCE_MEMORY=1` (`backend/.env.example:170`) drops the Redis-backed rate-limit store.
- `server.ts` never touches Redis at boot; the queue modules build their connections lazily.

> ⚠️ **This was not true when the plan was first written.** `queues/aiCompanySetup.queue.ts` built its
> BullMQ queue at **module scope**, so importing it called `getRedis()`, which throws when
> `REDIS_URL` is unset — and `routes/insights.routes.ts:5` imports it while `app.ts:228` mounts it.
> An unset `REDIS_URL` therefore crashed the whole API at boot with `REDIS_URL missing`, and
> `FORCE_INMEMORY` did not help because that flag was never consulted on this path. Found and fixed
> while building W-2; see **W-9**.

**Constraint this buys us:** the deployment must stay at **exactly one backend instance**. In-memory
queues, in-process cron, and a MemoryStore rate limiter are all per-process. Scaling to 2 instances
silently double-fires cron and splits the queue. Documented as shortcut **S-1** in §9.

**One exception (Phase 3):** `matching-candidate-job` runs its **own** Redis queue + DLQ
(`REDIS_QUEUE_NAME=matching:queue`, `REDIS_DLQ_NAME=matching:dlq`) and needs an Upstash instance of its
own. This is *not* the backend's broker — the Node side reaches the matching service over plain HTTP
(`backend/src/clients/matching-ai-service.client.ts:33`, `MATCHING_AI_BASE_URL`), so `FORCE_INMEMORY=1`
on the backend stays correct and untouched.

---

## 4. Work that must be built before anything can deploy

This is *not* a "push and it runs" situation. Six concrete gaps:

### W-1 — Backend has no Dockerfile  ✅ **BUILT**
Only `backend/Dockerfile.workers` exists (`00-CURRENT-STATE.md` §8). Railway's Nixpacks autodetect is
likely to fail on the native deps: `canvas`, `sharp`, `tesseract.js` (all listed under `allowBuilds`
in `backend/pnpm-workspace.yaml`, and `canvas` needs cairo/pango/pixman headers to compile).

Build a real `backend/Dockerfile`, adapting `Dockerfile.workers` (which already installs the correct
apk packages) with these changes:
- multi-stage: builder runs `pnpm install --frozen-lockfile` → `prisma generate` → `pnpm build`;
  runtime stage copies `dist/` + production `node_modules`
- `pnpm build` uses `tsc` with `noEmitOnError: true`, so **a type error fails the image build** — good
- `outDir` is `dist` with `rootDir: "."`, so the entrypoint is `dist/src/server.js` (matches the
  existing `start` script)
- non-root user; `HEALTHCHECK` against `GET /health` (mounted at `app.ts:149`)
- `.dockerignore` already excludes `.env` correctly (R-14 fix) — verify it still does

### W-2 — No single-process entry for staging  ✅ **BUILT**
Workers are separate processes today (`docker-compose.workers.yml` runs six). On one Railway container
we need the API **and** the outbox pollers in one process.

`src/dev/run-with-poller.ts` is the right shape but **cannot be reused as-is** — line 6 forces
`NODE_ENV=development`, which would re-enable dev stubs (`server.ts:29`). It also starts only the run
poller and lets any poller failure kill the process.

**Built:** `backend/src/staging-entry.ts` + `backend/src/bootstrap/{assertSingleProcessTopology,supervise}.ts`.
- Starts five pollers in-process: `run`, `assessment-outbox`, `assessment-insight`,
  `assessment-invite-sweeper`, `jobApplication-outbox`. `matching-outbox` is **gated on
  `MATCHING_AI_BASE_URL`** — unset, its client falls back to `localhost:8011` and would log a
  connection error every 3 s, burying the real logs.
- Imports the **reusable unit**, never the `*.runner.ts` module: those self-start on import and
  `process.exit(1)` on failure (`jobApplication-outbox.runner.ts:29`), which in a shared process
  kills the HTTP server too.
- **Never writes `NODE_ENV`.** Staging runs as `production`, which is what keeps `assertSafeRunner`,
  `assertDbPoolConfig` and the fail-closed prod seed active.
- **Topology guard** refuses to boot when `REDIS_URL` is set without `FORCE_INMEMORY`: in that
  combination the API enqueues to BullMQ while this entry runs the in-memory pollers, so jobs are
  accepted and **never drained, silently**. The entry cannot start the Bull workers instead —
  `bullWorkerMain()` is private to each worker module (only `pollerMain` is exported), so a
  Redis-backed deployment is the multi-process topology, not this file.
- **Supervision** lives in `bootstrap/supervise.ts` rather than inside the entry, so it can actually
  be tested — importing `staging-entry.ts` starts an HTTP listener. A crashing poller restarts after
  a backoff and never takes the API down.

**Not started, deliberately:** `ai_company_setup.worker` (BullMQ-only, no in-memory equivalent — see
W-9) and `verification.worker` (still the mocked "simulate" path, `00-CURRENT-STATE.md` §9; running a
mock on staging would manufacture fake verification decisions).

### W-9 — Redis was a hidden HARD boot dependency  ✅ **FIXED** (discovered during W-2)
`queues/aiCompanySetup.queue.ts` did `const connection = getRedis()` at **module scope**.
`getRedis()` (`lib/redis.ts:8`) throws `REDIS_URL missing` when the var is unset, and
`routes/insights.routes.ts:5` imports the module while `app.ts:228` mounts the router — so the
entire "no Redis" premise of this plan was false: the API crashed at boot before serving anything.
`FORCE_INMEMORY` was never consulted on this path. (`workers/assessmentQueue.ts` already had the
correct lazy shape; this one module was the outlier.)

**Fixed:** the queue is now built lazily. Because this pipeline genuinely has **no** in-memory
fallback — its only consumer `workers/ai_company_setup.worker.ts` is a BullMQ `Worker` — the enqueue
refuses with a typed **503 `AI_COMPANY_SETUP_UNAVAILABLE`** rather than boot-crashing the API or
pretending the job was accepted. On staging, company AI-insight recompute is therefore *honestly
unavailable*, not silently broken.

### W-3 — No migrate/seed release step  ✅ **BUILT**
Nothing ran `prisma migrate deploy` on deploy (`00-CURRENT-STATE.md` §8).

`prisma/seed.ts` is already **fail-closed**: demo rows (candidates, jobs) only seed when `NODE_ENV`
is `development`/`test`; any other value gets a **core-only** bootstrap. So on staging it seeds
exactly what we need: superadmin, role permissions, badges, and the `SubscriptionPlan` rows. All core
seeds are upsert-only and idempotent, and `superadmin.seed.ts` is privesc-safe (it never promotes an
existing account that already owns `SUPERADMIN_EMAIL`).

**Built:** `backend/src/scripts/release.ts` (run as `dist/src/scripts/release.js`), wired via
`backend/railway.toml` `deploy.preDeployCommand`, plus `pnpm release` / `pnpm release:dev`.

**It is a script, not `migrate && seed`, because the seed is deliberately fail-SOFT in two places
that leave the platform unusable while still exiting 0:**
- `superadmin.seed.ts` **skips** creating the admin — warning only, exit 0 — when `NODE_ENV` is not
  development/test and `SUPERADMIN_PASSWORD` is unset. The deploy goes green with **no admin
  account**, and nobody finds out until someone tries to log in.
- If the `SubscriptionPlan` rows are missing, Wave 5's entitlement engine is fail-closed: every quota
  reads zero, every gated action 403s. The app boots fine and merely *looks* broken.

So the script asserts the **post-conditions** and fails the deploy when they are not met:
`plan_free` exists · at least one superadmin exists · `RolePermission` is non-empty. "The release
command exited 0" now means the platform is actually usable.

Other details: it fails fast when `DIRECT_DATABASE_URL` is unset (migrations must bypass the
transaction pooler — G-1/G-2); it resolves the Prisma CLI from `prisma/package.json`'s `bin` so it
runs as `node <entry>` on any platform; and it runs the **compiled** `dist/prisma/seed.js`, which
keeps `tsx` off the release path entirely (only the `prisma` CLI devDependency is still needed).

### W-4 — Secrets have never been generated for a real environment  ✅ **GENERATED**
Nine values minted (48 random bytes → base64url for tokens; shorter for the two human-typed
passwords): `JWT_SECRET`, `ADMIN_JWT_SECRET`, `FILE_URL_SECRET`, `INTERNAL_API_TOKEN`,
`INTERNAL_SERVICE_KEY`, `BACKEND_INTERNAL_TOKEN`, `RUNNER_STUB_TOKEN`, `SUPERADMIN_PASSWORD`,
`DEMO_USER_PASSWORD`.

**Written to `.env-snapshots/wave-8-lite-staging/staging-secrets.env`** — git-ignored, never printed
to a terminal or chat. The generator refuses to overwrite an existing file, because re-minting
invalidates every issued token and session.

**These are values we mint ourselves, not provider keys.** Supabase / Stripe / Gemini / SMTP / S3
credentials come from those dashboards and are deliberately not in that file.

Four of them must **match on both sides** — a mismatch fails closed (401/403), so a copy-paste slip
shows up as "the AI service refuses us", never as an open door:

| Secret | Backend (Railway) | Peer |
|---|---|---|
| `INTERNAL_API_TOKEN` | ✅ | ai-service · assessment-ai · doc-validator · job-creation-ai |
| `INTERNAL_SERVICE_KEY` | ✅ | matching-candidate-job (as its `SERVICE_API_KEY`) |
| `BACKEND_INTERNAL_TOKEN` | ✅ | doc-validator · matching (they call back into us) |
| `RUNNER_STUB_TOKEN` | ✅ | the runner VM (Phase 3.5 / W-8) |

`DEMO_USER_PASSWORD` is not an app env var — it is passed when running the W-7 fixture.

`ENABLE_DEV_MINT` must stay **unset** — it un-gates the `/dev` mint routes and lets signup proceed when
SMTP fails.

**Also fixed here (real gap, not planned):** the root `.gitignore` ignored only bare `.env`, so a
per-environment file like `.env.staging` or `.env.production` **would have been committed with its
secrets**. Every `.dockerignore` already excluded `.env.*`; git did not. Now `.env.*` is ignored with
`!.env.example` — verified that all nine tracked `.env.example` files stay tracked.

### W-5 — Email has no provider
`sendEmail` failures are the difference between a usable and a useless staging site: signup
verification, invites, and password reset all go through it. Pick **Brevo free** (300/day, works with
any recipient) or Gmail SMTP with an app password. Without this, nobody can complete signup, because
`ENABLE_DEV_MINT` (the local bypass) is forbidden here.

### W-6 — Frontend env is baked at build time
`frontend/src/lib/config/api.ts:18` — `NEXT_PUBLIC_*` is inlined into the client bundle by `next build`.
Setting `NEXT_PUBLIC_API_URL` on Vercel is **not enough**; the project must be **redeployed** after the
change or the browser keeps calling `http://localhost:5000`.

### W-7 — Staging demo fixture (user decision, 2026-08-19)  ✅ **BUILT**
**Built:** `backend/prisma/seeds/staging-demo.seed.ts` + runbook
[`runbooks/staging-demo-accounts.md`](../runbooks/staging-demo-accounts.md) + `pnpm seed:staging-demo`
/ `pnpm seed:staging-demo:clean`. Creates 1 agency org (APPROVED) · 1 agency admin · 1 company
(verified, so it appears on the Discover page) · 1 candidate · 1 ACTIVE job · 1 APPLIED application.
Two gates (`ALLOW_DEMO_SEED=1` **and** a supplied `DEMO_USER_PASSWORD`, min 10 chars, no default),
idempotent upserts on deterministic ids, and `--clean` that removes the fixture via cascades while
leaving the superadmin and all core data intact. **Not** part of `preDeployCommand` — it is a
deliberate one-off, run from the service shell after the first deploy.

The original specification follows.

`prisma/seed.ts` is fail-closed: with `NODE_ENV=production` it seeds **core only** (superadmin, role
permissions, badges, subscription plans) and deliberately withholds the `candidates.seed` / `jobs.seed`
demo rows (G-7). That is the correct default — but it leaves the client staring at empty dashboards.

Build a **separate, explicit** staging fixture — `prisma/seeds/staging-demo.seed.ts`, run by its own
script, **never** wired into the default `db seed` chain:

- **Exactly one of each:** 1 candidate · 1 company · 1 agency · 1 job · 1 application. (Superadmin
  already comes from the core seed.)
- **Every row is visibly labelled as demo.** Display names carry a `[DEMO]` prefix (e.g.
  `[DEMO] Northwind Recruiting`), emails use a single obvious namespace
  (`demo.candidate@hiralent.com`, `demo.company@hiralent.com`, `demo.agency@hiralent.com`), and the
  job title says demo too. Nobody should ever have to guess whether a row is real.
- **Idempotent upserts on deterministic ids**, following the `PLANS` pattern already in `seed.ts` —
  re-running must not create a second copy.
- **Guarded**: refuse to run unless an explicit `ALLOW_DEMO_SEED=1` is set, so it can never fire
  against production.
- Ship a short credentials note (in `runbooks/`, not in git-committed plaintext secrets) listing the
  four logins and which journey each one demonstrates.

Reason for one-of-each rather than a fuller dataset: the client needs to *see* a populated product, not
a fake business. Every extra row is another thing that has to stay consistent with real behaviour.

### W-8 — Code-execution runner (user decision 2026-08-19: deploy it)

**Correction to the original framing:** the runner **cannot** go on Hugging Face Spaces.
`runner-python/docker_runner.py:97` gates on `shutil.which("docker")` + `docker info`, and
`run_submission` shells out to a real `docker run`. HF Spaces (like Railway) hands you a *container*,
not a Docker **daemon** — so `docker_available()` returns false and every request fail-closes with
**503** (`http_service.py:64`). That behaviour is correct by design (R-03, no host fallback), but it
means a Space would leave the Run button just as dead, with a different error.

**What it actually needs: a VM we control, with a Docker daemon.**

Free options, best first:
- **Oracle Cloud Always Free** — Ampere ARM (up to 4 vCPU / 24 GB) or 2× AMD micro VMs, free *forever*,
  200 GB block storage. Needs card verification at signup, and ARM capacity can be scarce in some
  regions. **Recommended.**
- Google Cloud free `e2-micro` — 1 GB RAM. Enough for `python:3.11-slim` / `node:18-slim`; C++/Java/Go
  images will be painful.
- The user's own machine + a Cloudflare Tunnel — free, but staging dies when the machine sleeps.

**Setup:**
- [ ] Provision the VM; install Docker; pre-pull only the language images we actually demo
      (start with `python:3.11-slim` + `node:18-slim` — `gcc:12`, `openjdk:17-slim` and
      `dotnet/sdk:7.0` are multi-GB each)
- [ ] Run `runner-python/http_service.py` (uvicorn) with `RUNNER_STUB_TOKEN` set
- [ ] Put HTTPS in front (Caddy auto-TLS, or a Cloudflare Tunnel) — the backend calls it over the
      public internet
- [ ] Backend: `RUNNER_HTTP_URL` + matching `RUNNER_STUB_TOKEN`
      (`assertSafeRunner()` at `runner.security.ts:122` **refuses to boot** if the URL is set without
      the token — a useful safety net, not an obstacle)

**Isolation re-check on a host we do not fully control** — the user explicitly asked for this:
- [ ] Confirm the hardening flags are actually applied on the VM. `docker_runner.py:123` builds the
      same flag set as the backend's `buildDockerBaseArgs` (`--network none`, `--user 1000:1000`,
      `--read-only`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--pids-limit`, memory/cpu/
      ulimit caps). Verify on the box, don't assume — `verify-sandbox-isolation.mjs` asserts parity.
- [ ] Prove fail-closed on the real host: stop Docker (or `RUNNER_DISABLE_DOCKER=1`) → the endpoint
      must return **503**, never execute anything.
- [ ] Prove the token gate: an unauthenticated `POST /run` must be **401**; with no token configured
      at all it must be **503**, not open.
- [ ] Escape smoke tests from inside a submission: network egress blocked, root filesystem read-only,
      fork-bomb stopped by `--pids-limit`, memory cap enforced.
- [ ] Optional hardening: install gVisor and set `RUNNER_USE_RUNSC=1` for a second isolation layer.

> 🔴 **The one rule that matters:** this VM has the Docker socket, so anyone who compromises
> `http_service.py` is effectively root on that box. **The runner VM must hold nothing else** — no
> database credentials, no Gemini key, no Supabase keys, no other service. It is a disposable blast
> box. Never co-locate it with the backend, and never give it network reach into Supabase.

---

## 5. Phases

### Phase 0 — Provision (no code)
- [ ] Supabase: note the project ref; collect the **transaction pooler** (6543) and **session pooler**
      (5432) connection strings
- [ ] Supabase Storage: create bucket `hiralent-uploads` (private); create an **S3 access key** pair
- [ ] Railway: create project, empty service pointed at the repo (`backend/` as root)
- [x] Generate every secret from **W-4** → `.env-snapshots/wave-8-lite-staging/staging-secrets.env`
- [ ] Paste them into Railway's variable store (and the peer services, per the W-4 match table)
- [ ] Brevo (or Gmail app password) SMTP credentials
- [ ] Gemini API key
- [ ] Stripe test-mode `sk_test_…` (webhook secret comes in Phase 1 once the URL exists)
- [ ] Hugging Face account (Phase 2/3 Spaces)
- [ ] Qdrant Cloud free cluster + API key (Phase 3, matching)
- [ ] Upstash Redis free database (Phase 3, matching only)

### Phase 1 — Core stack live  ← *this is the phase that produces a shareable link*

> 📖 **Step-by-step:** [`runbooks/staging-deploy-supabase-railway.md`](../runbooks/staging-deploy-supabase-railway.md)
> — the click-by-click version of everything below (Supabase, Railway, Vercel, SMTP, Stripe,
> verification, troubleshooting table).

- [x] **W-1** backend `Dockerfile` + verify `.dockerignore` — ⚠️ image never built (Docker daemon down
      on this host); first real proof is the Railway build
- [x] **W-9** lazy `aiCompanySetup` queue — the API now boots with no Redis (proved)
- [x] **W-2** production-safe single-process entry — booted in `NODE_ENV=production`,
      `FORCE_INMEMORY=1`, `REDIS_URL` unset: 5 pollers up, matching correctly skipped, `/health` 200
- [x] **W-3** release step (`migrate deploy` → seed → **verify**) — proved on a throwaway fresh
      database: 12/12 checks, including a fail-proof that a missing `SUPERADMIN_PASSWORD` **fails
      the deploy** instead of shipping an adminless platform
- [ ] **After the first deploy:** confirm `[release] ✅ release complete` appears in the Railway logs
      (see G-21 — a silently-ignored pre-deploy key boots the app against an unmigrated database)
- [ ] Fill the full backend staging env set (§6) in Railway
- [ ] Deploy; confirm `GET /health` returns `db:up`
- [ ] Verify boot log shows: Postgres connected · interview scheduler · subscription expiry ·
      payment reconciliation · `FORCE_INMEMORY enabled`
- [ ] Log in as superadmin; confirm the seeded `SubscriptionPlan` rows are present
- [ ] Point Vercel's `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_FRONTEND_URL` at
      the Railway URL, and **redeploy** (**W-6**)
- [ ] Set `CORS_ALLOWED_ORIGINS` to the Vercel domain; confirm no CORS failures in the browser console
- [ ] Confirm Socket.IO connects over **WSS** (chat + read receipts)
- [ ] Register the Stripe test webhook at `https://<railway>/…/webhook`; paste `whsec_…` back into
      Railway; fire a test event and confirm the `ProcessedWebhookEvent` ledger row appears
- [ ] Upload a file end-to-end; confirm the object lands in the Supabase bucket and the signed URL
      resolves
- [x] **W-7** staging demo fixture written + guarded (28/28 lifecycle checks on a throwaway DB)
- [ ] **W-7 (deploy-time)** run the fixture once from the Railway service shell — see
      [`runbooks/staging-demo-accounts.md`](../runbooks/staging-demo-accounts.md)

**End of Phase 1 = the client gets a working link.** AI-dependent features are honestly unavailable.

### Phase 2 — The two AI services that carry the demo
- [ ] `ai-service` (:8000) → HF Space; set `INTERNAL_API_TOKEN` to match the backend
- [ ] `job-creation-ai` (:8003) → HF Space
- [ ] Set `AI_SERVICE_URL` and `TALENT_AI_BASE_URL` in Railway to the Space URLs
- [ ] Verify: question generation, and JD generation inside the job-creation wizard

### Phase 3 — Remaining AI services — **REQUIRED** (user decision, 2026-08-19)
- [ ] `assessment-ai-service` (:8001) → HF Space → `AI_SERVICE_BASE_URL`; verify JD parse + chatbot
- [ ] `document-validator-service` (:8002) → HF Space → `DOC_VALIDATOR_URL`
      - heaviest image in the stack: `easyocr` + `torch` + `torchvision` + `opencv` + `spacy`
        (multi-GB build, slow first push) — this is why HF Spaces, not Render free (512 MB), is the host
      - it needs `MINIO_*` repointed at **Supabase Storage** (same S3 credentials as the backend)
      - the deep-validation **webhook** must call the Railway URL with `BACKEND_INTERNAL_TOKEN`.
        `00-CURRENT-STATE.md` §6 records this defaulting to port 4000 vs the backend's 5000 and
        **silently losing results** — re-verify on the real URL, do not assume it was fixed
- [ ] Qdrant Cloud free cluster + Upstash Redis provisioned
- [ ] `matching-candidate-job` (:8011) → HF Space → `MATCHING_AI_BASE_URL`
      - **two processes**: the FastAPI app (`run.py`) *and* the queue worker (`run_worker.py`). One HF
        Space = one container, so both must start from a single entrypoint
      - auth: its `SERVICE_API_KEY` must equal the backend's `INTERNAL_SERVICE_KEY` (sent as
        `X-Service-Key`); writeback uses `BACKEND_INTERNAL_TOKEN`
      - `EMBEDDING_PROVIDER=gemini` keeps `sentence-transformers` off the hot path (no local model
        download); leave it on gemini
      - verify: the backend's `matching-outbox` runner drains and `JobRecommendation` rows appear, then
        candidate ranking renders in the company UI
- [ ] `scraping-candidates` (:8010) — **skip**, not needed for staging

### Phase 3.5 — Code-execution runner (**W-8**)
- [ ] Oracle Cloud Always Free VM provisioned, Docker installed, language images pre-pulled
- [ ] `http_service.py` running behind HTTPS with `RUNNER_STUB_TOKEN`
- [ ] Backend `RUNNER_HTTP_URL` + `RUNNER_STUB_TOKEN` set; backend boots (proves `assertSafeRunner`)
- [ ] **All five isolation re-checks in W-8 executed on the real VM and recorded**
- [ ] End-to-end: a candidate submits code from the staging UI and gets real per-test results

### Phase 4 — Staging validation
- [ ] Run the four canonical journeys on staging (candidate · company · agency · admin)
- [ ] Re-run the Wave 4/5 e2e verifiers against the staging URL where they support it
- [ ] Close out the two known Wave 5 S4 frontend gaps against a real browser:
      the three `UpgradePrompt` surfaces, and the free-tier usage-meter early-return
- [ ] Write the PROGRESS-LOG entry + a client-facing "staging is live" update

---

## 6. Staging environment variables

### Backend (Railway)

```
# --- Core ---
NODE_ENV=production
PORT=5000                        # Railway injects PORT; server.ts already reads it
APP_URL=https://<railway-app>
BACKEND_URL=https://<railway-app>
CLIENT_URL=https://<vercel-app>
FRONTEND_URL=https://<vercel-app>
# ENABLE_DEV_MINT   -> MUST STAY UNSET

# --- Database (Supabase) ---
# Runtime = TRANSACTION pooler (6543). connection_limit is MANDATORY (see gotcha G-1).
DATABASE_URL="postgresql://postgres.<ref>:<pw>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"
# Migrations = SESSION pooler (5432). NOT db.<ref>.supabase.co (see gotcha G-2).
DIRECT_DATABASE_URL="postgresql://postgres.<ref>:<pw>@<region>.pooler.supabase.com:5432/postgres"
# SHADOW_DATABASE_URL -> LEAVE UNSET (R-07)

# --- No Redis ---
FORCE_INMEMORY=1
RATE_LIMIT_FORCE_MEMORY=1
# REDIS_URL -> leave unset

# --- Secrets (generated in W-4) ---
JWT_SECRET=…
ADMIN_JWT_SECRET=…
FILE_URL_SECRET=…
INTERNAL_API_TOKEN=…
BACKEND_INTERNAL_TOKEN=…
INTERNAL_SERVICE_KEY=…
SUPERADMIN_EMAIL=admin@hiralent.com
SUPERADMIN_PASSWORD=…

# --- Storage (Supabase S3) ---
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3
S3_REGION=<supabase-project-region>
S3_BUCKET=hiralent-uploads
S3_ACCESS_KEY=…
S3_SECRET_KEY=…
S3_FORCE_PATH_STYLE=true

# --- Edge ---
CORS_ALLOWED_ORIGINS=https://<vercel-app>
TRUST_PROXY=1

# --- Email ---
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=…
SMTP_PASS=…
SMTP_FROM=no-reply@hiralent.com

# --- AI ---
AI_MODEL_PROVIDER=gemini
GEMINI_API_KEY=…
AI_FAKE=0
# Phase 2 — set once each Space is live
AI_SERVICE_URL=https://<hf-space-ai-service>
TALENT_AI_BASE_URL=https://<hf-space-job-creation-ai>
# Phase 3
AI_SERVICE_BASE_URL=https://<hf-space-assessment-ai>
DOC_VALIDATOR_URL=https://<hf-space-doc-validator>
MATCHING_AI_BASE_URL=https://<hf-space-matching>
# Leave each one UNSET until its Space is actually live — an unset URL fails fast with a clear
# error, a wrong URL hangs the request path (there are no circuit breakers yet; Wave 6).

# --- Payments (Stripe test mode) ---
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…

# --- Schedulers ---
SUBSCRIPTION_EXPIRY_ENABLED=true
PAYMENT_RECONCILIATION_ENABLED=true
RETENTION_ENABLED=false
SCRAPING_SCHEDULER_ENABLED=false

# --- Runner (Phase 3.5, W-8) ---
# Leave BOTH unset until the runner VM exists. Setting the URL without the token makes the
# backend refuse to boot (runner.security.ts:122) — that is intentional.
RUNNER_HTTP_URL=https://<runner-vm-host>
RUNNER_STUB_TOKEN=…            # must equal RUNNER_STUB_TOKEN on the runner VM
# RUNNER_ALLOW_HOST_EXEC -> NEVER set. Hard-refused in production (R-03).
DISABLE_AV=1
```

### Python AI services (HF Spaces) — the values that MUST match the backend

| Service | Auth var on the Space | Must equal (backend) |
|---|---|---|
| `ai-service`, `assessment-ai-service`, `document-validator-service`, `job-creation-ai` | `INTERNAL_API_TOKEN` | `INTERNAL_API_TOKEN` (sent as `X-API-Token`) |
| `matching-candidate-job` | `SERVICE_API_KEY` (alias `INTERNAL_SERVICE_KEY`) | `INTERNAL_SERVICE_KEY` (sent as `X-Service-Key`) |
| `document-validator-service`, `matching-candidate-job` | `BACKEND_INTERNAL_TOKEN` + `BACKEND_BASE_URL` | `BACKEND_INTERNAL_TOKEN` + the Railway URL (webhook/writeback direction) |

Every Space also needs `GEMINI_API_KEY`. `document-validator-service` additionally needs its `MINIO_*`
block repointed at Supabase Storage; `matching-candidate-job` needs `QDRANT_URL` + `QDRANT_API_KEY` and
`REDIS_URL` (Upstash).

### Frontend (Vercel) — **redeploy after changing**

```
NEXT_PUBLIC_API_URL=https://<railway-app>
NEXT_PUBLIC_SOCKET_URL=https://<railway-app>
NEXT_PUBLIC_FRONTEND_URL=https://<vercel-app>
# Do NOT also set NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_API_BASE_URL (legacy fallbacks)
```

> Any var added here must also be reflected in `matrices/env-var-matrix.md`, and mind the backtick-span
> parsing rule (see the env-matrix gotcha note in the master plan).

---

## 7. Gotcha registry

| # | Gotcha | Consequence if missed |
|---|---|---|
| **G-1** | `config/requireEnv.ts:96` — in production a `DATABASE_URL` **without** `connection_limit=` is fatal. Supabase's copy-paste string doesn't include it. | Backend **refuses to boot**, with a message that looks unrelated to Supabase. |
| **G-2** | Supabase's direct host `db.<ref>.supabase.co:5432` is **IPv6-only**. Railway egress is IPv4. | `prisma migrate deploy` fails at the release step. Use the **session pooler** host for `DIRECT_DATABASE_URL`. |
| **G-3** | Supabase free **pauses the project after 7 days of inactivity**. | Staging appears dead; needs a manual resume from the dashboard. Tell the client before they demo it cold. |
| **G-4** | `NEXT_PUBLIC_*` is inlined at **build** time (`lib/config/api.ts:18`). | Changing the Vercel env without redeploying leaves the browser calling `localhost:5000` — fails silently in production only. |
| **G-5** | `plan_free` must exist (Wave 5 S4 fail-closed entitlements). | Every quota reads zero; every gated action 403s. Staging looks broken end-to-end. |
| **G-6** | `src/dev/run-with-poller.ts:6` forces `NODE_ENV=development`. | Reusing it as the entrypoint re-enables dev stubs on a public URL. Write a separate entry (**W-2**). |
| **G-7** | `NODE_ENV=production` is what activates the security assertions (`assertSafeRunner`, `assertDbPoolConfig`, prod seed gating) — but `prisma/seed.ts` also uses it to *withhold* demo data. | Correct behaviour: staging is `production` and gets **no demo rows**. Any sample data must be seeded deliberately. |
| **G-8** | `binaryTargets = ["native", "windows"]` in `schema.prisma`. | Safe **only because** `prisma generate` runs inside the image, where `native` resolves to the Linux target. Never copy a Windows-generated client into the image. |
| **G-9** | Railway injects its own `PORT`. | `server.ts:109` already reads `process.env.PORT` — do not hardcode 5000 in the Dockerfile `CMD`. |
| **G-10** | Vercel Hobby is licensed for non-commercial use. | Fine for staging; a commercial production launch needs a paid plan. Flagged, not a blocker. |
| **G-11** | HF Spaces expect the app on **port 7860**, set via `app_port` in the Space README metadata. Our Dockerfiles hardcode 8000/8001/8002/8003/8011. | Space builds green but never becomes reachable. Set `app_port` per Space (or make the port env-driven). |
| **G-12** | HF Spaces are **public by default**. A public Space holding `GEMINI_API_KEY` is an open door to your quota. | Mitigated because every service is behind `X-API-Token` / `X-Service-Key` (Wave 1 Phase 1.7 seam) — **verify each Space actually rejects an unauthenticated call before trusting it**, and prefer a private Space where the account allows. |
| **G-13** | One HF Space = one container, but `matching-candidate-job` needs **two** processes (`run.py` + `run_worker.py`). | Queue fills and nothing drains — matching silently produces no `JobRecommendation` rows. Needs a combined entrypoint. |
| **G-14** | `matching-candidate-job/.env.example` says `PORT=8004`, `00-CURRENT-STATE.md` and `clients/matching-ai-service.client.ts:33` say **8011**. | Pre-existing doc drift. Both sides are env-driven, so pick one value and set it explicitly on both — do not rely on either default. |
| **G-15** | `document-validator-service` pulls `torch` + `torchvision` + `easyocr` + `opencv` + `spacy`. | Multi-GB image, long first build. Fine on HF Spaces (2 vCPU / 16 GB); would never fit Render free. Budget time for this one build. |
| **G-16** | AI clients have **timeouts only — no retries, no circuit breakers**, and are called inline in the request path (`00-CURRENT-STATE.md` §5, Wave 6 is unstarted). A sleeping HF Space wakes slowly. | First request after idle can tie up a Node handler for 20–30 s. Expect it during demos; do not mistake it for a bug. |
| **G-17** | The runner needs a Docker **daemon**, not a container. Neither HF Spaces nor Railway provides one (`docker_runner.py:97`). | Deploying it there returns **503 on every run** — fail-closed and correct, but the feature stays dead. It needs a VM (**W-8**). |
| **G-18** | The runner VM holds the Docker socket — compromising `http_service.py` is root-equivalent on that box. | Keep it a **disposable blast box**: no DB creds, no API keys, no other service, no network path to Supabase. |
| **G-21** | `railway.toml`'s `preDeployCommand` key was written from the plan, **not verified against Railway's live schema**. Platforms typically ignore unknown config keys silently. | The release step never runs and the app boots against an **unmigrated** database — surfacing as a thousand unrelated errors, not as a migration error. Verify the key (or set the same command in Service → Settings → Deploy → Pre-Deploy Command) and confirm `[release] ✅ release complete` in the first deploy's logs. |
| **G-20** | A module that builds a Redis/queue connection at **module scope** turns Redis into a hard boot dependency for the whole API, because `app.ts` transitively imports it. `FORCE_INMEMORY` does not protect these paths. | Boot crash with a message (`REDIS_URL missing`) that names neither the route nor the deployment choice that caused it. Any new queue module must follow the lazy `let queue: Queue \| null = null` shape used by `workers/assessmentQueue.ts` — never `const connection = getRedis()`. |
| **G-19** | Runner language images are large (`gcc:12` ≈ 1.3 GB, `dotnet/sdk:7.0`, `openjdk:17-slim`, `golang:1.20`). | Pre-pull only the languages actually demoed; a 1 GB micro VM cannot hold the full set. |

---

## 8. Exit criteria

- ✅ A public HTTPS staging URL where all four roles can sign up (real verification email), log in, and
  complete their canonical journeys.
- ✅ `GET /health` reports `db:up`; boot log shows every scheduler and the in-memory queue mode.
- ✅ Stripe **test-mode** checkout completes, the signed webhook verifies, and the entitlement/receipt
  rows appear.
- ✅ File upload round-trips through Supabase Storage with a working signed URL.
- ✅ Socket.IO chat works over WSS from the Vercel origin.
- ✅ All five AI services reachable and authenticated: question generation, JD generation, JD parse +
  chatbot, document validation (webhook result lands, not silently lost), and candidate matching
  (`JobRecommendation` rows produced, ranking renders).
- ✅ Every AI Space **rejects an unauthenticated request** (G-12).
- ✅ The demo fixture exists, every row is visibly `[DEMO]`-labelled, and re-running the seed creates
  no duplicates.
- ✅ A candidate can run code from the staging UI and get real per-test results, **and** all five W-8
  isolation re-checks pass on the runner VM (401 unauthenticated · 503 with Docker down · no network
  egress · read-only rootfs · pids/memory caps enforced).
- ✅ No secret is present in the image or in git; `.env` stays excluded.
- ✅ PROGRESS-LOG entry + client-facing update written.

---

## 9. Shortcuts taken — the honest list

These are **deliberate** and each one is a real gap versus Wave 8. None may be quietly forgotten.

| # | Shortcut | Real fix (Wave 8) |
|---|---|---|
| **S-1** | **Single instance only.** In-memory queues, in-process cron, MemoryStore rate limiter. Scaling to 2 instances double-fires cron and splits the queue. | Redis + BullMQ, Socket.IO Redis adapter, leader election. |
| **S-2** | No CI/CD, no image scan, no secret scan, no rollback. Deploys are a git push. | Phase 8.4. |
| **S-3** | **Code execution runs on a separate free VM we self-manage** (W-8) — not on the app platform, because neither Railway nor HF Spaces exposes a Docker daemon (G-17). It is an unmanaged box: no patching pipeline, no monitoring, and it is the single most attack-exposed surface in the stack. | Managed container-capable execution (or a hardened runner pool) with patching + monitoring in Wave 8. |
| **S-4** | **Supabase Supavisor instead of PgBouncer**, and no read replicas or backups. | Phase 8.7 managed Postgres + backup/restore drill. |
| **S-5** | Five of six Python AI services deployed (all but `scraping-candidates`), but they **sleep after 48 h idle** and have no retries or circuit breakers in front of them (G-16). A cold demo will feel slow. | Always-on hosting + Wave 6 resilience (retry, breaker, move AI off the request path). |
| **S-6** | No observability — no `/metrics`, no Sentry, no correlation IDs (Wave 7 is unstarted). Debugging staging means reading Railway logs. | Wave 7. |
| **S-7** | Railway's generated domain, not a Hiralent domain; TLS is the platform's. | Phase 8.5. |
| **S-8** | Wave 5 is **paused mid-wave**: agency billing (S5) is not built, so agency users pass company quota gates. Wave 5 S6 (E2E gate) never ran. | Resume Wave 5. |
| **S-9** | Two Wave 5 S4 frontend gaps ship as-is: the three `UpgradePrompt` surfaces were never browser-verified, and a free-tier company cannot see its own usage meter (billing page early-returns). | Phase 4 checklist above. |

---

## 10. Decisions taken & questions still open

**Answered 2026-08-19:**
1. ~~Phase 3 depth~~ → **all five AI services required** (incl. document validation + matching, which
   pull in Qdrant Cloud and Upstash Redis). Only `scraping-candidates` is out. Phase 3 is now marked
   REQUIRED in §5.
2. ~~Demo data~~ → **yes, one of each** (1 candidate · 1 company · 1 agency · 1 job · 1 application),
   every row explicitly labelled as a demo account. Specified as **W-7**.

3. ~~Code execution~~ → **(b), deploy the runner.** Corrected during planning: it cannot live on an HF
   Space (G-17), so it gets its own Docker-capable VM. Specified as **W-8**, scheduled as Phase 3.5.

**Still open:**
4. **Runner VM host.** Recommendation is **Oracle Cloud Always Free** (free forever, 4 vCPU / 24 GB
   ARM). It needs a **card verification at signup** and ARM capacity is sometimes unavailable in a
   given region — both are the user's call, and neither is something this plan can decide. Fallbacks:
   GCP `e2-micro` (1 GB — python/node only), or the user's own machine behind a Cloudflare Tunnel
   (staging dies when the machine sleeps).
   Not blocking Phases 1–3; needed before Phase 4 sign-off.

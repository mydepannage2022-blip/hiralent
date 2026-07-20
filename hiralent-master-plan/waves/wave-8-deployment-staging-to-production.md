# Wave 8 — Deployment: Staging → Production

> **Goal:** package the whole stack, stand it up on a staging domain, prove it, then promote to production — with CI/CD, TLS, migrations, secrets, and monitoring. The final wave. **Runs after Wave 7.**
>
> **Pillar advanced:** P5 (DevOps & Deployment).
> **Risks closed:** R-12, R-13 (finish), R-14 (finish), R-21 (finish).
> **Entry state:** no backend/frontend Dockerfile, no full-stack orchestration, no CI/CD, no proxy/TLS, secrets bakeable.

---

## Phase 8.1 — Containerize everything
- [ ] Real **backend API Dockerfile** (multi-stage, non-root, healthcheck, pinned base, `.dockerignore` excludes `.env`). (R-12)
- [ ] Real **frontend Dockerfile** (or confirm Vercel path; if self-host, `output: standalone`). (R-12)
- [ ] Dockerfiles for the two gRPC services (sandbox, plagiarism) or explicit de-scope. Fix the `.dockerignore` gaps that bake secrets (backend, ai-service, doc-validator). (R-14)
- [ ] Pin base image digests; scan images for CVEs.

## Phase 8.2 — One orchestration
- [ ] A single **compose (dev)** and a **deploy manifest (staging/prod)** bringing up the full stack — Postgres, one canonical Redis, MinIO, Qdrant, backend, workers, frontend, Python services — one network, healthchecks, correct `depends_on`. (R-12)
- [ ] Eliminate Redis port fragmentation (one canonical Redis with DB indices). 
- [ ] All service discovery via env; confirm no `host.docker.internal`/hardcoded localhost survives (from Wave 3). (R-13)

## Phase 8.3 — Config, secrets, migrations
- [ ] Complete `.env.example` for **every** service; a staging and a prod env set; no insecure defaults. (R-21)
- [ ] Secrets via a **secret manager / platform secrets** (never in images/git); guarded init (firebase etc.). (R-14)
- [ ] Automated **`prisma migrate deploy`** + seed (superadmin/roles/plans) in the deploy flow. (R-21)

## Phase 8.4 — CI/CD pipeline
- [ ] Pipeline: type-check → lint → unit+integration tests → build & scan images → push to registry → migrate → deploy. Staging and prod environments with **rollback**.
- [ ] Secret scanning + image scanning as gates.

## Phase 8.5 — Edge & networking
- [ ] Reverse proxy / ingress (nginx/Traefik/managed) with **TLS** and domain routing to the services.
- [ ] CORS allowlist driven by env (staging + prod origins).
- [ ] WebSocket support through the proxy (Socket.IO).

## Phase 8.6 — Staging deploy & validation
- [ ] Deploy the full stack to the **staging domain**; run DB migrate + seed.
- [ ] Smoke-test every canonical journey (candidate/company/agency/admin) on staging; run the load test against staging.
- [ ] Fix everything staging surfaces; re-run.

## Phase 8.7 — Production launch
- [ ] Provision prod infra (managed Postgres + PgBouncer, Redis, object storage, registry, monitoring).
- [ ] Backups + restore drill for Postgres; retention for object storage.
- [ ] **Go-live checklist:** all pillars' exit criteria met; secrets rotated & external; monitoring/alerting live; rollback tested.
- [ ] Promote staging → production; DNS/TLS cutover; post-deploy smoke test.
- [ ] Post-launch watch: dashboards, error rates, capacity headroom.

---

## Exit criteria
- ✅ `docker compose up` (dev) / the staging manifest brings the **entire** stack up healthy from scratch, migrated + seeded, on a non-Docker-Desktop host.
- ✅ CI/CD builds, tests, scans, migrates, and deploys with rollback; image + secret scans clean; no `.env` in any image.
- ✅ Staging is reachable over TLS on a real domain and passes the full canonical-journey smoke test + load test.
- ✅ Production is live, monitored, backed up, with a tested rollback.
- ✅ Every pillar's definition of done is satisfied and signed off.
- ✅ PROGRESS-LOG + a client-facing launch summary written.

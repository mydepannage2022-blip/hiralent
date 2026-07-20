# Pillar P5 — DevOps & Deployment

> **Principle:** the whole stack must stand up reproducibly with one command locally, deploy to staging, and promote to production — no "works on my Docker Desktop" wiring.

## Definition of done

1. **Every service containerized:** backend API and frontend get real (multi-stage, non-root, healthchecked, pinned-base) Dockerfiles; the two gRPC services (sandbox, plagiarism) get Dockerfiles or are explicitly out-of-scope; all images exclude `.env` and secrets.
2. **One orchestration:** a single compose (dev) and a deploy manifest (staging/prod) bring up the **full** stack — Postgres, one canonical Redis, MinIO, Qdrant, backend, workers, frontend, and the Python services — on one network with correct dependencies and healthchecks. No Redis port fragmentation.
3. **Service discovery via config:** all inter-service URLs and email/redirect base URLs come from env (no `host.docker.internal`, no hardcoded `localhost`/`127.0.0.1` in source). Works identically on a Linux/staging host.
4. **Config management:** a complete `.env.example` for every service (backend ~132 vars documented); a staging and a prod env set; no insecure defaults.
5. **Secrets in prod:** injected via a secret manager / platform secrets — never in images or git. `firebase.ts` and similar don't crash boot when optional config is absent (guarded init).
6. **Migrations & seeds on deploy:** an explicit, automated `prisma migrate deploy` step; a seed for superadmin/roles/plans; `SHADOW_DATABASE_URL` separated (never = primary).
7. **CI/CD:** pipeline that type-checks, lints, tests, builds & scans every image, pushes to a registry, runs migrations, and deploys to staging → prod with rollback.
8. **Edge:** reverse proxy / ingress with TLS termination and domain routing; CORS allowlist driven by env (staging + prod origins).
9. **Environments:** clean **local → staging → production** promotion path; staging mirrors prod.

## Current gaps (risks this pillar owns)
R-12, R-13, R-14, R-21 (deploy half), plus: no full-stack compose, no CI/CD, no proxy/TLS, corrupt `.env`, CORS hardcoded, secrets baked into images.

## How we verify
- `docker compose up` (or the staging manifest) brings the entire stack healthy from scratch, migrations applied, seed present, on a non-Docker-Desktop host.
- A staging deploy is reachable over TLS on a real domain and passes a smoke test of the canonical journeys.
- Image scans pass; no `.env` in any image; secret scan clean.

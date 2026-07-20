# Pillar P1 — Security

> **Principle:** no compromise. The platform handles auth, PII (CVs, passports), payments, and runs untrusted candidate code. Security is a release gate, not a feature.

## Definition of done (the bar we hold)

1. **Secrets:** zero secrets in git or baked into images. All secrets from env/secret-manager. Every currently-committed key rotated and treated as compromised.
2. **AuthN:** strong random `JWT_SECRET`/`ADMIN_JWT_SECRET`; short-lived access tokens + refresh rotation; working blacklist/revocation; sessions enforced (no `'bypass'` default).
3. **AuthZ:** default-deny. Every route explicitly guarded (`checkAuth` + role/permission/ownership). A public allowlist is the *only* way an endpoint is unauthenticated, and each is a reviewed decision.
4. **Untrusted code execution:** always isolated — mandatory hardened `docker run` (`--network none`, `--read-only`, `--user`, `--cap-drop ALL`, `--pids-limit`, `--memory`, `--cpus`, `--security-opt no-new-privileges`, optional gVisor). No host/HTTP-stub fallback path in prod.
5. **Input handling:** Zod (or equivalent) validation on every request body/params/query; parameterized DB access only; rich text sanitized; file uploads type/size/owner-checked; PII served via signed URLs, never static.
6. **Transport & headers:** TLS everywhere; real `helmet` (Express) with HSTS/CSP/X-Content-Type-Options/frame options; strict CORS allowlist from config.
7. **Rate limiting:** global + per-sensitive-route (auth, OCR, submissions, AI), backed by Redis so it holds across instances.
8. **LLM safety:** treat all model output as untrusted; never let it drive privileged actions or bypass deterministic checks; guard prompt-injection on scraped/OCR/user content.
9. **No prod-reachable dev/mock/simulate endpoints** or dummy-auth middleware.
10. **Logging:** no secrets/tokens/PII in logs.

## Current gaps (risks this pillar owns)
R-01, R-02, R-03, R-08, R-09, R-10, R-11, R-14, R-23, R-28, R-29, R-34 (+ supports R-13).

## How we verify
- Manual + scripted check: every route file audited for a guard; a test that hits sensitive endpoints without a token expects 401/403.
- Secret scan (gitleaks/trufflehog) in CI; image scan for baked `.env`.
- Reproduce each critical (forged token rejected, IDOR blocked, code-exec contained, CV needs signed URL) and confirm it fails.
- `npm audit` / dependency CVE scan clean of highs.
- A short **threat-model note** per role signed off before production (Wave 8 gate).

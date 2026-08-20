# Runbook — Staging demo accounts

> The staging fixture: **one of each** entity so the client sees a populated product instead of
> empty dashboards. Wave 8-lite / W-7.
> Source: `backend/prisma/seeds/staging-demo.seed.ts`

---

## What it creates

| Entity | Value |
|---|---|
| Agency org | `[DEMO] Global Relocation Partners` — status **APPROVED** |
| Agency admin | `demo.agency@hiralent.com` — role `agency_admin` |
| Company | `[DEMO] Northwind Technologies` — **verified** (so it appears on the public Discover page) |
| Company admin | `demo.company@hiralent.com` — role `company_admin` |
| Candidate | `demo.candidate@hiralent.com` — role `candidate` |
| Job | `[DEMO] Senior Frontend Engineer` — **ACTIVE**, posted by the demo company |
| Application | demo candidate → demo job, status **APPLIED** |

All three accounts share the one password you pass as `DEMO_USER_PASSWORD`. All have
`is_email_verified: true`, so they log in without an email round-trip.

**The superadmin is NOT part of this fixture** — it comes from the core seed
(`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`, applied by the release step).

---

## Walkthrough — what each account demonstrates

| Log in as | Shows |
|---|---|
| `demo.company@hiralent.com` | Employer side: the job posting, the applicants pipeline (one real application waiting), billing + usage meters |
| `demo.candidate@hiralent.com` | Candidate side: profile, the submitted application and its status |
| `demo.agency@hiralent.com` | Agency side: an APPROVED agency's dashboard and settings |
| the superadmin | Admin side: admins, platform settings, security log, billing/reconciliation |

---

## Running it

Two independent gates, both required — this fixture writes fake companies and applications, so it
must never fire as a side effect of a deploy:

1. `ALLOW_DEMO_SEED=1`
2. `DEMO_USER_PASSWORD` — **no default exists**, minimum 10 characters. A leaked or copied
   `ALLOW_DEMO_SEED` alone therefore cannot create accounts with known credentials. (Same
   fail-closed reasoning as `prisma/seeds/superadmin.seed.ts`.)

**Seed** — run from the backend service root, after the release step has migrated and core-seeded:

```bash
ALLOW_DEMO_SEED=1 DEMO_USER_PASSWORD='<choose-a-strong-one>' node dist/prisma/seeds/staging-demo.seed.js
```

**Remove** (no password needed):

```bash
ALLOW_DEMO_SEED=1 node dist/prisma/seeds/staging-demo.seed.js --clean
```

Local development, from source:

```bash
ALLOW_DEMO_SEED=1 DEMO_USER_PASSWORD='<choose-a-strong-one>' npx tsx prisma/seeds/staging-demo.seed.ts
```

On Railway, run it once from the service shell after the first successful deploy. It is **not**
part of `preDeployCommand` — it must stay a deliberate, one-off action.

---

## Notes

- **Idempotent.** Every write is an upsert on a deterministic id (`demo-company`, `demo-job`, …), so
  re-running updates in place and never creates a second copy. Re-running also refreshes the
  password hash, which is how you rotate the demo password.
- **If you change an id** inside the seed's `IDS` map, run `--clean` *first* — otherwise the old row
  is orphaned under its previous id.
- **`--clean` relies on cascades.** Deleting the three users removes their profiles, the job, and
  the application via `onDelete: Cascade`. The superadmin and all core data (plans, badges, role
  permissions) are untouched.
- **The demo company has no subscription** — it sits on the free plan, which is the honest default
  state. That also means it is subject to the free tier's 3-job limit; the fixture uses one slot.
- **Never point this at production.** It is guarded, but the guards are the last line, not the first.

---

## Credentials

Passwords are **not** stored in this repo. Record the `DEMO_USER_PASSWORD` and the
`SUPERADMIN_PASSWORD` you set in the Railway variable store (or your password manager) — those are
the only copies. See [`secret-rotation.md`](secret-rotation.md) for the rotation procedure.

# Hiralent — Master Plan

> **Owner:** Huzaifa Iqbal (sole developer)
> **Goal:** Take Hiralent from "merged but untested, ~40% launch-ready" to a **secure, scalable, fully working, production-deployed** AI recruitment platform.
> **Baseline audit date:** 2026-07-20 (13 read-only audit agents, 2 passes)
> **Status:** In execution — **Waves 0, 1, 2 complete and gate-verified**; **Wave 3 in progress** (Phase 3.4 error/health/envelope backbone — done 2026-08-01; Phase 3.1 R-25 session sign-out + Phase 3.5 realtime read-receipts — done Session 4, 2026-08-03). Full verifier gate **35/35 green** (added `verify-error-envelope.mjs`, `verify-session-realtime.mjs`). Wave 2 closed end-to-end via the composed data-layer proof (`matrices/wave-2-data-gate.md`). **Next in Wave 3:** remaining wiring bugs (3.1: R-22/R-24/R-26), frontend API-config unification (3.2), env-driven URLs (3.3), per-slice response normalisation (3.6).

---

## How this plan is structured

Three concepts, from most granular to most strategic:

- **Pillars** — the permanent quality standards the whole project must satisfy (Security, Scalability, Correctness, Code-Quality, DevOps, Observability, Testing). A pillar is a *definition of done*. Every wave advances one or more pillars. Pillars never "finish" — they are the bar we hold everything to. See [`pillars/`](pillars/).
- **Waves** — big **sequential** execution stages. We run **wave-by-wave**: Wave 0 is fully completed and verified before Wave 1 starts, and so on. A wave has a clear entry state, a set of phases, and hard **exit criteria**. See [`waves/`](waves/).
- **Phases** — the ordered groups of concrete tasks *inside* a wave. Each phase is a shippable, verifiable unit.

```
Pillars  = WHAT "good" means (standards, always-on)
Waves    = WHEN we do things (sequential, Wave 0 → Wave N)
Phases   = HOW a wave is broken into verifiable steps
Tasks    = the actual work items inside a phase
```

---

## Folder map

```
hiralent-master-plan/
├── README.md                     ← you are here (index + rules)
├── 00-CURRENT-STATE.md           ← the honest baseline: what exists, what's broken
├── 01-RISK-REGISTER.md           ← every risk, ranked, mapped to the wave that fixes it
├── PROGRESS-LOG.md               ← living changelog: every change we make (before → after → why)
├── pillars/
│   ├── P1-security.md
│   ├── P2-scalability-performance.md
│   ├── P3-correctness-completeness.md
│   ├── P4-code-quality-standards.md
│   ├── P5-devops-deployment.md
│   ├── P6-observability-reliability.md
│   └── P7-testing-qa.md
├── waves/
│   ├── wave-0-triage-and-foundation.md   ← make it build + run + clean baseline
│   ├── wave-1-security-hardening.md
│   ├── wave-2-data-layer-and-db.md
│   ├── wave-3-core-correctness-and-wiring.md
│   ├── wave-4-feature-completion.md
│   ├── wave-5-real-payments.md
│   ├── wave-6-scalability-and-performance.md
│   ├── wave-7-observability-reliability-testing.md
│   └── wave-8-deployment-staging-to-production.md
├── matrices/
│   ├── feature-completeness-matrix.md    ← per-role REAL / PARTIAL / MOCK map
│   ├── env-var-matrix.md                 ← every env var, default, where documented
│   ├── api-contract-drift.md             ← frontend↔backend↔python wiring mismatches
│   └── dead-code-and-cleanup.md          ← files/deps safe to delete, redundant subsystems
└── client-updates/
    ├── _TEMPLATE.md                       ← plain-language weekly/monthly update format
    └── (weekly / monthly entries added as we go)
```

---

## The two non-negotiable rules

1. **Wave discipline.** We do not jump ahead. Wave N's exit criteria must be met and verified before Wave N+1 begins. Within a wave, phases run in order.
2. **Record everything (client transparency).** Every meaningful change is logged in [`PROGRESS-LOG.md`](PROGRESS-LOG.md) *in the same session it is made* — "before it was like this → we changed X → why → result → files touched". This is what lets us answer the client's "what did you do this month?" end-to-end at any moment. Client-facing summaries live in [`client-updates/`](client-updates/).

---

## Wave overview (execution order)

| Wave | Name | Outcome | Primary pillars | Status |
|---|---|---|---|---|
| **0** | Triage & Foundation | Both apps build & run clean; dead code/tooling fixed; safe baseline | P4, P5 | ✅ done (gate-verified) |
| **1** | Security Hardening | No critical vulns; secrets rotated; every endpoint guarded | P1 | ✅ done (gate-verified) |
| **2** | Data Layer & DB | Single Prisma client + pooling; indexes; safe migrations; seeds | P2, P3 | ✅ done (gate-verified, S7) |
| **3** | Core Correctness & Wiring | Every silent-fail wiring bug fixed; error handling; health | P3, P6 | 🔶 in progress (Phase 3.4 error/health/envelope backbone done) |
| **4** | Feature Completion | Every hollow/mock feature made real per role; subsystems reconciled | P3 | — |
| **5** | Real Payments | Genuine Stripe/PayPal + webhooks + server-side verification | P1, P3 | — |
| **6** | Scalability & Performance | Survives 2k RPS / 10k users; path to 100k; stateless & cached | P2 | — |
| **7** | Observability, Reliability & Testing | Metrics/logs/alerts; DLQ; graceful shutdown; test suite + load tests | P6, P7 | — |
| **8** | Deployment: Staging → Production | Dockerized, orchestrated, CI/CD, TLS, migrations; live | P5 | — |

> Mapping to the client's 2-month framing: **Month 1 ≈ Waves 0–3 (+start of 4) and a staging deploy**; **Month 2 ≈ Waves 4–8 (payments, scale, testing, production)**. We have generous time, so quality comes first — the wave order is the source of truth, not the calendar.

---

## Status legend (used across all wave/matrix files)

- 🔴 **BROKEN / MISSING** — does not work or does not exist
- 🟡 **PARTIAL** — works in part; has mocks, gaps, or fragility
- 🟢 **DONE** — implemented, wired, and verified
- ⚪ **N/A / marketing** — static/presentational, not a functional feature

Every task also carries a checkbox: `[ ]` todo · `[~]` in progress · `[x]` done (with a PROGRESS-LOG entry).

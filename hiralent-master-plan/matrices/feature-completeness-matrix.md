# Feature Completeness Matrix (per role)

> Live checklist for **Wave 4**. Status: 🟢 REAL · 🟡 PARTIAL · 🔴 MOCK/DEAD-END · ⚪ marketing/static or intentionally-removed/honest-disabled (not a live feature).
> Update the status as features are completed and add a PROGRESS-LOG entry. "Target" = the intended end state.
>
> **Wave 4 / Session 9 reconciliation (2026-08-11):** every Wave-4-scoped 🔴/🟡 below has been resolved to 🟢 (built real) or ⚪ (intentionally removed / honest-disabled), verified by file-existence + redirects + endpoints + the composed cross-role E2E (`verify-wave4-final-e2e.mjs`, PASS + fail-proved). The ONLY remaining 🔴 is **payments**, explicitly deferred to **Wave 5** (out of Wave-4 scope). No 🟡 remain.

## Cross-cutting (confirmed REAL)
Auth (JWT + Google OAuth + TOTP 2FA) · messaging (Socket.IO) · code execution (`/submissions` → runner-python) · AI interview (Gemini + TTS) · document validation (Python OCR+NLP) · search · candidate↔job matching.

## Candidate
| Feature | Status | Note / action |
|---|---|---|
| Signup + onboarding (location/salary/pic/resume) | 🟢 | works; onboarding + kill-switch proven in `verify-wave4-final-e2e` |
| Resume autofill | 🟢 | W4-S3 proved live (seeded extraction → `applyConfirmedFields` writes real rows; `autofill-live.probe.ts`) |
| Job search / apply / applications / recommended | 🟢 | works; candidate browse leg proven in `verify-wave4-final-e2e` [E] |
| Skills-assessment suite (session/answer/exec/history/invites) | 🟢 | works |
| Coding assessment (in-session) | 🟢 | works |
| Standalone code-run demo (`code-run`→`results`→`question`) | ⚪ | **removed (W4-S5)** — mock pages deleted (verified gone) |
| AI interview (setup/room/complete) | 🟢 | works (proctoring, TTS) |
| Simple tests · badges · certifications · profile+completeness · public profile | 🟢 | works |
| Messages · notifications | 🟢 | live-update fixes in Wave 3 |
| **Analytics** | 🟢 | **built (W4-S7)** — real widgets (ApplicationStats/RecentApplications/profile completeness); nav re-added |
| `skills-assessment/instructions`, `ResumeQuality` | ⚪ | **removed (W4-S5/S7)** — orphaned mock deleted (verified gone) |
| Cases (relocation) + doc AI validation | 🟢 | works |

## Company / Recruiter
| Feature | Status | Note / action |
|---|---|---|
| Register + verification (OCR) | 🟢 | works |
| Dashboard | 🟢 | works |
| **Post-job (standalone page)** | 🟢 | **consolidated (W4-S6)** — `postjob/page.tsx` now `redirect()`s to the canonical jobManagement/CreateJobWizardModal flow |
| Job creation (via jobManagement) · AI JD · CRUD | 🟢 | works |
| Assessment mgmt + templates · question bank/library · review queue | 🟢 | works (`// waffa mock` removed — verified gone) |
| Candidate ranking (internal + external/sourced) | 🟢 | works; internal card's inline Chat is honest-disabled ("coming soon") — W4-S9 removed a `console.log` dead-end (card→detail nav is the real action) |
| **External candidate → Invite** | ⚪ | **honest-disabled (W4-S6)** — `ExternalCandidateCard` shows "invites for sourced candidates are coming soon" (deferred, not a silent dead-end) |
| Interviews · team + permissions · employer profile | 🟢 | works |
| **manage-hiring (pipeline)** | 🟢 | **consolidated (W4-S6)** — `redirect()`s to the working JobApplicantsModal pipeline |
| **discover** | 🟢 | **built (W4-S6)** — real `GET /employer/public/companies` (PII-safe select), page wired |
| `company/[slug]` public profile | 🟢 | works |
| **`company/public-profile/[id]`** | 🟢 | **consolidated (W4-S6)** — `redirect()`s to the canonical `/company/[slug]` |
| Pricing (marketing) | ⚪ | static |
| **Checkout / subscription / payments** | 🔴 | fake gateways → **Wave 5** (explicitly out of Wave-4 scope — the one deliberate remaining red) |
| Messages · notifications | 🟢 | works |

## Agency
| Feature | Status | Note / action |
|---|---|---|
| Apply · dashboard · cases · case documents + AI analysis | 🟢 | works |
| Embassy submissions · housing · integration services | 🟢 | works |
| Messages · profile | 🟢 | works |
| **Settings → notification preferences** | 🟢 | **built (W4-S7)** — real `UserNotificationPreferences` table + `GET/PUT /notification-preferences`, mount-GET hydrate→save persists across reload |

## Admin / Superadmin
| Feature | Status | Note / action |
|---|---|---|
| Login + setup/verify MFA | 🟢 | works; full MFA login proven in `verify-wave4-final-e2e` [F] |
| Dashboard · company verifications (list/detail/approve/reject) | 🟢 | works |
| **Agencies list + approve/reject** | 🟢 | **fixed (W3)** — admin.agency token key normalized (was `Bearer null`) |
| **Sidebar: Analytics / Security-Log / Admins / Settings** | 🟢 | **built (W4-S8)** — 4 real backend-backed pages + `admin.management` endpoints + audit trail; kill-switch, 4 pages, admins CRUD all proven in `verify-wave4-final-e2e` [F][G][H] |

## End-to-end broken flows — Wave 4 resolution (2026-08-11)
1. Payments — **🔴 Wave 5** (deferred by design) · 2. Company post-job — ✅ consolidated (S6) · 3. manage-hiring — ✅ consolidated (S6) · 4. discover — ✅ built (S6) · 5. company public-profile/[id] — ✅ consolidated (S6) · 6. external invite — ✅ honest-disabled (S6) · 7. admin sidebar 4 pages — ✅ built (S8) · 8. candidate analytics — ✅ built (S7) · 9. code-run demo mock — ✅ removed (S5) · 10. skills-assessment/instructions — ✅ removed (S5) · 11. agency notification prefs — ✅ built (S7).

**Result: all 10 Wave-4-scoped broken flows closed; only payments remains, tracked for Wave 5.**

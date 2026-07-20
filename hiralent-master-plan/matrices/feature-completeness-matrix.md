# Feature Completeness Matrix (per role)

> Live checklist for **Wave 4**. Status: 🟢 REAL · 🟡 PARTIAL · 🔴 MOCK/DEAD-END · ⚪ marketing/static (not a feature).
> Update the status as features are completed and add a PROGRESS-LOG entry. "Target" = the intended end state.

## Cross-cutting (confirmed REAL)
Auth (JWT + Google OAuth + TOTP 2FA) · messaging (Socket.IO) · code execution (`/submissions` → runner-python) · AI interview (Gemini + TTS) · document validation (Python OCR+NLP) · search · candidate↔job matching.

## Candidate
| Feature | Status | Note / action |
|---|---|---|
| Signup + onboarding (location/salary/pic/resume) | 🟢 | works |
| Resume autofill | 🔴→🟢 | `/resume/extract` dangling → fix in Wave 3 |
| Job search / apply / applications / recommended | 🟢 | works |
| Skills-assessment suite (session/answer/exec/history/invites) | 🟢 | works |
| Coding assessment (in-session) | 🟢 | works |
| Standalone code-run demo (`code-run`→`results`→`question`) | 🔴 | uses `mockQuestions`; separate from real path or fix (Wave 4) |
| AI interview (setup/room/complete) | 🟢 | works (proctoring, TTS) |
| Simple tests · badges · certifications · profile+completeness · public profile | 🟢 | works |
| Messages · notifications | 🟢 | live-update fixes in Wave 3 |
| **Analytics** | 🔴 | "coming soon" → build or hide (Wave 4) |
| `skills-assessment/instructions`, `ResumeQuality` | 🔴 | orphaned mock/dead → remove (Wave 4) |
| Cases (relocation) + doc AI validation | 🟢 | works |

## Company / Recruiter
| Feature | Status | Note / action |
|---|---|---|
| Register + verification (OCR) | 🟢 | works |
| Dashboard | 🟢 | works |
| **Post-job (standalone page)** | 🔴 | Publish = `console.log` → wire to `POST /jobs` (Wave 4) |
| Job creation (via jobManagement) · AI JD · CRUD | 🟢 | works |
| Assessment mgmt + templates · question bank/library · review queue | 🟢 | works (`employerAssessment` has `// waffa mock` to remove) |
| Candidate ranking (internal + external/sourced) | 🟢 | works |
| **External candidate → Invite** | 🔴 | `// TODO invite flow` → implement (Wave 4) |
| Interviews · team + permissions · employer profile | 🟢 | works |
| **manage-hiring (pipeline)** | 🔴 | "Comming Soon" → build (Wave 4) |
| **discover** | 🔴 | hardcoded cards → fetch real (Wave 4) |
| `company/[slug]` public profile | 🟢 | works |
| **`company/public-profile/[id]`** | 🔴 | static → fix or remove (Wave 4) |
| Pricing (marketing) | ⚪ | static |
| **Checkout / subscription / payments** | 🔴 | fake gateways → **Wave 5** |
| Messages · notifications | 🟢 | works |

## Agency
| Feature | Status | Note / action |
|---|---|---|
| Apply · dashboard · cases · case documents + AI analysis | 🟢 | works |
| Embassy submissions · housing · integration services | 🟢 | works |
| Messages · profile | 🟢 | works |
| **Settings → notification preferences** | 🟡 | not persisted (no table) → Wave 4 |

## Admin / Superadmin
| Feature | Status | Note / action |
|---|---|---|
| Login + setup/verify MFA | 🟢 | works |
| Dashboard · company verifications (list/detail/approve/reject) | 🟢 | works |
| **Agencies list + approve/reject** | 🔴 | sends `Bearer null` (wrong key) → fix Wave 3 |
| **Sidebar: Analytics / Security-Log / Admins / Settings** | 🔴 | 404 (no pages) → build or remove (Wave 4) |

## End-to-end broken flows (priority for Wave 4/5, tracked)
1. Payments (Wave 5) · 2. Company post-job · 3. manage-hiring · 4. discover · 5. company public-profile/[id] · 6. external invite · 7. admin sidebar 4 pages · 8. candidate analytics · 9. code-run demo mock · 10. skills-assessment/instructions · 11. agency notification prefs.

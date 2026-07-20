# Wave 4 — Feature Completion

> **Goal:** make every shipped feature real — finish the hollow ones, implement the stubbed integrations, and reconcile the redundant subsystems. After this wave, "shows but doesn't work" is gone (payments handled separately in Wave 5). **Runs after Wave 3.**
>
> **Pillar advanced:** P3 (Correctness & Completeness) (+ P1 for the real sandbox).
> **Risks closed:** R-03 (real sandbox), R-34 (prompt-injection guards), R-37 (subsystem consolidation) + the per-role dead-ends.
> **Entry state:** many role features are mock/stub/dead-end; integrations stubbed; 4 assessment systems etc.
>
> Work is organized by role; use [`matrices/feature-completeness-matrix.md`](../matrices/feature-completeness-matrix.md) as the live checklist (flip 🔴/🟡 → 🟢).

---

## Phase 4.1 — Company role gaps
- [ ] `postjob` page: wire the Publish button to the real `POST /jobs` (currently `console.log`); collect the form inputs. (dead-end)
- [ ] `manage-hiring`: build the real hiring-pipeline UI over the existing `companyHiringFlow` backend (currently "Comming Soon"). (dead-end)
- [ ] `discover`: fetch real companies (currently hardcoded cards).
- [ ] External sourced candidate **Invite**: implement the `// TODO: invite flow`.
- [ ] `company/public-profile/[id]`: fetch by id, or remove in favour of the working `/company/[slug]`.
- [ ] Remove the `// waffa mock` in `employerAssessment.service.ts`; wire to real question-gen.

## Phase 4.2 — Candidate role gaps
- [ ] `dashboard/analytics`: implement real analytics or hide the nav ("Analytics coming soon").
- [ ] `candidate/question` + `code-run` demo: replace `mockQuestions` with the real question source, or clearly separate the demo from the real assessment path.
- [ ] Remove/hide the orphaned `skills-assessment/instructions` mock page and dead `ResumeQuality` component.

## Phase 4.3 — Agency & Admin gaps
- [ ] Agency settings: persist notification preferences (create the `UserNotificationPreferences` table + wiring). (TODO)
- [ ] Admin sidebar: build the four missing pages — **Analytics, Security-Log, Admins, Settings** — or remove the nav links (currently 404). Prefer building Admins (manage admins) + Settings; Security-Log ties into P6 audit log.

## Phase 4.4 — Real integrations (replace stubs)
- [ ] Verification signals: implement real `whois`/`website`/`linkedin` (currently hardcoded stubs) or gate the feature honestly. (R-34 guards on scraped content)
- [ ] Verification helpers: implement the S3 fetch (`verification/helpers/file.ts` throws "not implemented").
- [ ] **Real sandbox-service**: implement Docker-based isolation + resource limits + gVisor/seccomp (or fold into the hardened runner from Wave 1) so ai-service vetting uses a real sandbox, not `MockSandboxService`. (R-03)
- [ ] **Plagiarism**: implement the pipeline (static AST + embeddings + web-corpus) or de-scope explicitly and stop returning fake `risk:0.0`.
- [ ] Wafaa/Youssra gRPC clients (`assessment-ai-service`): implement the real calls or remove the mock toggles once teammates' services are represented by our own implementations.
- [ ] Add prompt-injection guards where scraped/OCR/user content reaches Gemini (ai-service, doc-validator `BLOCK_NONE`). (R-34)

## Phase 4.5 — Consolidate redundant subsystems
- [ ] **Questions:** converge on `Question`; retire `QuestionBank` (dead) and the duplicate MCQ editors/generators. (R-37)
- [ ] **Assessments:** make the candidate-session flow canonical; gate/remove the mock + simulate flows; fix employer/template path. (R-37)
- [ ] **Scoring:** consolidate the 2–3 scoring paths onto one core. (R-37)
- [ ] **Chat/messages:** delete the two `mockData.ts` stores; components consume the real message API. (R-37)

---

## Exit criteria
- ✅ Every entry in the feature matrix is 🟢 or intentionally ⚪ (removed/hidden with a note) — no 🔴/🟡 shipped.
- ✅ No `console.log`-only submits, no "Coming Soon" in shipped nav, no dead buttons, no 404 nav links.
- ✅ Stubbed integrations are either real or explicitly de-scoped and hidden; sandbox is a real isolated executor.
- ✅ One canonical system each for questions, assessments, scoring, chat; dead tables gone.
- ✅ Each role's canonical journey passes a manual end-to-end run.
- ✅ PROGRESS-LOG updated per change.

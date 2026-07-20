# Dead Code & Cleanup

> Reference for **Wave 0** (deletions) and **Wave 4** (subsystem consolidation). Tick as removed/consolidated; log each in PROGRESS-LOG.

## Safe deletions (dead, confirmed by import/mount analysis) — Wave 0
- [ ] `backend/src/index.ts` — dead alt entry (real = `server.ts`).
- [ ] `backend/src/routes/health.routes.ts` — unmounted (re-add properly in Wave 3).
- [ ] `backend/src/scheduler/scraping.scheduler.ts` — duplicate (active = `services/scraping/scraping-scheduler.ts`).
- [ ] `ai-service/app/main_backup.py` — backup copy.
- [ ] `ai-service/app/api/routes.py` — router never `include_router`'d (endpoints re-defined in `main.py`).
- [ ] `ai-service/app/mock_sandbox_Youssra.py` — dev mock (once real sandbox lands, Wave 4).
- [ ] `frontend/src/lib/api-client.ts` + `frontend/src/lib/admin-auth.ts` — orphaned pair (unreferenced).
- [ ] `frontend/src/providers/ReactQueryProvider.tsx` — second, unused provider (live one = `context/Providers.tsx`).
- [ ] Duplicate components: one of `components/question/MCQEditor.tsx` vs `.../questionbank/MCQEditor.tsx`; one of `components/OCRUpload.tsx` vs `components/auth/OCRUpload.tsx`.
- [ ] `frontend/.../resume-quality/ResumeQuality.tsx` — dead (mock, never imported).

## Committed artifacts to remove + gitignore — Wave 0
- [ ] `backups-files-folders/**` (wafaa/youssra schema backups).
- [ ] `test-signup.json`, `src - Raccourci.lnk` (committed Windows shortcut).
- [ ] `runner-python/runner-stub.log`, `backend/backend.log`, `backend/worker.log`.
- [ ] `backend/temp_processing_*.pdf`, `backend/prisma/dev.db` (SQLite in a Postgres project).
- [ ] `ai-service/test_diagram_output.png`, ad-hoc `ai-service/test_gemini.py` / `test_renderer_windows.py`.

## Bugs/duplication in wiring — Wave 0
- [ ] `app.ts:138-139` — `insightsRoutes` mounted twice (remove one).
- [ ] `mockAssessment.routes` mounted unconditionally at `app.ts:152` — gate/remove (also Wave 1 security).

## Dependency cleanup — Wave 0
- [ ] Remove: `@fastify/helmet`, `@fastify/cors`, `redis` + `@types/redis`, `crypto` (deprecated pkg), one Pinecone client.
- [ ] Standardize one of `bcrypt` / `bcryptjs`.
- [ ] Add missing frontend deps `country-list`, `iso-639-1`; restore `src/lib/queryClient`, `message/message.types`.
- [ ] One package manager; delete the other lockfiles at root/backend/frontend; fix/remove root `package.json`.
- [ ] Python: UTF-8 re-encode `assessment-ai-service/requirements.txt`; align `google-generativeai` (0.3.2/0.8.5) and Pydantic (v1 in runner-plagiarism vs v2) versions; pin unpinned deps.

## Dead DB tables (drop via migration) — Wave 2
- [ ] `QuestionBank` (0 reads/writes), `ChatHistory` (0 reads/writes), `CandidateGlobalScore*` (write-only).

## Redundant subsystems to consolidate — Wave 4
- [ ] **Questions:** keep `Question`; retire `QuestionBank` + duplicate generators/editors.
- [ ] **Assessments (4 systems):** canonical = candidate-session flow; gate/remove mock + compete-simulate; fix employer/template.
- [ ] **Scoring (2–3 paths):** consolidate `assessmentScoring` + `scoring-algorithms` + profile scoring onto one core.
- [ ] **Chat (2 stores):** delete both `message/mockData.ts`; consume the real message API.

## Stubbed logic to implement or de-scope — Wave 4 (also Wave 5 for payments)
- [ ] Verification signals `whois`/`website`/`linkedin` (hardcoded stubs); `verification/helpers/file.ts` S3 fetch (throws).
- [ ] `sandbox-service` (real isolation) + `plagiarism-service` (real pipeline) — both placeholder today.
- [ ] Wafaa/Youssra gRPC clients in `assessment-ai-service` (TODO stubs).
- [ ] Payments `StripeGateway`/`PayPalGateway` (Wave 5).

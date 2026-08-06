# Dead Code & Cleanup

> Reference for **Wave 0** (deletions) and **Wave 4** (subsystem consolidation). Tick as removed/consolidated; log each in PROGRESS-LOG.

## Safe deletions (dead, confirmed by import/mount analysis) — Wave 0
- [x] `backend/src/index.ts` — dead alt entry (real = `server.ts`). **[S6]** deleted; tsc green.
- [x] `backend/src/routes/health.routes.ts` — unmounted. **[S6]** deleted (re-add properly in Wave 3).
- [x] `backend/src/scheduler/scraping.scheduler.ts` — duplicate (active = `services/scraping/scraping-scheduler.ts`). **[S6]** deleted.
- [x] `ai-service/app/main_backup.py` — backup copy. **[S6]** deleted.
- [x] `ai-service/app/api/routes.py` — router never `include_router`'d (endpoints re-defined in `main.py`). **[S6]** deleted (`api/__init__.py` empty pkg left in place; harmless).
- [x] `ai-service/app/mock_sandbox_Youssra.py` — dev mock. **[S6]** deleted (folded in early; no Wave-4 refs remained).
- [x] `frontend/src/lib/api-client.ts` + `frontend/src/lib/admin-auth.ts` — orphaned pair (unreferenced). **[S6]** deleted. NB: live `lib/api/admin.api.ts` (`new AdminAPI()`) is a *different* file — kept.
- [x] `frontend/src/providers/ReactQueryProvider.tsx` — second, unused provider (live one = `context/Providers.tsx`). **[S6]** deleted. `lib/queryClient.ts` left in place per dep-cleanup note below.
- [~] Duplicate components — **[S6]**: **MCQEditor** both deleted (`question/` + `questionbank/`, both confirmed unreferenced across `src`+`app`). **OCRUpload**: only `components/auth/OCRUpload.tsx` deleted (dead identical dup); **`components/OCRUpload.tsx` KEPT** — imported by `frontend/app/ocr-test/page.tsx` (a live `/ocr-test` dev route). ⚠️ *Finding:* the doc's "delete one of each OCRUpload" was correct; an initial `src`-only scan wrongly flagged both — caught by the frontend build. `CompanyOCRUpload.tsx` untouched (separate live component).
- [x] `frontend/.../resume-quality/ResumeQuality.tsx` — dead (mock, never imported). **[S6]** deleted (dir keeps live `CircularProgress.tsx`; `types/profile.ts` `ResumeQualityData` is a separate live type).

## Committed artifacts to remove + gitignore — Wave 0
- [x] `backups-files-folders/**` (wafaa/youssra schema backups). **[S6]** `git rm --cached`.
- [x] `test-signup.json`, `src - Raccourci.lnk` (+ `backend/src - Raccourci.lnk`). **[S6]** `git rm --cached`.
- [x] `runner-python/runner-stub.log`, `backend/backend.log`, `backend/worker.log`. **[S6]** `git rm --cached`.
- [x] `backend/temp_processing_*.pdf`, `backend/prisma/dev.db` (SQLite in a Postgres project). **[S6]** `git rm --cached`.
- [x] `ai-service/test_diagram_output.png`, ad-hoc `ai-service/test_gemini.py` / `test_renderer_windows.py`. **[S6]** deleted from disk + untracked.
- **[S6]** All above now covered by a root `.gitignore` block (`*.log`, `*.lnk`, `*.db`, `dev.db`, `backups-files-folders/`, `test-signup.json`, `temp_processing_*.pdf`, `ai-service/test_diagram_output.png`) so they can't be re-committed. Files kept on disk (except the ai-service test trio, fully deleted).

## Bugs/duplication in wiring — Wave 0
- [x] `app.ts:138-139` — `insightsRoutes` mounted twice. **[S6]** removed the duplicate (now mounted exactly once).
- [x] `mockAssessment.routes` mounted unconditionally at `app.ts:152`. **[S6]** **gated** — moved inside the `NODE_ENV !== 'production'` dev block (no longer exposed in prod). Full-delete of the route/controller/service/types chain deferred to Wave 4 consolidation.

## Dependency cleanup — Wave 0
- [ ] Remove: `@fastify/helmet`, `@fastify/cors`, `redis` + `@types/redis`, `crypto` (deprecated pkg), one Pinecone client.
- [ ] Standardize one of `bcrypt` / `bcryptjs`.
- [ ] Add missing frontend deps `country-list`, `iso-639-1`; restore `src/lib/queryClient`, `message/message.types`.
- [ ] One package manager; delete the other lockfiles at root/backend/frontend; fix/remove root `package.json`.
- [ ] Python: UTF-8 re-encode `assessment-ai-service/requirements.txt` and the **dead** UTF-16 `ai-service/app/question_generator/corpus_generator.py` (OpenAI near-duplicate of `gemini_generator.py`, imported nowhere — candidate for deletion); align `google-generativeai` versions (0.3.2 in doc-validator vs newer in ai-service); pin unpinned deps. _(The `runner-plagiarism` Pydantic-v1 mismatch is gone — that service was retired in Wave 4 / Session 2.)_

## Dead DB tables (drop via migration) — Wave 2
- [ ] `QuestionBank` (0 reads/writes), `ChatHistory` (0 reads/writes), `CandidateGlobalScore*` (write-only).

## Redundant subsystems to consolidate — Wave 4
- [ ] **Questions:** keep `Question`; retire `QuestionBank` + duplicate generators/editors.
- [ ] **Assessments (4 systems):** canonical = candidate-session flow; gate/remove mock + compete-simulate; fix employer/template.
- [ ] **Scoring (2–3 paths):** consolidate `assessmentScoring` + `scoring-algorithms` + profile scoring onto one core.
- [ ] **Chat (2 stores):** delete both `message/mockData.ts`; consume the real message API.

## Stubbed logic to implement or de-scope — Wave 4 (also Wave 5 for payments)
- [ ] Verification signals `whois`/`website`/`linkedin` (hardcoded stubs); `verification/helpers/file.ts` S3 fetch (throws).
- [x] `sandbox-service` (real isolation) + `plagiarism-service` (real pipeline) — both were placeholder. **[W4-S1a/S1b]** `sandbox-service` **retired**: folded onto the one hardened runner-python HTTP runner (`docker_runner.py` + hardened `http_service.py`, fail-closed); ai-service vetting repointed off the gRPC stub. **[W4-S2]** `plagiarism-service` **de-scoped & retired** (no real detector was feasible this session): the unwired gRPC `python-services/plagiarism-service/` + the redundant `backend/services/runner-plagiarism/` stub deleted (whole `python-services/` dir removed with them); the live runner `/plagiarism` route + backend client now emit an explicit **`not_computed`** signal (null scores) instead of a fabricated `risk:0.0`/mock `0.92` — no consumer sees a fake "clean" score. A real pipeline (static AST + embeddings + web-corpus) remains explicitly out of scope.
- [ ] Wafaa/Youssra gRPC clients in `assessment-ai-service` (TODO stubs).
- [ ] Payments `StripeGateway`/`PayPalGateway` (Wave 5).

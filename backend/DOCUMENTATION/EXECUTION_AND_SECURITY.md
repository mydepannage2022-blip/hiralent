# Execution & Security — Hiralent

This document summarizes the "Execution & Security" subsystem owned by the YOUSSRRA scope. It describes what exists in the repository, the data flows, security posture, integration points, outstanding gaps, and small code changes applied during this session.

> Note: OCR is out of scope for this task (already owned by other team members). This document focuses on the candidate coding experience, execution runner, plagiarism detection, real-time results, and related services.

## Overview

You own the full candidate coding experience and code validation. The project contains the following major capabilities:

- Monaco-based code editor on the frontend (multi-language, IntelliSense etc.)
- Secure execution orchestration and runner images
- Plagiarism detection (static, dynamic, and web-corpus comparison via embeddings)
- Real-time result streaming (SSE/WS)
- AI-assisted grading and skill radar updates
- Email verification and legacy-check flows (nodemailer + SMTP)

This document maps sources to functionality and provides recommended next steps and security hardening guidelines.

---

## Where code lives (key files)

- Frontend
  - `frontend/src/components/CodeEditor.tsx` — Monaco editor integration
  - `frontend/src/components/CodeRunner.tsx` — UI for running and submitting code
  - `frontend/src/hooks/useSubmissionSSE.ts` — SSE hook for live updates

- Runner & Execution
  - `backend/src/services/runner.dispatcher.ts` — dispatch to Docker / local runner
  - `backend/src/services/execution.service.ts` — orchestration for submissions
  - `backend/src/workers/run.worker.ts` — queue worker that consumes submissions
  - `runner-python/entrypoint.py` — python runner container entrypoint
  - `runner-python/Dockerfile` — runner image definition

- Plagiarism & Embeddings
  - `backend/src/services/plagiarism.service.ts` — high-level pipeline and scoring
  - `backend/src/services/externalClients.ts` — embedding & vector DB clients (wrappers)

- Real-time events
  - `backend/src/lib/submissionEmitter.ts` — emit updates to clients
  - `backend/src/workers/run.worker.ts` — emits status updates during lifecycle

- Auth & Email (verification flows)
  - `backend/src/utils/email.util.ts` — nodemailer-based SMTP sender
  - `backend/src/services/auth.service.ts` — verification, welcome and legacy-check email templates and calls

- Tests
  - `backend/src/__tests__/*` — unit and integration tests for execution and plagiarism (partial coverage)

---

## High-level data flow (submission lifecycle)

1. Candidate writes code in Monaco and clicks "Run" or "Submit".
2. Frontend posts the code to an API (e.g., `/api/submission` or `/api/run`).
3. Backend creates a `Submission` entity in the database and enqueues it for processing (status: `queued`).
4. Worker `run.worker` picks up the queued submission and calls `execution.service.runSubmission`.
5. The execution service prepares payload (language, code, time limits, testcases). If required, the service queries the question/testcase API (external) for testcases.
6. The dispatcher (`runner.dispatcher`) allocates an execution environment (Docker container possibly with gVisor), applies resource limits and runs the runner (python entrypoint or remote runner). It captures stdout/stderr/execution trace and test results.
7. Backend receives runner response; it stores results and runs the plagiarism pipeline:
   - Static analysis (AST tokens, structural diffs)
   - Dynamic analysis (trace similarity, runtime behavior)
   - Embedding generation for the submitted code and vector search against known web snippets (vector DB)
   - Produce per-source evidence and a combined plagiarism risk score
8. AI grading (optional): an AI service consumes code, outputs and plagiarism evidence to produce a skill assessment and narrative.
9. Backend updates submission status to `completed` (or `failed`) and emits a real-time event (SSE/WS) to the frontend with rich results and evidence.
10. Post-processing: update `skill-radar` via Hissane client, persist metrics and send notifications as needed.

---

## External services referenced (integration points)

- Wafaa (question/test-case provider)
  - Purpose: fetch question definitions and canonical test cases used during execution.
  - Typical call: `get_question_test_cases(question_id)` → returns `question.test_cases`

- Hissane (skill radar updater)
  - Purpose: update candidate skill profiles based on graded submissions.
  - Typical call: `update_skill_radar({ candidate_id, skills, submission_id })`

- Embedding provider & Vector DB
  - Purpose: create embeddings for code and search against a large corpus of web snippets to find near-duplicates.
  - Typical flow: `generate_embedding(code)` → `vector_db.search(embedding, top_k=20)` → similarity scores → evidence

- SMTP mail server (for verification emails)
  - Implementation: nodemailer with SMTP transport (configured in `backend/.env`)
  - Example SMTP values found in `.env` (dev/staging): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

---

## Contracts & response shapes (recommended canonical types)

Define TypeScript interfaces in `backend/src/types/` and use them across services.

Examples (summary):

- RunnerResult

```ts
interface TestCaseResult {
  testCaseId?: string;
  passed: boolean;
  output: string;
  expected?: string;
  durationMs?: number;
  stderr?: string;
}

interface RunnerResult {
  submissionId: string;
  results: TestCaseResult[];
  totalPassed: number;
  totalTests: number;
  runtimeMs?: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}
```

- PlagiarismReport

```ts
interface EvidenceItem {
  source: string; // e.g., 'web', 'repo', 'candidate_history'
  similarity: number; // 0..1
  snippet: string;
  url?: string;
}

interface PlagiarismReport {
  staticScore: number; // 0..1
  dynamicScore: number; // 0..1
  webScore: number; // 0..1
  finalScore: number; // weighted
  evidence: EvidenceItem[];
}
```

- AI Assessment

```ts
interface SkillAssessment {
  skillName: string;
  confidence: number; // 0..1
  score: number; // 0..100
}

interface AiAssessmentReport {
  skills: SkillAssessment[];
  narrative: string;
  recommendations?: string[];
}
```

Recommendation: implement runtime validation (zod) for endpoint inputs/outputs to prevent contract drift.

---

## Security hardening checklist (priority order)

1. Use gVisor (or equivalent) for untrusted code execution to reduce kernel attack surface.
2. Add seccomp policies and remove unnecessary capabilities in Docker containers.
3. Enforce CPU and memory limits per execution; implement per-job cgroups if needed.
4. Restrict filesystem mounts: runner containers should be read-only by default; write-only tmpfs for ephemeral files.
5. Implement network isolation: either no network, or a tightly controlled egress proxy that filters outbound requests.
6. Run the runner image as non-root and apply user namespaces.
7. Scan runner images for CVEs and rebuild automatically when base images are updated.
8. Add timeouts and watchdogs to kill runaway processes.
9. Add logging of syscalls at the entrypoint for forensic events (if feasible, privacy-considerate).

---

## Observability recommendations

- Metrics (Prometheus): submission queue length, runs started/completed/failed, avg run duration, plagiarism queries per minute, embedding errors.
- Traces: correlate submission id across services and logs; use request IDs.
- Error reporting: Sentry (capture worker errors, dispatcher failures, external client errors).
- Structured logs: JSON with `submission_id`, `user_id`, `request_id`.

---

## Gaps & prioritized next steps

1. Standardize API contracts and add runtime validation (zod) — short
2. Wire production vector DB & embedding provider with batching and caching — medium
3. Harden runner infra with gVisor, seccomp, network isolation — high
4. Add CI to build and push runner images and test the runner in a controlled K8s environment — medium
5. Add end-to-end tests (submission→run→plagiarism→emit) — medium
6. Integrate Wafaa and Hissane clients properly and ensure idempotency/retries — short

---

## Changes applied in this session

- Created this documentation file: `backend/DOCUMENTATION/EXECUTION_AND_SECURITY.md`.
- Applied a small, low-risk improvement to the email sender to add retry with exponential backoff (see `backend/src/utils/email.util.ts`) to reduce lost verification emails due to transient SMTP errors.

---

## How to proceed next (recommended immediate tasks)

1. Agree on TypeScript interfaces for RunnerResult and PlagiarismReport; I can draft and add them under `backend/src/types/`.
2. Wire runtime validation (zod) for `/api/submission` input and runner responses to catch contract drift early.
3. Add simple Prometheus metrics and Sentry hooks in `run.worker` and `runner.dispatcher`.

If you confirm, I will implement step 1 (create type files) and step 2 (zod validators) next and run quick tests.

---

## Appendix: Useful commands for local developers

- Run tests

```powershell
npm ci
npm run test --prefix backend
```

- Build backend (tsc)

```powershell
cd backend
npm run build
```

- See authors for a file (who worked on it)

```powershell
git blame --line-porcelain backend/src/utils/email.util.ts | Select-String '^author ' | ForEach-Object { $_.Line } | Sort-Object | Get-Unique
```


---

End of document.

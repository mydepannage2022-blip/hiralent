// src/lib/candidateAssessment/candidateAssessment.api.ts
import { apiFetch } from "@/src/lib/api/apiClient";
import type {
  AssessmentSessionDTO,
  AssessmentQuestionDTO,
  SavedAnswerDTO,
  RunResultDTO,
  RunResultTestDTO,
  UiSession,
  UiQuestion,
  UiRunResult,
} from "@/src/types/candidate.assessment.types";

/* =========================
   NORMALIZERS (frontend stable)
========================= */

export function normalizeSession(s: AssessmentSessionDTO): UiSession {
  return {
    sessionId: s.session_id,
    assessmentId: s.assessment_id,
    candidateId: s.candidate_id,
    status: s.status,
    startedAt: s.started_at ?? null,
    expiresAt: s.expires_at ?? null,
    submittedAt: s.submitted_at ?? null,
    timeLimitMinutes: s.time_limit_minutes ?? null,
    remainingSeconds: s.remaining_seconds ?? null,
    currentIndex: s.current_index ?? null,
    progress: s.progress ?? null,
  };
}

export function normalizeQuestions(payload: any): UiQuestion[] {
  // backend returns { questions: [...] } OR maybe array
  const arr = Array.isArray(payload?.questions)
    ? payload.questions
    : Array.isArray(payload)
      ? payload
      : [];

  return arr.map((q: AssessmentQuestionDTO) => ({
    questionId: q.question_id,
    type: String(q.type || "").toLowerCase() === "mcq" ? "MCQ" : "CODING",
    title: q.title,
    difficulty: q.difficulty,
    statement: q.problemStatement || q.description || null,
    constraints: null,
    examples: null,
    choices: q.options || null,
    skillTags: q.skillTags || null,
    functionSignature: null,
    timeLimitSec: null,
  }));
}

export function normalizeRunResult(r: RunResultDTO): UiRunResult {
  const score = Number(r?.result?.score ?? r?.score ?? 0) || 0;
  const results = (r?.result?.runner?.results || r?.result?.results || []) as RunResultTestDTO[];
  const total = Number(r?.result?.total ?? results.length ?? 0) || results.length || 0;
  const passed = Number(r?.result?.runner?.totalPassed ?? r?.result?.passedCount ?? 0) || 0;

  return {
    status: r.status || "UNKNOWN",
    score,
    total,
    passed,
    stdout: r?.result?.runner?.stdout ?? null,
    stderr: r?.result?.runner?.stderr ?? null,
    results: results.map((t) => ({
      input: t.input ?? null,
      expected: t.expected ?? null,
      output: t.output ?? null,
      stderr: t.stderr ?? null,
      passed: t.passed ?? null,
      durationMs: (t as any).durationMs ?? null,
      memKb: (t as any).memKb ?? null,
    })),
    plagiarism: r?.result?.plagiarism,
    raw: r,
  };
}

/* =========================
   API calls
========================= */

export async function getSession(sessionId: string) {
  const raw = await apiFetch<AssessmentSessionDTO>("CANDIDATE", `/assessment-sessions/${sessionId}`);
  return normalizeSession(raw);
}

export async function getSessionQuestions(sessionId: string) {
  const raw = await apiFetch<any>("CANDIDATE", `/assessment-sessions/${sessionId}/questions`);
  return normalizeQuestions(raw);
}

export async function patchNavigation(sessionId: string, body: { current_index?: number }) {
  return apiFetch<any>("CANDIDATE", `/assessment-sessions/${sessionId}/navigation`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function saveAnswer(
  sessionId: string,
  questionId: string,
  body: {
    payload: any;
    isFinal?: boolean;
    isFlagged?: boolean;
  }
) {
  // ✅ Always send a real object
  const payloadIn = body?.payload && typeof body.payload === "object" ? body.payload : {};

  // ✅ Fix common Zod issues:
  // - selectedOptionIds must be an array if present
  // - language must never be null if present (use default)
  const normalizedPayload: any = { ...payloadIn };

  // If MCQ payload exists but selectedOptionIds missing => force []
  if ("selectedOptionIds" in normalizedPayload) {
    normalizedPayload.selectedOptionIds = Array.isArray(normalizedPayload.selectedOptionIds)
      ? normalizedPayload.selectedOptionIds.map(String).filter(Boolean)
      : [];
  }

  // If CODING payload exists but language null/undefined => default
  if ("language" in normalizedPayload) {
    const lang = normalizedPayload.language;
    normalizedPayload.language =
      typeof lang === "string" && lang.trim().length ? lang.trim() : "python";
  }

  // Ensure code is always string if present
  if ("code" in normalizedPayload) {
    normalizedPayload.code = typeof normalizedPayload.code === "string" ? normalizedPayload.code : "";
  }

  return apiFetch<any>("CANDIDATE", `/assessment-sessions/${sessionId}/answers/${questionId}`, {
    method: "PUT",
    body: JSON.stringify({
      payload: normalizedPayload,
      isFinal: Boolean(body?.isFinal),
      isFlagged: typeof body?.isFlagged === "boolean" ? body.isFlagged : undefined,
    }),
  });
}



export async function listAnswers(sessionId: string) {
  const raw = await apiFetch<any>("CANDIDATE", `/assessment-sessions/${sessionId}/answers`);
  const arr = Array.isArray(raw?.answers) ? raw.answers : Array.isArray(raw) ? raw : [];
  return arr as SavedAnswerDTO[];
}

/**
 * POST /assessment-sessions/:sessionId/questions/:questionId/run
 * backend expects ONLY: { language, code }
 */
export async function runCoding(
  sessionId: string,
  questionId: string,
  body: { language: string; code: string },
) {
  const language =
    typeof body?.language === "string" && body.language.trim().length
      ? body.language.trim()
      : "python";

  const code = typeof body?.code === "string" ? body.code : "";

  return apiFetch<{ submission_id: string; status: string }>(
    "CANDIDATE",
    `/assessment-sessions/${sessionId}/questions/${questionId}/run`,
    { method: "POST", body: JSON.stringify({ language, code }) },
  );
}


export async function getSubmission(sessionId: string, submissionId: string) {
  const raw = await apiFetch<RunResultDTO>(
    "CANDIDATE",
    `/assessment-sessions/${sessionId}/submissions/${submissionId}`,
  );
  return normalizeRunResult(raw);
}

export async function ingestTelemetry(sessionId: string, body: { events: Array<Record<string, any>> }) {
  return apiFetch<any>("CANDIDATE", `/assessment-sessions/${sessionId}/telemetry`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * POST /assessment-sessions/:sessionId/submit
 * backend Zod expects: { reason: string|null }
 */
export async function submitSession(sessionId: string, reason?: string | null) {
  return apiFetch<any>("CANDIDATE", `/assessment-sessions/${sessionId}/submit`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

/**
 * POST /assessment-sessions/start
 * backend expects: { assessment_id }
 * returns: { session_id }
 */
export async function startSession(assessmentId: string) {
  const raw = await apiFetch<{ session_id: string }>("CANDIDATE", `/assessment-sessions/start`, {
    method: "POST",
    body: JSON.stringify({ assessment_id: assessmentId }),
  });
  return raw.session_id;
}

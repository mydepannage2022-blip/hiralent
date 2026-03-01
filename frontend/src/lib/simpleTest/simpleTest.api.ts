import { apiFetch } from "@/src/lib/api/apiClient";
import type {
  CandidateSimpleTestInvitesResponse,
  AcceptSimpleTestInviteResponse,
  StartAttemptResponse,
  GetAttemptDTO,
  SubmitSimpleTestResponse,
  SubmitAnswersPayload,
} from "@/src/types/simpleTest.types";

export type { SubmitAnswersPayload } from "@/src/types/simpleTest.types";

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

function toIso(v: unknown): string | null {
  if (!v) return null;
  try {
    const d =
      typeof v === "string"
        ? new Date(v)
        : v instanceof Date
        ? v
        : new Date(String(v));
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

function upper(v: unknown, fallback = ""): string {
  const s = String(v ?? fallback).trim();
  return s ? s.toUpperCase() : fallback;
}

/* -------------------------------------------------- */
/* UI Types                                           */
/* -------------------------------------------------- */

export type UiSimpleTestInvite = {
  inviteId: string;
  testId: string;
  applicationId: string;
  jobId: string;
  status: string;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  testTitle?: string | null;
  timeLimitMin?: number | null;
};

export type UiSimpleTestQuestion = {
  id: string;
  kind: "MCQ" | "CODING" | string;
  order?: number | null;
  title: string;
  difficulty?: string | null;
  skillTags?: string[] | null;
  type?: string | null;
  prompt?: string | null;
  options?: { id: string; text: string }[] | null;

  // coding fields
  testCases?: any[] | null;
  requiredLanguage?: string | null;
  allowedLanguages?: string[] | null;
  functionSignature?: string | null;
};

export type UiSimpleTestAttempt = {
  attempt_id: string;
  status: string;
  expires_at: string | null;
  score?: number | null;
  attempt_no?: number | null;
  submitted_at?: string | null;

  test: {
    title: string;
    description?: string | null;
    time_limit_min: number;
    questions: UiSimpleTestQuestion[];
  };
};

/* -------------------------------------------------- */
/* 🔥 INVITES API (THIS WAS MISSING)                 */
/* -------------------------------------------------- */

export async function listSimpleTestInvites(): Promise<UiSimpleTestInvite[]> {
  const res = await apiFetch<CandidateSimpleTestInvitesResponse>(
    "CANDIDATE",
    `/candidate/simple-test-invites`
  );

  return (res.invites ?? []).map((inv) => ({
    inviteId: inv.invite_id,
    testId: inv.test_id,
    applicationId: inv.application_id,
    jobId: inv.job_id,
    status: upper(inv.status, "PENDING"),
    expiresAt: toIso(inv.expires_at),
    acceptedAt: toIso(inv.accepted_at),
    jobTitle: inv.application?.job?.title ?? null,
    location: inv.application?.job?.location ?? null,
    testTitle: inv.test?.title ?? null,
    timeLimitMin: inv.test?.time_limit_min ?? null,
  }));
}

export async function acceptSimpleTestInvite(inviteId: string) {
  const res = await apiFetch<AcceptSimpleTestInviteResponse>(
    "CANDIDATE",
    `/candidate/simple-test-invites/${inviteId}/accept`,
    { method: "POST", body: JSON.stringify({}) }
  );

  return res.data;
}

export async function startSimpleTestAttempt(inviteId: string) {
  return apiFetch<StartAttemptResponse>(
    "CANDIDATE",
    `/candidate/simple-tests/start`,
    {
      method: "POST",
      body: JSON.stringify({ inviteId }),
    }
  );
}

/* -------------------------------------------------- */
/* ATTEMPT                                            */
/* -------------------------------------------------- */

export async function getSimpleTestAttempt(
  attemptId: string
): Promise<UiSimpleTestAttempt> {
  const res = await apiFetch<GetAttemptDTO>(
    "CANDIDATE",
    `/candidate/simple-tests/${attemptId}`
  );

  return {
    attempt_id: res.attempt_id,
    status: upper(res.status),
    expires_at: toIso(res.expires_at),
    score: (res as any).score ?? null,
    attempt_no: (res as any).attempt_no ?? null,
    submitted_at: toIso((res as any).submitted_at),

    test: {
      title: res.test.title,
      description: res.test.description ?? null,
      time_limit_min: Number(res.test.time_limit_min ?? 0),

      questions: (res.test.questions ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((q): UiSimpleTestQuestion => ({
          id: q.id,
          kind: upper(q.kind),
          order: q.order ?? null,
          title: q.title,
          difficulty: q.difficulty ?? null,
          skillTags: q.skillTags ?? null,
          type: q.type ?? null,
          prompt: q.prompt ?? null,

          options:
            upper(q.kind) === "MCQ"
              ? (q.options as any)
              : null,

          testCases:
            upper(q.kind) === "CODING"
              ? (q as any).testCases ?? null
              : null,

          requiredLanguage: (q as any).requiredLanguage ?? null,
          allowedLanguages: (q as any).allowedLanguages ?? null,
          functionSignature: (q as any).functionSignature ?? null,
        })),
    },
  };
}

/* -------------------------------------------------- */
/* SUBMIT                                             */
/* -------------------------------------------------- */

export async function submitSimpleTestAttempt(
  attemptId: string,
  answers: SubmitAnswersPayload
) {
  return apiFetch<SubmitSimpleTestResponse>(
    "CANDIDATE",
    `/candidate/simple-tests/${attemptId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    }
  );
}

/* -------------------------------------------------- */
/* RUNNER                                             */
/* -------------------------------------------------- */

export async function runSimpleTestCode(params: {
  attemptId: string;
  questionId: string;
  language: string;
  code: string;
}): Promise<{
  submissionId?: string;
  submission_id?: string;
}> {
  return apiFetch<{
    submissionId?: string;
    submission_id?: string;
  }>(
    "CANDIDATE",
    `/candidate/simple-tests/${params.attemptId}/run`,
    {
      method: "POST",
      body: JSON.stringify({
        questionId: params.questionId,
        language: params.language,
        code: params.code,
      }),
    }
  );
}


export async function getSimpleTestSubmission(submissionId: string) {
  return apiFetch(
    "CANDIDATE",
    `/candidate/simple-tests/submissions/${submissionId}`
  );
}

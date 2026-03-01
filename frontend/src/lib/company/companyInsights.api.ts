// src/lib/companyInsights/companyInsights.api.ts
import { apiFetch } from "@/src/lib/api/apiClient";

const AUD = "COMPANY" as const;

export type CompletedSessionDTO = {
  session_id: string;
  assessment_id?: string | null;
  status: string;
  submitted_at?: string | null;
  overall_score?: number | null;
};

export type UiCompletedSession = {
  sessionId: string;
  assessmentId?: string | null;
  status: string;
  submittedAt?: string | null;
  overallScore?: number | null;
};

export async function getCompletedForCandidate(candidateId: string): Promise<UiCompletedSession[]> {
  const r = await apiFetch<{ candidateId: string; completed: CompletedSessionDTO[] }>(
    AUD,
    `/candidates/${candidateId}/assessments/completed`,
  );

  return (r.completed ?? []).map((s) => ({
    sessionId: s.session_id,
    assessmentId: s.assessment_id ?? null,
    status: s.status,
    submittedAt: s.submitted_at ?? null,
    overallScore: s.overall_score ?? null,
  }));
}

export type AssessmentCandidatesAnalyticsDTO = {
  assessmentId: string;
  candidates: {
    candidateId: string;
    candidateName: string;
    sessionId: string;
    overallScore?: number | null;
    skillLevel?: string | null;
    submittedAt?: string | null;
  }[];
  kpis?: {
    total?: number;
    completed?: number;
    passRate?: number;
    avgScore?: number;
  };
};

export async function getAssessmentCandidatesAnalytics(assessmentId: string) {
  // backend returns DTO directly (no {success,data})
  return apiFetch<AssessmentCandidatesAnalyticsDTO>(
    AUD,
    `/assessments/${assessmentId}/analytics/candidates`,
  );
}

export type SessionAnalyticsDTO = {
  sessionId: string;
  candidateId: string;
  candidateName?: string | null;

  overallScore?: number | null;
  skillLevel?: string | null;

  radar?: { label: string; score: number }[];

  questions?: {
    questionId: string;
    type: "MCQ" | "CODING" | string;
    title: string;
    isCorrect?: boolean | null;
    score?: number | null;
    candidateAnswer?: any;
    correctAnswer?: any;
    expected?: string | null;
    actual?: string | null;
    explanation?: string | null;
    diff?: any;
  }[];

  telemetrySummary?: any;
};

export async function getSessionAnalytics(sessionId: string) {
  return apiFetch<SessionAnalyticsDTO>(AUD, `/assessment-sessions/${sessionId}/analytics`);
}

export async function getSessionInsight(sessionId: string) {
  return apiFetch<any>(AUD, `/assessment-sessions/${sessionId}/insight`);
}

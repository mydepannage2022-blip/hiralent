import { apiFetch } from "@/src/lib/api/apiClient";
import type {
  CandidateAssessmentHistoryResponseDTO,
  UiCandidateAssessmentHistoryItem,
} from "@/src/types/candidate.assessmentHistory.types";

export async function getCandidateAssessmentHistory(): Promise<UiCandidateAssessmentHistoryItem[]> {
  const r = await apiFetch<CandidateAssessmentHistoryResponseDTO>(
    "CANDIDATE",
    `/candidate/assessment-history`,
  );

  return (r.items ?? []).map((it) => ({
    sessionId: it.session.session_id,
    status: it.session.status,
    startedAt: it.session.started_at ?? null,
    submittedAt: it.session.submitted_at ?? null,

    assessmentId: it.assessment?.assessment_id ?? null,
    title: it.assessment?.title ?? null,
    difficulty: it.assessment?.difficulty ?? null,
    skillCategory: it.assessment?.skill_category ?? null,
    totalQuestions: it.assessment?.total_questions ?? null,
    timeLimit: it.assessment?.time_limit ?? null,
  }));
}

export type CandidateAssessmentHistoryItemDTO = {
  session: {
    session_id: string;
    status: string;
    started_at?: string | null;
    submitted_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    current_index?: number | null;
  };
  assessment: {
    assessment_id: string;
    title?: string | null;
    time_limit?: number | null;
    total_questions?: number | null;
    skill_category?: string | null;
    difficulty?: string | null;
  } | null;
};

export type CandidateAssessmentHistoryResponseDTO = {
  ok: true;
  items: CandidateAssessmentHistoryItemDTO[];
};

export type UiCandidateAssessmentHistoryItem = {
  sessionId: string;
  status: string;
  startedAt?: string | null;
  submittedAt?: string | null;

  assessmentId?: string | null;
  title?: string | null;
  difficulty?: string | null;
  skillCategory?: string | null;
  totalQuestions?: number | null;
  timeLimit?: number | null;
};

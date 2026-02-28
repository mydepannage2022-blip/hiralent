/**Session DTOs:

CreateSessionInput

SessionView

SessionQuestionView

SessionProgress

SubmitSessionInput */
export type AssessmentSessionStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "ABANDONED";

export type CreateSessionInput = {
  assessment_id: string; // EmployerAssessment.assessment_id
};

export type SessionQuestionView = {
  question_id: string;
  order: number;
  points: number;
  section?: string | null;
  type: "MCQ" | "CODING" | string;

  title?: string | null;
  description?: string | null;
  problemStatement?: string | null;
  difficulty?: string | null;
  skillTags?: string[];

  // MCQ only
  options?: unknown | null;

  // diagram
  hasDiagram?: boolean;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;
};

export type SessionProgress = {
  total: number;
  answered: number;
  flagged: number;
  current_index: number;
};

export type SessionView = {
  session_id: string;
  assessment_id: string;
  candidate_id: string;
  status: AssessmentSessionStatus;

  started_at: string; // ISO
  expires_at: string; // ISO
  submitted_at?: string | null;

  time_limit_minutes: number;
  remaining_seconds: number;

  current_index: number;
  progress: SessionProgress;
};

export type NavigationInput = {
  current_index: number; // 0-based
};

export type SubmitSessionInput = {
  // optional metadata (front can send)
  reason?: "USER_SUBMIT" | "AUTO_SUBMIT" | "TIME_EXPIRED";
};

// src/types/assessment.types.ts

export type AssessmentSessionStatus = "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | string;

export type AssessmentSessionDTO = {
  session_id: string;
  assessment_id: string;
  candidate_id: string;
  status: AssessmentSessionStatus;

  started_at?: string | null;
  expires_at?: string | null;
  submitted_at?: string | null;

  time_limit_minutes?: number | null;
  remaining_seconds?: number | null;

  current_index?: number | null;

  progress?: {
    total?: number;
    answered?: number;
    flagged?: number;
    current_index?: number;
  } | null;
};

export type AssessmentQuestionDTO = {
  question_id: string;
  type: "coding" | "mcq" | string;

  title: string;
  difficulty?: "easy" | "medium" | "hard" | string;

  description?: string | null;
  problemStatement?: string | null;

  options?: { id: string; text: string }[] | null;

  skillTags?: string[] | null;

  hasDiagram?: boolean | null;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;

  order?: number | null;
  points?: number | null;
  section?: string | null;
};

export type SavedAnswerDTO = {
  question_id: string;
  selected_option_id?: string | null;
  code?: string | null;
  language?: string | null;
  updated_at?: string | null;
};

export type RunResultTestDTO = {
  input?: string | null;
  expected?: string | null;
  output?: string | null;
  stderr?: string | null;
  passed?: boolean | null;
  durationMs?: number | null;
  memKb?: number | null;
};

export type RunResultDTO = {
  submission_id: string;
  status: string;
  score?: number | null;

  runtime_ms?: number | null;
  memory_kb?: number | null;

  result?: {
    score?: number | null;
    total?: number | null;
    passedCount?: number | null;

    runner?: {
      stderr?: string | null;
      stdout?: string | null;
      results?: RunResultTestDTO[];
      totalTests?: number | null;
      totalPassed?: number | null;
      memoryKb?: number | null;
      runtimeMs?: number | null;
      exitCode?: number | null;
      submissionId?: string | null;
    };

    results?: RunResultTestDTO[];

    plagiarism?: {
      evidence?: { url?: string | null; source?: string; snippet?: string; similarity?: number }[];
      webScore?: number | null;
      finalScore?: number | null;
      staticScore?: number | null;
      dynamicScore?: number | null;
    };

    submissionId?: string | null;
  };

  error?: any;
  created_at?: string;
  ended_at?: string;
};

/* =========================
   UI shapes (stables)
========================= */

export type UiSession = {
  sessionId: string;
  assessmentId: string;
  candidateId: string;
  status: string;

  startedAt?: string | null;
  expiresAt?: string | null;
  submittedAt?: string | null;

  timeLimitMinutes?: number | null;
  remainingSeconds?: number | null;

  currentIndex?: number | null;
  progress?: AssessmentSessionDTO["progress"];
};

export type UiQuestion = {
  questionId: string;
  type: "CODING" | "MCQ" | string;

  title: string;
  difficulty?: string;

  statement?: string | null;
  constraints?: string[] | null;
  examples?: { input: string; output: string; explanation?: string | null }[] | null;

  choices?: { id: string; text: string }[] | null;

  skillTags?: string[] | null;
  functionSignature?: string | null;
  timeLimitSec?: number | null;
};

export type UiRunResult = {
  status: string;
  score: number;
  total: number;
  passed: number;

  stdout?: string | null;
  stderr?: string | null;

  results: Array<{
    input?: string | null;
    expected?: string | null;
    output?: string | null;
    stderr?: string | null;
    passed?: boolean | null;
    durationMs?: number | null;
    memKb?: number | null;
  }>;

  plagiarism?: any;
  raw: RunResultDTO;
};

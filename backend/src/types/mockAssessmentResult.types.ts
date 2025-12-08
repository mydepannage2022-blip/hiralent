export interface MockAssessmentResultPayload {
  employerAssessmentId: string;
  candidateId: string;
  jobId?: string | null;

  // scoring
  overallScore: number;          // 0–100
  skillLevel: string;            // "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
  categoryScores: Record<string, number>; // { "Power BI": 88, "SQL": 75 }

  totalQuestions?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  totalTimeSeconds?: number;
}

// Enums (should match Prisma schema)
export enum AssessmentType {
  QUICK_CHECK = 'QUICK_CHECK',
  COMPREHENSIVE = 'COMPREHENSIVE',
  CERTIFICATION = 'CERTIFICATION',
  COMPANY_SPECIFIC = 'COMPANY_SPECIFIC',
}

export enum AssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum QuestionType {
  MCQ = 'MCQ',
  CODING = 'CODING',
  ESSAY = 'ESSAY',
  TRUE_FALSE = 'TRUE_FALSE',
  SCENARIO = 'SCENARIO',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

// Assessment Start Params
export interface StartAssessmentParams {
  candidateId: string;
  skillCategory: string;
  assessmentType: AssessmentType;
  difficulty: DifficultyLevel;
}

// AI-Generated Question
export interface AIGeneratedQuestion {
  questionId: string;
  questionText: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficulty?: DifficultyLevel;
  timeLimit?: number;
  aiGenerated?: boolean;
  adaptedReason?: string;
}

// Question for service/controller
export interface Question extends AIGeneratedQuestion {}

// Answer Evaluation Params
export interface AnswerEvaluationParams {
  question: string;
  userAnswer: string;
  expectedAnswer?: string;
  questionType: QuestionType;
  skillCategory: string;
}

// AI Evaluation Result
export interface AIEvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  confidence: number;
  isCorrect?: boolean;
}

// Assessment Result (per question)
export interface AssessmentResult {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  expectedAnswer?: string;
  userAnswer: string;
  isCorrect?: boolean;
  partialScore?: number;
  timeTaken: number;
  aiEvaluation?: AIEvaluationResult;
  feedback?: string;
  answeredAt: string;
}

// Assessment History
export interface AssessmentHistory {
  assessments: Array<{
    assessmentId: string;
    skillCategory: string;
    overallScore: number;
    skillLevel: string;
    completedAt: string;
    improvement?: string;
  }>;
  skillProgress: Record<string, {
    currentLevel: string;
    trend: string;
    lastScore: number;
    previousScore?: number;
  }>;
}

// Assessment Report (AI-generated)
export interface AssessmentReport {
  skillLevel: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  careerSuggestions: string[];
  marketReadiness: string;
  confidenceScore?: number;
  salaryRange?: string;
}

// Skill Recommendation
export interface SkillRecommendation {
  skillCategory: string;
  reason: string;
  difficulty: DifficultyLevel;
  estimatedTime: string;
  marketValue: string;
}

// Service method signatures
export interface IAssessmentService {
  startAssessment(params: StartAssessmentParams): Promise<any>;
  getNextQuestion(assessmentId: string): Promise<Question>;
  submitAnswer(params: any): Promise<any>;
  completeAssessment(assessmentId: string): Promise<any>;
  getAssessmentResults(assessmentId: string): Promise<any>;
  getAssessmentHistory(candidateId: string): Promise<AssessmentHistory>;
}

export interface IAIAssessmentService {
  generateQuestions(params: any): Promise<Question[]>;
  evaluateAnswer(params: AnswerEvaluationParams): Promise<AIEvaluationResult>;
  adjustDifficulty(params: any): Promise<DifficultyLevel>;
  generateReport(params: any): Promise<AssessmentReport>;
}

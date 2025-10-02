// frontend/src/lib/assessment.types.ts

export interface Question {
  questionId: string;
  questionText: string;
  type: 'MCQ' | 'CODING' | 'ESSAY' | 'TRUE_FALSE' | 'SCENARIO' | 'SHORT_ANSWER'; 
  options?: QuestionOption[];
  timeLimit: number; // in seconds
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category: string;
  correctAnswer?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  success: boolean;
  data: {
    question: Question;
    currentIndex: number;
    totalQuestions: number;
    hasNext: boolean;
  };
  message?: string;
}

export interface SubmitAnswerRequest {
  questionId: string;
  answer: string;
  timeTaken: number; // in seconds
}

export interface SubmitAnswerResponse {
  success: boolean;
  data: {
    isCorrect: boolean;
    score: number;
    feedback: string;
    nextQuestion?: Question;
    isLastQuestion: boolean;
    currentIndex: number;
  };
  message?: string;
}

export interface StartAssessmentRequest {
  skillCategory: string;
  assessmentType: 'QUICK_CHECK' | 'COMPREHENSIVE';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export interface StartAssessmentResponse {
  success: boolean;
  data: {
    assessmentId: string;
    skillCategory: string;        
    assessmentType: string;       
    totalQuestions: number;
    timeLimit: number;            
    status: string;               
    firstQuestion: {              
      questionId: string;
      questionText: string;
      type: string;
      options?: string[];
      timeLimit: number;
    };
  };
  message?: string;
}

export interface AssessmentProgress {
  success: boolean;
  data: {
    assessmentId: string;
    currentQuestion: number;
    totalQuestions: number;
    answeredQuestions: number;
    timeElapsed: number; // in seconds
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  };
  message?: string;
}

export interface CompleteAssessmentResponse {
  success: boolean;
  data: {
    assessmentId: string;
    status: string;
    overallScore: number;
    skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    completedAt: string;
    nextSteps: {
      jobMatching: string;
      detailedResults: string;
    };
  };
  message?: string;
}

export interface AssessmentResults {
  success: boolean;
  data: {
    assessmentId: string;
    skillCategory: string;
    overallScore: number;
    skillLevel: string;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number; // in seconds
    completedAt: string;
    questions: QuestionResult[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  message?: string;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  timeTaken: number;
  feedback: string;
  difficulty: string;
  category: string;
}

// ==================== FIXED: BACKEND COMPATIBLE HISTORY ====================

export interface AssessmentHistory {
  success: boolean;
  data: {
    assessments: HistoryItem[];
    skillProgress: Record<string, SkillProgress>;
    total: number;
    summary?: {  // ✅ ADD this
      totalAssessments: number;
      uniqueSkills: number;
      averageScore: number;
      totalTimeSpent: number;
    };
  };
}

export interface HistoryItem {
  assessmentId: string;
  skillCategory: string;
  overallScore: number;
  skillLevel: string;
  completedAt: string;
  improvement?: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  difficulty?: string;
  provider?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  confidenceScore?: number;
}


export interface SkillProgress {
  currentLevel: string;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  lastScore: number;
  previousScore?: number;
  totalAttempts: number;
  bestScore: number;
  averageScore: number;
}

// ==================== SKILL RECOMMENDATIONS ====================

export interface SkillRecommendations {
  success: boolean;
  data: {
    recommendations: SkillRecommendation[];
    totalSkills: number;
    nextAssessments: string[];
  };
  message?: string;
}

export interface SkillRecommendation {
  skillName: string;
  category: string;
  currentLevel: string;
  recommendedLevel: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  resources: RecommendationResource[];
  estimatedTime: string; // e.g., "2-3 weeks"
  jobMarketDemand: 'high' | 'medium' | 'low';
}

export interface RecommendationResource {
  type: 'course' | 'tutorial' | 'documentation' | 'practice' | 'book';
  title: string;
  url?: string;
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ==================== CONTEXT STATE ====================

export interface AssessmentState {
  currentAssessment: CurrentAssessment | null;
  assessmentHistory: HistoryItem[];
  skillRecommendations: SkillRecommendation[];
  loading: boolean;
  error: string | null;
  currentQuestion: Question | null;
}

export interface CurrentAssessment {
  assessmentId: string;
  skillCategory: string;
  assessmentType: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  timeElapsed: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
}

// ==================== ERROR TYPES ====================

export interface AssessmentError {
  success: false;
  error: string;
  message: string;
  code?: string;
}

// ==================== SECURITY TYPES ====================

export interface SecurityViolation {
  id: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'COPY_PASTE' | 'RIGHT_CLICK' | 'DEV_TOOLS' | 'INACTIVE_TIME';
  message: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}
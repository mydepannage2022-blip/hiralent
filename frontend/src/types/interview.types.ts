// ==================== Enums ====================

export enum AIInterviewStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum AIQualification {
  QUALIFIED = 'QUALIFIED',
  NOT_QUALIFIED = 'NOT_QUALIFIED',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

// ==================== Interview Question ====================

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  type: 'behavioral' | 'technical' | 'situational' | 'competency' | 'followup';
  category: string;
  expectedTopics?: string[];
  followUpTo?: string;
  order: number;
  askedAt?: string;
}

// ==================== Candidate Response ====================

export interface CandidateResponse {
  questionId: string;
  responseText: string;
  responseAudioUrl?: string;
  duration: number;
  timestamp: string;
  analysis?: ResponseAnalysis;
}

export interface ResponseAnalysis {
  relevanceScore: number;
  completenessScore: number;
  clarityScore: number;
  topicsCovered: string[];
  keyPoints: string[];
  concerns: string[];
  strengths: string[];
  sentiment?: {
    confidence: ConfidenceLevel;
    tone: EmotionalTone;
    engagement: EngagementLevel;
    clarity: CommunicationClarity;
    notes?: string;
  };
}

// ==================== Sentiment Analysis ====================

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type EmotionalTone = 'enthusiastic' | 'confident' | 'neutral' | 'nervous' | 'hesitant' | 'uncertain';
export type EngagementLevel = 'highly_engaged' | 'moderately_engaged' | 'disengaged';
export type CommunicationClarity = 'clear' | 'somewhat_clear' | 'unclear';

export interface SentimentPerResponse {
  questionId: string;
  confidence: ConfidenceLevel;
  tone: EmotionalTone;
  engagement: EngagementLevel;
  clarity: CommunicationClarity;
  notes?: string;
}

export interface OverallSentiment {
  confidence: ConfidenceLevel;
  tone: EmotionalTone;
  engagement: EngagementLevel;
  consistency: 'consistent' | 'variable' | 'declining';
}

export interface SentimentAnalysis {
  overall: OverallSentiment;
  perResponse: SentimentPerResponse[];
  summary: string;
}

// ==================== Soft Skills ====================

export interface SoftSkillScore {
  skill: string;
  score: number;
  evidence: string[];
  confidence: ConfidenceLevel;
}

export interface SoftSkillsAnalysis {
  communication: SoftSkillScore;
  problemSolving: SoftSkillScore;
  leadership: SoftSkillScore;
  teamwork: SoftSkillScore;
  adaptability: SoftSkillScore;
  criticalThinking: SoftSkillScore;
  overall: number;
}

// ==================== Final Evaluation ====================

export interface FinalEvaluation {
  qualification: AIQualification;
  overallScore: number;
  recommendation: string;
  strengths: string[];
  areasForImprovement: string[];
  fitScore: number;
  redFlags: string[];
  confidenceInAssessment: ConfidenceLevel;
}

// ==================== Transcript ====================

export interface TranscriptEntry {
  role: 'ai' | 'candidate';
  content: string;
  timestamp: string;
  questionId?: string;
  responseId?: string;
}

// ==================== API Request/Response Types ====================

// Assign Interview (Recruiter)
export interface AssignInterviewRequest {
  candidateId: string;
  applicationId: string;
  jobId: string;
  interviewType?: string;
  scheduledDate: string; // ISO date string
  softSkillWeight?: number; // 0–100, defaults to 70
}

// Start Interview Response
export interface InterviewSessionResponse {
  interviewId: string;
  status: AIInterviewStatus;
  currentQuestion?: InterviewQuestion;
  progress: {
    questionsAsked: number;
    totalQuestions: number;
  };
  startedAt?: string;
}

// Submit Response Request
export interface SubmitResponseRequest {
  questionId: string;
  responseText: string;
  responseDuration?: number;
}

// ==================== List Item Types ====================

// Candidate's view of their assigned interviews
export interface CandidateInterviewListItem {
  interviewId: string;
  status: AIInterviewStatus;
  interviewType: string;
  scheduledDate?: string;
  jobTitle: string;
  companyName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// Recruiter's view of interviews they've assigned
export interface RecruiterInterviewListItem {
  interviewId: string;
  status: AIInterviewStatus;
  interviewType: string;
  scheduledDate?: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  qualification?: AIQualification;
  overallScore?: number;
}

// ==================== Proctoring ====================

export type ViolationType = 'NO_FACE' | 'MULTIPLE_FACES' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'PHONE_DETECTED' | 'LOOKING_AWAY';

export interface CheatingEvent {
  type: ViolationType;
  timestamp: string;
  faceCount: number;
}

// ==================== Detailed Results (Recruiter Only) ====================

export interface InterviewDetailedResult {
  interviewId: string;
  status: AIInterviewStatus;
  qualification?: AIQualification;
  duration?: number;
  completedAt?: string;
  overallScore: number;
  softSkills: SoftSkillsAnalysis;
  sentiment: SentimentAnalysis;
  evaluation: FinalEvaluation;
  transcript: TranscriptEntry[];
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  cheatingEvents?: CheatingEvent[];
}

// ==================== API Response Wrapper ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

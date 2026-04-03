// Enums (should match Prisma schema)
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

// Confidence levels for sentiment analysis
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Emotional tone types
export type EmotionalTone = 'enthusiastic' | 'confident' | 'neutral' | 'nervous' | 'hesitant' | 'uncertain';

// Engagement levels
export type EngagementLevel = 'highly_engaged' | 'moderately_engaged' | 'disengaged';

// Communication clarity
export type CommunicationClarity = 'clear' | 'somewhat_clear' | 'unclear';

// Interview question types
export type InterviewQuestionType = 'behavioral' | 'technical' | 'situational' | 'competency' | 'followup';

// ==================== Interview Question ====================

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  type: InterviewQuestionType;
  category: string;              // e.g., "leadership", "problem-solving", "technical"
  expectedTopics?: string[];     // Topics the response should cover
  followUpTo?: string;           // If this is a follow-up, reference to original question
  order: number;
  askedAt?: Date;
}

// ==================== Candidate Response ====================

export interface CandidateResponse {
  questionId: string;
  responseText: string;          // Transcribed response
  responseAudioUrl?: string;     // URL to audio segment (if stored separately)
  duration: number;              // Response duration in seconds
  timestamp: Date;
  analysis?: ResponseAnalysis;
}

// ==================== Response Analysis ====================

export interface ResponseAnalysis {
  relevanceScore: number;        // 0-100: How relevant was the response to the question
  completenessScore: number;     // 0-100: Did they cover expected topics
  clarityScore: number;          // 0-100: How clear was the communication
  topicsCovered: string[];       // Which expected topics were addressed
  keyPoints: string[];           // Main points extracted from response
  concerns: string[];            // Any red flags or concerns
  strengths: string[];           // Positive aspects of the response
}

// ==================== Sentiment Analysis ====================

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
  consistency: 'consistent' | 'variable' | 'declining';  // Did sentiment change throughout?
}

export interface SentimentAnalysis {
  overall: OverallSentiment;
  perResponse: SentimentPerResponse[];
  summary: string;
}

// ==================== Soft Skills ====================

export interface SoftSkillScore {
  skill: string;
  score: number;                 // 0-100
  evidence: string[];            // Quotes/examples from responses
  confidence: ConfidenceLevel;
}

export interface SoftSkillsAnalysis {
  communication: SoftSkillScore;
  problemSolving: SoftSkillScore;
  leadership: SoftSkillScore;
  teamwork: SoftSkillScore;
  adaptability: SoftSkillScore;
  criticalThinking: SoftSkillScore;
  overall: number;               // Weighted average
}

// ==================== Transcript ====================

export interface TranscriptEntry {
  role: 'ai' | 'candidate';
  content: string;
  timestamp: Date;
  questionId?: string;           // Links to question if AI is asking
  responseId?: string;           // Links to response if candidate answering
}

// ==================== Final Evaluation ====================

export interface FinalEvaluation {
  qualification: AIQualification;
  overallScore: number;          // 0-100
  recommendation: string;        // Summary recommendation
  strengths: string[];
  areasForImprovement: string[];
  fitScore: number;              // 0-100: How well candidate fits the role
  redFlags: string[];            // Any serious concerns
  confidenceInAssessment: ConfidenceLevel;
}

// ==================== Interview Session ====================

export interface CreateInterviewParams {
  candidateId: string;
  applicationId: string;
  jobId?: string;
  interviewType: string;         // e.g., "screening", "technical", "behavioral"
}

// Recruiter assigns interview to candidate
export interface AssignInterviewParams {
  recruiterId: string;           // Recruiter/admin assigning the interview
  candidateId: string;
  applicationId: string;
  jobId: string;
  interviewType: string;
  scheduledDate: Date;           // When the interview is scheduled
  softSkillWeight?: number;      // % of soft skill questions (0-100), defaults to 70
}

export interface StartInterviewParams {
  interviewId: string;
  candidateId: string;
}

export interface SubmitResponseParams {
  interviewId: string;
  candidateId: string;
  questionId: string;
  responseText: string;
  responseDuration: number;
}

export interface EndInterviewParams {
  interviewId: string;
  candidateId: string;
}

// ==================== AI Generation Params ====================

export interface GenerateQuestionsParams {
  jobTitle: string;
  jobDescription?: string;
  requiredSkills: string[];
  experienceLevel: string;
  interviewType: string;
  questionCount: number;
  candidateProfile?: {
    skills: string[];
    experience: string[];
  };
}

export interface AnalyzeResponseParams {
  question: InterviewQuestion;
  response: string;
  jobContext: {
    jobTitle: string;
    requiredSkills: string[];
  };
}

export interface GenerateFollowUpParams {
  originalQuestion: InterviewQuestion;
  response: string;
  analysis: ResponseAnalysis;
}

export interface FinalEvaluationParams {
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  softSkills: SoftSkillsAnalysis;
  sentiment: SentimentAnalysis;
  jobContext: {
    jobTitle: string;
    requiredSkills: string[];
    jobDescription?: string;
  };
}

// ==================== API Response Types ====================

export interface InterviewSessionResponse {
  interviewId: string;
  status: AIInterviewStatus;
  currentQuestion?: InterviewQuestion;
  progress: {
    questionsAsked: number;
    totalQuestions: number;
  };
  startedAt?: Date;
}

export interface InterviewResultResponse {
  interviewId: string;
  status: AIInterviewStatus;
  qualification?: AIQualification;
  duration?: number;
  completedAt?: Date;
  // Note: Detailed scores are NOT exposed to candidates
}

// For internal/admin use only
export interface InterviewDetailedResult extends InterviewResultResponse {
  overallScore: number;
  softSkills: SoftSkillsAnalysis;
  sentiment: SentimentAnalysis;
  evaluation: FinalEvaluation;
  transcript: TranscriptEntry[];
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  cheatingEvents: any[];
}

// Candidate's view of their assigned interviews
export interface CandidateInterviewListItem {
  interviewId: string;
  status: AIInterviewStatus;
  interviewType: string;
  scheduledDate?: Date;
  jobTitle: string;
  companyName?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Recruiter's view of interviews they've assigned
export interface RecruiterInterviewListItem {
  interviewId: string;
  status: AIInterviewStatus;
  interviewType: string;
  scheduledDate?: Date;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  qualification?: AIQualification;
  overallScore?: number;
}

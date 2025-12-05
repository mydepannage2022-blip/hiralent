/**
 * Employer Assessment Types v2.1.0 (Backward Compatible)
 */

import {
  AssessmentType,
  DifficultyLevel,
  EmployerAssessmentStatus,
  AssessmentStatus,
} from "@prisma/client";

// ==================== ASSESSMENT CREATION METHODS ====================

export enum AssessmentCreationMethod {
  JOB_DESCRIPTION_PARSE = "JOB_DESCRIPTION_PARSE",
  CHATBOT_GUIDED = "CHATBOT_GUIDED",
  MANUAL = "MANUAL",
}

export interface JobDescriptionParseRequest {
  method: AssessmentCreationMethod.JOB_DESCRIPTION_PARSE;
  job_description: string;
  job_title?: string;
  auto_generate?: boolean;
}

export interface ChatbotGuidedRequest {
  method: AssessmentCreationMethod.CHATBOT_GUIDED;
  session_id?: string;
  initial_data?: {
    job_title?: string;
    job_description?: string;
    specific_requirements?: string[];
  };
}

export type AssessmentCreationRequest =
  | JobDescriptionParseRequest
  | ChatbotGuidedRequest;

// ==================== QUESTION RECOMMENDATIONS ====================

export interface QuestionRecommendation {
  category: string; // 'mcq' | 'coding' | ...
  count: number;
  difficulty: DifficultyLevel;
}

// ==================== UNIFIED SKILLS ANALYSIS ====================

export interface SkillsAnalysis {
  technical_skills: string[];
  domains: string[];
  tools_platforms: string[];

  soft_skills?: string[];

  experience_level: "entry" | "mid" | "senior" | "executive";
  job_complexity: "low" | "medium" | "high";
  confidence_score: number;

  primary_domain: string;

  key_technologies?: string[];

  question_recommendations: QuestionRecommendation[];

  job_type?: "full_time" | "part_time" | "contract" | "internship";
  education_level?: "high_school" | "bachelor" | "master" | "phd";
  remote_option?: "fully_remote" | "hybrid" | "office_only";
  department?: string;
  suggested_department?: string;
  education_recommendations?: string[];

  extractor_version?: string;
  extraction_timestamp?: string;
}

// ==================== ASSESSMENT-SPECIFIC DATA ====================

export interface EnhancedAssessmentData {
  technical_skills: string[];
  domains: string[];
  tools_platforms: string[];

  soft_skills?: string[];

  experience_level: "entry" | "mid" | "senior" | "executive";
  job_complexity: "low" | "medium" | "high";

  question_recommendations: QuestionRecommendation[];

  key_technologies?: string[];

  extractor_version?: string;
}

// ==================== SKILL EXTRACTION ====================

export interface SkillExtractionRequest {
  job_description: string;
  job_title?: string;
  job_type?: string;
  experience_level?: string;
  department?: string;
}

export interface SkillExtractionResponse extends SkillsAnalysis {}

// ==================== CHATBOT INTERFACES ====================

export enum AssessmentCreationStep {
  WELCOME = "welcome",
  JOB_DETAILS = "job_details",
  SKILLS_IDENTIFICATION = "skills_identification",
  ASSESSMENT_TYPE = "assessment_type",
  DIFFICULTY_LEVEL = "difficulty_level",
  QUESTION_TYPES = "question_types",
  TIME_SETTINGS = "time_settings",
  SCORING_SETTINGS = "scoring_settings",
  REVIEW = "review",
  COMPLETED = "completed",
}

export interface ChatbotMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: string | Date;
  metadata?: {
    current_step?: AssessmentCreationStep;
    [key: string]: any;
  };
}

/**
 * Mirrors Python ChatbotAssessmentData.
 */
export interface ChatbotAssessmentData {
  assessment_id?: string;

  job_title?: string;
  job_description?: string;
  specific_requirements?: string[];

  role_context?: string;
  role_details?: string;

  // ✅ Canonical skills the chatbot extracted
  technical_skills?: string[];

  // 🔍 Raw user text for debugging / traceability, not for UI display
  skills_raw_input?: string;

  domains?: string[];
  tools_platforms?: string[];
  skill_category?: string;

  // Optional: chatbot may already compute a list of extracted skills
  extracted_skills?: string[];

  assessment_type?: AssessmentType;
  difficulty?: DifficultyLevel;

  // 🔍 Raw user text about question mix (debug only)
  question_types_raw?: string;

  // Normalized categories, e.g. ["CODING", "MCQ"]
  question_categories?: string[];

  // Ratios used internally (optional)
  question_mix?: { [category: string]: number };

  // Final distribution used by generator / UI
  question_recommendations?: QuestionRecommendation[];

  time_limit?: number;
  total_questions?: number;
  passing_score?: number;

  status?: string;

  [key: string]: any;
}

export interface ChatbotSession {
  session_id: string;
  company_id: string;
  job_id?: string;
  messages: ChatbotMessage[];
  current_step: AssessmentCreationStep;
  created_at: string | Date;
  updated_at: string | Date;
  assessment_data?: ChatbotAssessmentData;
  method: AssessmentCreationMethod.CHATBOT_GUIDED;
}

// ==================== CANDIDATE SCORING (unchanged) ====================

export interface SkillScore {
  skill: string;
  score: number;
  confidence: number;
  questions_answered: number;
  questions_correct: number;
  time_spent: number;
}

export interface CategoryScore {
  category: string;
  score: number;
  time_spent: number;
  accuracy: number;
  total_questions: number;
  correct_answers: number;
}

export interface EmployerAssessment {
  assessment_id: string;
  company_id: string;
  job_id: string;
  title: string;
  description: string;
  status: EmployerAssessmentStatus;
  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;
  time_limit: number;
  total_questions: number;
  passing_score?: number;
  question_ids: string[];
  created_at: Date;
  updated_at: Date;
  enhanced_data?: EnhancedAssessmentData;
  auto_generated?: boolean;
  creation_method: AssessmentCreationMethod;
  extracted_skills: string[];

  job?: {
    title: string;
    location: string;
    status: string;
    experience_level?: string;
    job_type?: string;
    department?: string;
  };
  _count?: {
    candidateAssessments: number;
  };
}

export interface CreateEmployerAssessmentRequest {
  job_id: string;
  title: string;
  description: string;
  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;
  time_limit?: number;
  total_questions?: number;
  passing_score?: number;
  extracted_skills: string[];
  enhanced_data?: EnhancedAssessmentData;
  auto_generated?: boolean;
  creation_method: AssessmentCreationMethod;
  status?: EmployerAssessmentStatus;
  question_ids?: string[];
  settings?: any;
}

export interface AssessmentCandidateProgress {
  assessment_id: string;
  candidate_id: string;
  candidate_name: string;
  status: AssessmentStatus;

  overall_score?: number;
  skill_scores: SkillScore[];
  category_scores: CategoryScore[];

  started_at?: Date;
  completed_at?: Date;
  time_spent?: number;

  plagiarism_risk?: number;
  completion_percentage?: number;
}

// ==================== ASSESSMENT CREATION RESPONSE ====================

export interface AssessmentCreationResponse {
  assessment: EmployerAssessment;
  creation_method: AssessmentCreationMethod;
  chatbot_session?: ChatbotSession;
  generated_questions_count?: number;
  next_steps?: string[];
}

// ==================== MANAGEMENT ====================

export interface UpdateEmployerAssessmentRequest {
  assessment_id: string;
  company_id: string;

  title?: string;
  description?: string;
  status?: EmployerAssessmentStatus;
  job_id?: string;

  assessment_type?: AssessmentType;
  skill_category?: string;
  difficulty?: DifficultyLevel;
  time_limit?: number;
  total_questions?: number;
  passing_score?: number;

  extracted_skills?: string[];

  settings?: any;

  regenerate_with_chatbot?: boolean;
  chatbot_session_id?: string;
}

export interface DeleteEmployerAssessmentRequest {
  assessment_id: string;
  company_id: string;
}

export interface UpdateAssessmentResponse {
  assessment: EmployerAssessment;
  regenerated: boolean;
  chatbot_session?: ChatbotSession;
}

export interface DeleteAssessmentResponse {
  assessment_id: string;
  deleted: boolean;
  message: string;
}

export interface UpdateAssessmentStatusRequest {
  assessment_id: string;
  company_id: string;
  status: EmployerAssessmentStatus;
}

// ==================== HELPER CONSTANTS ====================

export const EXPERIENCE_TO_DIFFICULTY: Record<
  SkillsAnalysis["experience_level"],
  DifficultyLevel
> = {
  entry: "BEGINNER" as DifficultyLevel,
  mid: "INTERMEDIATE" as DifficultyLevel,
  senior: "ADVANCED" as DifficultyLevel,
  executive: "EXPERT" as DifficultyLevel,
};

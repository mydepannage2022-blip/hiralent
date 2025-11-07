import { AssessmentType, DifficultyLevel, EmployerAssessmentStatus, AssessmentStatus } from '@prisma/client';

// ==================== ASSESSMENT CREATION METHODS ====================

export enum AssessmentCreationMethod {
  JOB_DESCRIPTION_PARSE = 'job_description_parse',
  CHATBOT_GUIDED = 'chatbot_guided'
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

// ==================== UNIFIED SKILLS ANALYSIS ====================

export interface QuestionRecommendation {
  category: string;
  count: number;
  difficulty: DifficultyLevel;
}

export interface SkillsAnalysis {
  technical_skills: string[];
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  domains: string[];
  soft_skills: string[];
  tools_platforms: string[];
  confidence_score: number;
  job_complexity: 'low' | 'medium' | 'high';
  primary_domain: string;
  key_technologies: string[];
  question_recommendations: QuestionRecommendation[];
  
  job_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  education_level?: 'high_school' | 'bachelor' | 'master' | 'phd';
  remote_option?: 'fully_remote' | 'hybrid' | 'office_only';
  department?: string;
  suggested_department?: string;
  education_recommendations?: string[];
}

// ==================== ASSESSMENT-SPECIFIC DATA ====================

export interface EnhancedAssessmentData {
  technical_skills: string[];
  domains: string[];
  tools_platforms: string[];
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  job_complexity: 'low' | 'medium' | 'high';
  question_recommendations: QuestionRecommendation[];
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

// ==================== QUESTION GENERATION ====================

export interface QuestionGenerationRequest {
  technical_skills: string[];
  domains: string[];
  tools_platforms: string[];
  
  job_title: string;
  job_description: string;
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  job_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  department?: string;
  
  assessment_type: AssessmentType;
  difficulty: DifficultyLevel;
  question_categories: string[];
  
  time_limit: number;
  total_questions: number;
  
  company_domain?: string;
  specific_requirements?: string[];
  
  custom_weights?: { [skill: string]: number };
  exclude_categories?: string[];
}

// ==================== CHATBOT INTERFACES ====================

export enum AssessmentCreationStep {
  WELCOME = 'welcome',
  JOB_DETAILS = 'job_details',
  SKILLS_IDENTIFICATION = 'skills_identification',
  ASSESSMENT_TYPE = 'assessment_type',
  DIFFICULTY_LEVEL = 'difficulty_level',
  QUESTION_TYPES = 'question_types',
  TIME_SETTINGS = 'time_settings',
  REVIEW = 'review',
  COMPLETED = 'completed'
}

export interface ChatbotMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    assessment_data?: Partial<CreateEmployerAssessmentRequest>;
    extracted_skills?: string[];
    suggested_questions?: string[];
    current_step?: AssessmentCreationStep;
  };
}

export interface ChatbotSession {
  session_id: string;
  company_id: string;
  job_id?: string;
  messages: ChatbotMessage[];
  current_step: AssessmentCreationStep;
  created_at: Date;
  updated_at: Date;
  assessment_data?: Partial<CreateEmployerAssessmentRequest>;
  method: AssessmentCreationMethod.CHATBOT_GUIDED;
}

export interface ChatbotAssessmentData {
  job_title?: string;
  job_description?: string;
  extracted_skills: string[];
  assessment_type?: AssessmentType;
  difficulty?: DifficultyLevel;
  time_limit?: number;
  total_questions?: number;
  question_categories: string[];
  
  custom_weights?: { [skill: string]: number };
  specific_focus_areas?: string[];
  exclude_categories?: string[];
}

// ==================== CANDIDATE SCORING ====================

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

// ==================== CORE ASSESSMENT INTERFACES ====================

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
  question_ids: string[];
  created_at: Date;
  updated_at: Date;
  enhanced_data?: EnhancedAssessmentData;
  auto_generated?: boolean;
  creation_method: AssessmentCreationMethod;
  
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
  extracted_skills: string[];
  enhanced_data?: EnhancedAssessmentData;
  auto_generated?: boolean;
  creation_method: AssessmentCreationMethod;
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

// ==================== ASSESSMENT MANAGEMENT INTERFACES ====================

export interface UpdateEmployerAssessmentRequest {
  assessment_id: string;
  company_id: string; // For authorization
  
  // Only these fields can be updated
  title?: string;
  description?: string;
  status?: EmployerAssessmentStatus;
  
  // If job changes, we regenerate assessment
  job_id?: string;
  
  // Regenerate with chatbot - creates new session
  regenerate_with_chatbot?: boolean;
  chatbot_session_id?: string; // Continue existing or create new
}

export interface DeleteEmployerAssessmentRequest {
  assessment_id: string;
  company_id: string; // For authorization
}

export interface UpdateAssessmentResponse {
  assessment: EmployerAssessment;
  regenerated: boolean;
  chatbot_session?: ChatbotSession; // If regenerated via chatbot
}

export interface DeleteAssessmentResponse {
  assessment_id: string;
  deleted: boolean;
  message: string;
}
export type EmployerAssessmentStatus = 'DRAFT'|'ACTIVE'|'PAUSED'|'COMPLETED'|'ARCHIVED';
export type AssessmentCreationMethod = 'JOB_DESCRIPTION_PARSE'|'CHATBOT_GUIDED';

export interface CreateAssessmentFromJobInput {
  job_id: string;
  method: AssessmentCreationMethod;
  title?: string;
  description?: string;
  job_description?: string; // parse JD
  initial_prompt?: string;  // chat
}

// Template representation in the assessment templates library
// src/types/assessmentManagement.types.ts

export type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export type AssessmentType =
  | "QUICK_CHECK"
  | "COMPREHENSIVE"
  | "CERTIFICATION"
  | "COMPANY_SPECIFIC";

export type AssessmentTemplateProvider =
  | "INTERNAL"
  | "HACKERRANK"
  | "CODILITY"
  | "OTHER";

export type AssessmentTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface AssessmentTemplateListItemDTO {
  template_id: string;
  title: string;
  description: string;
  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;
  time_limit: number;
  total_questions: number;
  passing_score: number | null;
  extracted_skills: string[];
  tags: string[];
  provider: AssessmentTemplateProvider;
  status: AssessmentTemplateStatus;
  updated_at?: string;
}

export interface AssessmentTemplateDetailsDTO extends AssessmentTemplateListItemDTO {
  template_questions?: Array<{
    question_id: string;
    order: number;
    points: number;
    section?: string | null;
    isReserve?: boolean;
    // si ton backend renvoie + de détails
    question?: any;
  }>;
}

export interface CreateEmployerAssessmentFromTemplateInput {
  template_id: string;
  job_id: string;
}

export interface CreateEmployerAssessmentFromTemplateResponse {
  assessment_id: string;
}

export interface PaginatedTemplatesDTO {
  items: AssessmentTemplateListItemDTO[];
  page: number;
  limit: number;
  total: number;
}
export interface ApiOk<T> {
  status: "ok";
  result: T;
}
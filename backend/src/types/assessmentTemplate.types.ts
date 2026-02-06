import type {
  AssessmentTemplateProvider,
  AssessmentTemplateStatus,
  AssessmentType,
  DifficultyLevel,
} from "@prisma/client";
import type { EmployerAssessment } from "./employerAssessment.types";
/**
 * Filters for template list
 */
export type AssessmentTemplateListFilters = {
  q?: string; // search title/description
  status?: AssessmentTemplateStatus; // PUBLISHED, DRAFT, ARCHIVED
  provider?: AssessmentTemplateProvider; // INTERNAL, HACKERRANK, CUSTOM
  assessment_type?: AssessmentType;
  difficulty?: DifficultyLevel;
  skill_category?: string;
  tag?: string; // filter templates with this tag
  skill?: string; // filter templates with this extracted skill
  limit?: number; // default 20
  page?: number; // default 1
};

export type TemplateQuestionPreviewDTO = {
  // template join metadata
  order?: number;
  points: number;
  section?: string | null;
  isReserve: boolean;

  // the referenced Question (read-only)
  question: {
    id: string;
    title: string;
    description: string;
    problemStatement: string;
    difficulty: string; // easy|medium|hard (from Question table)
    type: string; // coding/mcq/...
    skillTags: string[];
  };
};

export type AssessmentTemplateListItemDTO = {
  template_id: string;
  title: string;
  description: string;

  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;

  time_limit: number;
  total_questions: number;
  passing_score?: number | null;

  extracted_skills: string[];
  tags: string[];
  provider: AssessmentTemplateProvider;
  status: AssessmentTemplateStatus;

  created_at: Date;
  updated_at: Date;

  // useful counts
  questions_count: number;
};

export type AssessmentTemplateDetailsDTO = AssessmentTemplateListItemDTO & {
  settings?: any;
  enhanced_data?: any;
  created_by?: string | null;

  questions: TemplateQuestionPreviewDTO[];
};

export type PaginatedTemplatesDTO = {
  items: AssessmentTemplateListItemDTO[];
  page: number;
  limit: number;
  total: number;
};

export type CreateEmployerAssessmentFromTemplateRequest = {
  template_id: string;
  job_id: string;

  /**
   * Optional overrides at creation time (you can keep UI simple and ignore these)
   * If omitted, we will use template.title/description.
   */
  title?: string;
  description?: string;
};

export type CreateEmployerAssessmentFromTemplateResponse = {
  assessment_id: string;
  template_id: string;
  job_id: string;
  company_id: string;

  /**
   * This returns the created EmployerAssessment with attached questions included.
   * Keep shape flexible: your existing EmployerAssessment mapper can be reused later.
   */
  assessment: any;
};

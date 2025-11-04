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

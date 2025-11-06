import { CreateAssessmentFromJobInput } from '@/src/types/assessmentManagement.types';
const BASE = '/api/v1/employer-assessments';

export const EmployerAssessmentsAPI = {
  createFromJob: async (p: CreateAssessmentFromJobInput) =>
    (await fetch(BASE, {
      method:'POST', credentials:'include',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        job_id: p.job_id,
        creation_method: p.method,   // Prisma enum expects UPPERCASE
        title: p.title,
        description: p.description,
        job_description: p.job_description,
        initial_prompt: p.initial_prompt
      })
    })).json(),
};

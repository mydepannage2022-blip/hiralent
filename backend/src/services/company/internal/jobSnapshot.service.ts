// src/services/company/internal/jobSnapshot.service.ts
import prisma from '../../../lib/prisma';


/**
 * Snapshot minimal et stable d'un Job pour le matching AI microservice.
 * ⚠️ Ici on prend uniquement les champs utiles pour:
 * - embedding job
 * - hard filters (experience/eligibility)
 * - ranking
 */
export async function getJobSnapshot(jobId: string) {
  const job = await prisma.companyJob.findUnique({
    where: { job_id: jobId },
    select: {
      job_id: true,
      company_id: true,
      status: true,

      title: true,
      description: true,
      location: true,
      required_skills: true,

      job_type: true,
      experience_level: true,
      education_level: true,
      remote_option: true,
      urgency_level: true,

      department: true,
      visa_sponsored: true,
      relocation_assistance: true,
      salary_range: true,

      screening_questions: true,

      min_profile_score: true,
      required_fields: true,

      application_deadline: true,
      max_applications: true,

      created_at: true,
      updated_at: true,

      jobVector: {
        select: {
          vector_id: true,
          qdrant_point_id: true,
          embedding_hash: true,
          provider: true,
          vector_version: true,
          status: true,
          indexed_at: true,
          last_attempt_at: true,
          last_error: true,
        },
      },
    },
  });

  return job; // peut être null => géré dans route
}

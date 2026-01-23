// src/services/candidate/internal/candidateSnapshot.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Snapshot Candidate pour matching.
 * - profil (CandidateProfile) si dispo
 * - skills + documents-derived skills
 * - completeness score (pour eligibility gate)
 * - candidateVector meta (hash/id) si dispo
 */
export async function getCandidateSnapshot(candidateId: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: candidateId },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      role: true,
      created_at: true,
      updated_at: true,

      candidateProfile: {
        select: {
          candidate_id: true,
          headline: true,
          about_me: true,
          location: true,
          city: true,
          preferred_locations: true,
          education: true,
          experience: true,
          languages: true,
          skills: true,
          resume_url: true,
          resume_application_url: true,
          video_intro_url: true,
          links: true,
          minimum_salary_amount: true,
          payment_period: true,
          profile_picture_url: true,
          updated_at: true,
        },
      },

      // skills structurés (si vous les utilisez)
      candidateSkills: {
        select: {
          skill_name: true,
          skill_category: true,
          proficiency: true,
          years_experience: true,
          is_verified: true,
          confidence_score: true,
          source_type: true,
          updated_at: true,
        },
      },

      profileCompleteness: {
        select: {
          overall_score: true,
          missing_fields: true,
          suggestions: true,
          last_calculated: true,
        },
      },

      candidateVectors: {
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

  return user; // peut être null => géré dans route
}

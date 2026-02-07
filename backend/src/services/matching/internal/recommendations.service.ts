// src/services/matching/internal/recommendations.service.ts
import { PrismaClient } from "@prisma/client";

type TriggerValue = "INTERVIEW_REQUIRED" | "ASSESSMENT_REQUIRED" | "NO_TRIGGER";

const triggerFromScore = (score: number): TriggerValue => {
  if (score >= 80) return "INTERVIEW_REQUIRED";
  if (score >= 60) return "ASSESSMENT_REQUIRED";
  return "NO_TRIGGER";
};

export class MatchingRecommendationsService {
  constructor(private prisma: PrismaClient) {}

  async upsertRecommendations(args: {
    candidate_id: string;
    items: Array<{
      job_id: string;
      match_score: number;
      skill_match: any;
      salary_match?: number | null;
      location_match?: number | null;
      experience_match?: number | null;
      ai_reasoning?: string | null;
      is_eligible?: boolean;
      reason_codes?: string[];
      missing_skills?: string[];
      vector_score?: number | null;
      trigger?: string | null;
      job_embedding_hash?: string | null;
      candidate_embedding_hash?: string | null;
    }>;
  }) {
    const { candidate_id, items } = args;

    console.log(`🔵 Service: Processing ${items.length} recommendations for candidate ${candidate_id}`);

    return this.prisma.$transaction(async (tx) => {
      // ✅ STEP 1: Validate that the candidate exists
      const candidateExists = await tx.user.findUnique({
        where: { user_id: candidate_id },
        select: { user_id: true }
      });

      if (!candidateExists) {
        // ⚠️ Don't throw - just log warning and skip gracefully
        console.warn(`⚠️ Candidate ${candidate_id} not found in database - skipping all recommendations`);
        return { 
          upserted: 0,
          skipped: items.length,
          skipped_job_ids: items.map(it => it.job_id),
          reason: 'candidate_not_found'
        };
      }

      // ✅ STEP 2: Get all job IDs that actually exist in the database
      const jobIds = items.map(it => it.job_id);
      const existingJobs = await tx.companyJob.findMany({
        where: { 
          job_id: { in: jobIds },
          status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] }
        },
        select: { job_id: true, status: true }
      });
      
      const existingJobIds = new Set(existingJobs.map(j => j.job_id));
      
      // ✅ STEP 3: Filter items to only those with valid job_ids
      const validItems = items.filter(it => existingJobIds.has(it.job_id));
      const skippedItems = items.filter(it => !existingJobIds.has(it.job_id));
      
      // ✅ STEP 4: Log skipped items
      if (skippedItems.length > 0) {
        console.warn(`⚠️ Skipping ${skippedItems.length}/${items.length} recommendations with non-existent jobs:`);
        skippedItems.forEach(it => {
          console.warn(`  ❌ Job ${it.job_id} does not exist in CompanyJob table`);
        });
      }
      
      if (validItems.length === 0) {
        console.warn(`⚠️ No valid recommendations to insert for candidate ${candidate_id}`);
        return { 
          upserted: 0,
          skipped: skippedItems.length,
          skipped_job_ids: skippedItems.map(it => it.job_id),
          reason: 'no_valid_jobs'
        };
      }

      console.log(`✅ Processing ${validItems.length} valid recommendations`);

      // ✅ STEP 5: Upsert only valid recommendations
      for (const it of validItems) {
        const eligible = it.is_eligible ?? false;

        const computedTrigger: TriggerValue =
          it.trigger
            ? (it.trigger as TriggerValue)
            : eligible
            ? triggerFromScore(it.match_score)
            : "NO_TRIGGER";

        console.log(`🔵 Upserting: candidate=${candidate_id}, job=${it.job_id}, score=${it.match_score}`);

        try {
          await tx.jobRecommendation.upsert({
            where: { candidate_id_job_id: { candidate_id, job_id: it.job_id } },
            update: {
              match_score: it.match_score,
              skill_match: it.skill_match,
              salary_match: it.salary_match ?? null,
              location_match: it.location_match ?? null,
              experience_match: it.experience_match ?? null,
              ai_reasoning: it.ai_reasoning ?? null,
              is_eligible: eligible,
              reason_codes: it.reason_codes ?? [],
              missing_skills: it.missing_skills ?? [],
              vector_score: it.vector_score ?? null,
              trigger: computedTrigger,
              job_embedding_hash: it.job_embedding_hash ?? null,
              candidate_embedding_hash: it.candidate_embedding_hash ?? null,
            },
            create: {
              candidate_id,
              job_id: it.job_id,
              match_score: it.match_score,
              skill_match: it.skill_match,
              salary_match: it.salary_match ?? null,
              location_match: it.location_match ?? null,
              experience_match: it.experience_match ?? null,
              ai_reasoning: it.ai_reasoning ?? null,
              is_eligible: eligible,
              reason_codes: it.reason_codes ?? [],
              missing_skills: it.missing_skills ?? [],
              vector_score: it.vector_score ?? null,
              trigger: computedTrigger,
              job_embedding_hash: it.job_embedding_hash ?? null,
              candidate_embedding_hash: it.candidate_embedding_hash ?? null,
            },
          });
          console.log(`✅ Successfully upserted recommendation for job ${it.job_id}`);
        } catch (err: any) {
          console.error(`❌ Failed to upsert recommendation for job ${it.job_id}:`, err.message);
          throw err;
        }
      }

      return { 
        upserted: validItems.length,
        skipped: skippedItems.length,
        skipped_job_ids: skippedItems.map(it => it.job_id)
      };
    });
  }
}
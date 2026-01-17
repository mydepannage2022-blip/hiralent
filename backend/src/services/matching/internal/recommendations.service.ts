import { PrismaClient } from "@prisma/client";

export class MatchingRecommendationsService {
  constructor(private prisma: PrismaClient) {}

  async upsertRecommendations(args: {
    candidate_id: string;
    items: Array<{
      job_id: string;
      match_score: number;
      skill_match: any; // Json
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

    return this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        await tx.jobRecommendation.upsert({
          where: { candidate_id_job_id: { candidate_id, job_id: it.job_id } }, // ✅ grâce à @@unique([candidate_id, job_id])
          update: {
            match_score: it.match_score,
            skill_match: it.skill_match,

            salary_match: it.salary_match ?? null,
            location_match: it.location_match ?? null,
            experience_match: it.experience_match ?? null,
            ai_reasoning: it.ai_reasoning ?? null,

            is_eligible: it.is_eligible ?? false,
            reason_codes: it.reason_codes ?? [],
            missing_skills: it.missing_skills ?? [],

            vector_score: it.vector_score ?? null,
            trigger: it.trigger ?? null,
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

            is_eligible: it.is_eligible ?? false,
            reason_codes: it.reason_codes ?? [],
            missing_skills: it.missing_skills ?? [],

            vector_score: it.vector_score ?? null,
            trigger: it.trigger ?? null,
            job_embedding_hash: it.job_embedding_hash ?? null,
            candidate_embedding_hash: it.candidate_embedding_hash ?? null,
          },
        });
      }

      return { upserted: items.length };
    });
  }
}

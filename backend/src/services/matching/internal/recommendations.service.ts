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
      skill_match: any; // Json

      salary_match?: number | null;
      location_match?: number | null;
      experience_match?: number | null;
      ai_reasoning?: string | null;

      is_eligible?: boolean;
      reason_codes?: string[];
      missing_skills?: string[];

      vector_score?: number | null;

      // optional if microservice sends it, else computed
      trigger?: string | null;

      job_embedding_hash?: string | null;
      candidate_embedding_hash?: string | null;
    }>;
  }) {
    const { candidate_id, items } = args;

    return this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        // ✅ 1) Compute trigger here (Node-side)
        const eligible = it.is_eligible ?? false;

        const computedTrigger: TriggerValue =
          it.trigger
            ? (it.trigger as TriggerValue)
            : eligible
            ? triggerFromScore(it.match_score)
            : "NO_TRIGGER";

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

            // ✅ important
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

            // ✅ important
            trigger: computedTrigger,

            job_embedding_hash: it.job_embedding_hash ?? null,
            candidate_embedding_hash: it.candidate_embedding_hash ?? null,
          },
        });
      }

      return { upserted: items.length };
    });
  }
}

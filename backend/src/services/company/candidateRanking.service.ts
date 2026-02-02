// src/services/company/candidateRanking.service.ts
import { PrismaClient } from "@prisma/client";

export class CandidateRankingService {
  constructor(private prisma: PrismaClient) {}

  async getRankedCandidatesForJob(args: {
    jobId: string;
    companyId: string;
    page?: number;
    limit?: number;
    eligible?: boolean;
  }) {
    const { jobId, companyId } = args;
    const page = args.page ?? 1;
    const limit = Math.min(args.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    // 1) Ownership check
    const job = await this.prisma.companyJob.findUnique({
      where: { job_id: jobId },
      select: { job_id: true, company_id: true },
    });

    if (!job) {
      const err: any = new Error("Job not found");
      err.statusCode = 404;
      throw err;
    }

    if (job.company_id !== companyId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    // 2) Fetch ranking from JobRecommendation
    const where: any = { job_id: jobId };
    if (args.eligible !== undefined) where.is_eligible = args.eligible;

    const [total, rows] = await Promise.all([
      this.prisma.jobRecommendation.count({ where }),
      this.prisma.jobRecommendation.findMany({
        where,
        orderBy: { match_score: "desc" },
        skip,
        take: limit,
        select: {
          candidate_id: true,
          match_score: true,
          vector_score: true,
          skill_match: true,
          is_eligible: true,
          reason_codes: true,
          missing_skills: true,
          trigger: true,
          updated_at: true,
          candidate: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              candidateProfile: {
                select: {
                  headline: true,
                  location: true,
                  profile_picture_url: true,
                },
              },
              // IMPORTANT: In your schema this is ProfileCompleteness[] (array), so take latest
              profileCompleteness: {
                orderBy: { created_at: "desc" },
                take: 1,
                select: { overall_score: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: rows.map((r) => ({
        candidate_id: r.candidate_id,
        match_score: r.match_score,
        vector_score: r.vector_score ?? null,
        skill_match: r.skill_match,
        is_eligible: r.is_eligible,
        reason_codes: r.reason_codes ?? [],
        missing_skills: r.missing_skills ?? [],
        trigger: r.trigger ?? null,
        updated_at: r.updated_at,
        candidate: {
          user_id: r.candidate.user_id,
          full_name: r.candidate.full_name,
          email: r.candidate.email,
          headline: r.candidate.candidateProfile?.headline ?? null,
          location: r.candidate.candidateProfile?.location ?? null,
          profile_picture_url:
            r.candidate.candidateProfile?.profile_picture_url ?? null,
          profile_score:
            r.candidate.profileCompleteness?.[0]?.overall_score ?? null,
        },
      })),
      page,
      limit,
      total,
      hasMore: skip + limit < total,
    };
  }
}

export default CandidateRankingService;

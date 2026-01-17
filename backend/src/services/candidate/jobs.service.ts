// src/services/candidate/jobs.service.ts
import { PrismaClient } from "@prisma/client";
import {
  EligibilityResult,
  JobListItemDTO,
  JobListQuery,
  PagedResult,
} from "../../types/candidate.jobs.types";
import {
  buildMissingFieldReasons,
  buildMissingSkillReasons,
  missing,
  normalize,
  safeArray,
  uniqNormalized,
} from "../../utils/eligibility.util";

export class CandidateJobsService {
  constructor(private prisma: PrismaClient) {}

  // ---------------------------------------------
  // A) Eligibility Gate (Hard filters)
  // ---------------------------------------------
  async computeEligibility(
    candidateId: string,
    jobId: string
  ): Promise<EligibilityResult> {
    const job = await this.prisma.companyJob.findUnique({
      where: { job_id: jobId },
      select: {
        job_id: true,
        status: true,
        required_skills: true,
        required_fields: true,
        min_profile_score: true,
      },
    });

    if (!job) {
      return {
        eligible: false,
        reasons: ["JOB_NOT_FOUND"],
        missingSkills: [],
        missingFields: [],
      };
    }

    if (job.status !== "ACTIVE") {
      return {
        eligible: false,
        reasons: ["JOB_NOT_ACTIVE"],
        missingSkills: [],
        missingFields: [],
      };
    }

    const [profile, completeness] = await Promise.all([
      this.prisma.candidateProfile.findUnique({
        where: { candidate_id: candidateId },
        select: {
          candidate_id: true,
          resume_url: true,
          headline: true,
          profile_picture_url: true,
          skills: true,
          about_me: true,
        },
      }),
      this.prisma.profileCompleteness.findUnique({
        where: { candidate_id: candidateId },
        select: { overall_score: true },
      }),
    ]);

    const reasons: string[] = [];
    const candidateSkills = uniqNormalized(safeArray(profile?.skills));

    // 1) Profile completeness / min score
    const profileScore = completeness?.overall_score;
    const minScore = job.min_profile_score ?? null;

    if (profileScore === undefined || profileScore === null) {
      reasons.push("PROFILE_NOT_READY");
    } else if (minScore !== null && profileScore < minScore) {
      reasons.push("LOW_PROFILE_SCORE");
    }

    // 2) Required fields
    const requiredFields = safeArray(job.required_fields);
    const missingFields: string[] = [];

    const fieldMap: Record<string, () => boolean> = {
      resume_url: () => !!profile?.resume_url,
      headline: () => !!profile?.headline,
      profile_picture_url: () => !!profile?.profile_picture_url,
      about_me: () => !!profile?.about_me,
    };

    for (const f of requiredFields) {
      const key = normalize(f);
      const checker = fieldMap[key];

      if (!checker) {
        // unknown rule => safer to block
        missingFields.push(f);
        reasons.push(`UNKNOWN_REQUIRED_FIELD:${f}`);
        continue;
      }

      if (!checker()) missingFields.push(f);
    }

    reasons.push(...buildMissingFieldReasons(missingFields));

    // 3) Skills gate
    const reqSkills = uniqNormalized(safeArray(job.required_skills));
    const missingSkills = missing(reqSkills, candidateSkills);
    reasons.push(...buildMissingSkillReasons(missingSkills));

    const eligible = reasons.length === 0;

    return {
      eligible,
      reasons,
      missingSkills,
      missingFields,
      profileScore: profileScore ?? undefined,
      minProfileScore: minScore,
    };
  }

  // ---------------------------------------------
  // B) Jobs list (non recommended)
  // - DB filters cheap
  // - eligibility computed per job (hard gate)
  // ---------------------------------------------
  async getJobs(
    candidateId: string,
    query: JobListQuery
  ): Promise<PagedResult<JobListItemDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { status: "ACTIVE" };

    if (query.level) where.experience_level = query.level;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.skills?.length) {
      // Postgres array filter
      where.required_skills = { hasSome: query.skills };
    }

    const [total, jobs] = await Promise.all([
      this.prisma.companyJob.count({ where }),
      this.prisma.companyJob.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        select: {
          job_id: true,
          title: true,
          location: true,
          experience_level: true,
          required_skills: true,
          status: true,
          min_profile_score: true,
          required_fields: true,
        },
      }),
    ]);

    const itemsWithEligibility: JobListItemDTO[] = await Promise.all(
      jobs.map(async (j) => {
        const eligibility = await this.computeEligibility(candidateId, j.job_id);
        return { ...j, eligibility };
      })
    );

    const filtered =
      query.eligible === undefined
        ? itemsWithEligibility
        : itemsWithEligibility.filter((x) => x.eligibility.eligible === query.eligible);

    return {
      items: filtered,
      page,
      limit,
      total,
      hasMore: skip + limit < total,
    };
  }

  // ---------------------------------------------
  // C) Recommended jobs
  // IMPORTANT:
  // - microservice fills JobRecommendation
  // - backend just reads it
  // - eligibility comes from stored fields OR fallback computeEligibility
  // ---------------------------------------------
  async getRecommendedJobs(
    candidateId: string,
    query: JobListQuery
  ): Promise<PagedResult<JobListItemDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { candidate_id: candidateId };

    const [total, recs] = await Promise.all([
      this.prisma.jobRecommendation.count({ where }),
      this.prisma.jobRecommendation.findMany({
        where,
        orderBy: { match_score: "desc" },
        skip,
        take: limit,
        select: {
          match_score: true,
          is_eligible: true,
          reason_codes: true,
          missing_skills: true,
          job: {
            select: {
              job_id: true,
              title: true,
              location: true,
              experience_level: true,
              required_skills: true,
              status: true,
              min_profile_score: true,
              required_fields: true,
            },
          },
        },
      }),
    ]);

    // Map stored eligibility from JobRecommendation (fast path)
    let items: JobListItemDTO[] = recs
      .filter((r) => r.job.status === "ACTIVE")
      .map((r) => ({
        ...r.job,
        match_score: r.match_score,
        eligibility: {
          eligible: r.is_eligible,
          reasons: safeArray(r.reason_codes),
          missingSkills: safeArray(r.missing_skills),
          missingFields: safeArray(r.reason_codes)
            .filter((x) => String(x).startsWith("MISSING_FIELD:"))
            .map((x) => String(x).split(":")[1])
            .filter(Boolean),
        },
      }));

    // Optional: if you want "always correct" hard gate, even if rec table is stale:
    // (costs more DB calls)
    // items = await Promise.all(
    //   items.map(async (it) => ({
    //     ...it,
    //     eligibility: await this.computeEligibility(candidateId, it.job_id),
    //   }))
    // );

    // filters
    if (query.eligible !== undefined) {
      items = items.filter((x) => x.eligibility.eligible === query.eligible);
    }

    if (query.level) {
      items = items.filter((x) => x.experience_level === query.level);
    }

    if (query.skills?.length) {
      const S = new Set(query.skills.map(normalize));
      items = items.filter((x) => x.required_skills?.some((sk) => S.has(normalize(sk))));
    }

    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          (x.location ?? "").toLowerCase().includes(q)
      );
    }

    return {
      items,
      page,
      limit,
      total,
      hasMore: skip + limit < total,
    };
  }

  // ---------------------------------------------
  // D) Apply gate + create application
  // ---------------------------------------------
  async applyToJob(
    candidateId: string,
    jobId: string,
    payload?: { cover_letter?: string }
  ) {
    // Hard gate ALWAYS computed live (safer)
    const eligibility = await this.computeEligibility(candidateId, jobId);

    if (!eligibility.eligible) {
      const err: any = new Error("Not eligible to apply");
      err.statusCode = 403;
      err.details = eligibility;
      throw err;
    }

    return this.prisma.jobApplication.create({
      data: {
        candidate_id: candidateId,
        job_id: jobId,
        cover_letter: payload?.cover_letter,
      },
      select: {
        application_id: true,
        status: true,
        applied_at: true,
        job_id: true,
        candidate_id: true,
      },
    });
  }
}

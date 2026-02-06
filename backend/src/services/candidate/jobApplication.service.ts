import {
  PrismaClient,
  JobApplicationStatus,
  JobApplicationEventType,
  NotificationAudience,
  NotificationType,
  JobApplicationEventStatus,
} from "@prisma/client";

import { NotificationService } from "../notification.service";

type TriggerValue = "INTERVIEW_REQUIRED" | "ASSESSMENT_REQUIRED" | "NO_TRIGGER";

const triggerFromScore = (score: number): TriggerValue => {
  if (score >= 80) return "INTERVIEW_REQUIRED";
  if (score >= 60) return "ASSESSMENT_REQUIRED";
  return "NO_TRIGGER";
};

const safeSkillsArray = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
        return [];
      } catch {
        return [];
      }
    }
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

export class JobApplicationService {
  private notifications: NotificationService;

  constructor(private prisma: PrismaClient) {
    this.notifications = new NotificationService(prisma);
  }

  /**
   * Apply to a job (A4)
   * - Validate profile readiness + required skills
   * - Create JobApplication(APPLIED)
   * - Store per-application scoring snapshot (A5)
   * - Create outbox events for status transitions (A4)
   * - Create notification (A6)
   */
  async applyToJob(args: { candidateId: string; jobId: string; coverLetter?: string }) {
    const { candidateId, jobId, coverLetter } = args;

    // 1) Load job + candidate readiness + candidate skills
    const [job, prof, candProfile] = await Promise.all([
      this.prisma.companyJob.findUnique({
        where: { job_id: jobId },
        select: {
          job_id: true,
          title: true,
          status: true,
          required_skills: true,
          min_profile_score: true,
          required_fields: true,
        },
      }),
      this.prisma.profileCompleteness.findUnique({
        where: { candidate_id: candidateId },
        select: { overall_score: true, missing_fields: true },
      }),
      this.prisma.candidateProfile.findUnique({
        where: { candidate_id: candidateId },
        select: { skills: true, resume_url: true, headline: true },
      }),
    ]);

    if (!job) {
      const err: any = new Error("Job not found");
      err.statusCode = 404;
      throw err;
    }

    if (job.status !== "ACTIVE") {
      const err: any = new Error("Job is not active");
      err.statusCode = 400;
      throw err;
    }

    // 2) Validate "profile ready"
    const minScore = job.min_profile_score ?? 0;
    const overallScore = prof?.overall_score ?? 0;

    if (overallScore < minScore) {
      const err: any = new Error(`Profile not ready (score ${overallScore} < ${minScore})`);
      err.statusCode = 400;
      err.reason_codes = ["PROFILE_NOT_READY"];
      throw err;
    }

    // required_fields check (read-only)
    const requiredFields = job.required_fields ?? [];
    const missingFields: string[] = [];

    for (const f of requiredFields) {
      if (f === "resume_url" && !candProfile?.resume_url) missingFields.push("resume_url");
      if (f === "headline" && !candProfile?.headline) missingFields.push("headline");
      // add others if needed
    }

    if (missingFields.length) {
      const err: any = new Error(`Missing required fields: ${missingFields.join(", ")}`);
      err.statusCode = 400;
      err.reason_codes = missingFields.map((m) => `MISSING_FIELD:${m}`);
      throw err;
    }

    // 3) Validate required skills exist
    const candidateSkills = safeSkillsArray(candProfile?.skills).map((s) => s.toLowerCase());
    const requiredSkills = (job.required_skills ?? []).map((s) => String(s).toLowerCase());
    const missingSkills = requiredSkills.filter((s) => !candidateSkills.includes(s));

    if (missingSkills.length) {
      const err: any = new Error(`Missing required skills: ${missingSkills.join(", ")}`);
      err.statusCode = 400;
      err.reason_codes = missingSkills.map((s) => `MISSING_SKILL:${s}`);
      throw err;
    }

    // 4) If recommendation exists, use it as scoring base (A5)
    const rec = await this.prisma.jobRecommendation.findUnique({
      where: { candidate_id_job_id: { candidate_id: candidateId, job_id: jobId } },
      select: {
        recommendation_id: true,
        match_score: true,
        vector_score: true,
        trigger: true,
        reason_codes: true,
        missing_skills: true,
        skill_match: true,
        is_eligible: true,
      },
    });

    const eligible = rec?.is_eligible ?? false;
    const matchScore = rec?.match_score ?? 0;

    const computedTrigger: TriggerValue =
      (rec?.trigger as TriggerValue) ?? (eligible ? triggerFromScore(matchScore) : "NO_TRIGGER");

    // scale: 0..100 (you are using 80/60 thresholds)
    const relevanceScore = matchScore;
    const vectorScore = rec?.vector_score ?? null;

    // 5) Transaction: create application + history + outbox events + mark recommendation applied + notify
    return this.prisma.$transaction(async (tx) => {
      // prevent duplicate apply (unique candidate_id+job_id)
      const existing = await tx.jobApplication.findUnique({
        where: { candidate_id_job_id: { candidate_id: candidateId, job_id: jobId } },
        select: { application_id: true, status: true },
      });

      if (existing) {
        return {
          ok: true,
          alreadyApplied: true,
          application_id: existing.application_id,
          status: existing.status,
        };
      }

      const app = await tx.jobApplication.create({
        data: {
          candidate_id: candidateId,
          job_id: jobId,
          status: JobApplicationStatus.APPLIED,
          cover_letter: coverLetter ?? null,

          relevance_score: relevanceScore,
          vector_score: vectorScore,
          trigger: computedTrigger,
          score_version: "v1",
          scored_at: new Date(),

          recommendation_id: rec?.recommendation_id ?? null,
        },
        select: { application_id: true, status: true },
      });

      // A6: in-app notification (application confirmation)
      await tx.notification.create({
        data: {
          audience: NotificationAudience.CANDIDATE,
          recipient_id: candidateId,
          type: NotificationType.APPLICATION_CONFIRMED,
          title: "Application sent ✅",
          message: `Your application for "${job.title}" has been submitted.`,
          action_url: "/candidate/dashboard/applications",
          data: { jobId, applicationId: app.application_id },
          sent_via: "in_app",
        },
      });

      // history snapshot (A5)
      await tx.jobApplicationScoreHistory.create({
        data: {
          application_id: app.application_id,
          relevance_score: relevanceScore,
          vector_score: vectorScore ?? undefined,
          trigger: computedTrigger,
          reason_codes: rec?.reason_codes ?? [],
          missing_skills: rec?.missing_skills ?? [],
          breakdown: rec?.skill_match ?? undefined,
          created_by: "system",
          source: "apply",
        },
      });

      // outbox events (A4) — SAFE idempotent upsert by dedupe_key
      const upsertOutbox = async (
        dedupeKey: string,
        type: JobApplicationEventType,
        payload: any,
      ) => {
        return tx.jobApplicationEventOutbox.upsert({
          where: { dedupe_key: dedupeKey },
          update: {
            payload,
            status: JobApplicationEventStatus.PENDING,
            attempts: 0,
            last_error: null,
          },
          create: {
            application_id: app.application_id,
            type,
            payload,
            status: JobApplicationEventStatus.PENDING,
            dedupe_key: dedupeKey,
          },
        });
      };

      await upsertOutbox(`APPLIED_CREATED:${app.application_id}`, JobApplicationEventType.APPLIED_CREATED, {
        candidate_id: candidateId,
        job_id: jobId,
      });

      if (computedTrigger === "INTERVIEW_REQUIRED") {
        await upsertOutbox(
          `INTERVIEW_REQUIRED:${app.application_id}`,
          JobApplicationEventType.INTERVIEW_REQUIRED,
          { trigger: computedTrigger, match_score: matchScore },
        );
      } else if (computedTrigger === "ASSESSMENT_REQUIRED") {
        await upsertOutbox(
          `ASSESSMENT_REQUIRED:${app.application_id}`,
          JobApplicationEventType.ASSESSMENT_REQUIRED,
          { trigger: computedTrigger, match_score: matchScore },
        );
      }

      // mark recommendation as applied (optional)
      if (rec?.recommendation_id) {
        await tx.jobRecommendation.update({
          where: { recommendation_id: rec.recommendation_id },
          data: { is_applied: true },
        });
      }

      // update global score (simple v1)
      await this.recomputeCandidateGlobalScoreTx(tx, candidateId, "apply");

      return { ok: true, ...app, trigger: computedTrigger };
    });
  }

  /**
   * =========================
   * READ
   * GET /candidate/applications
   * =========================
   */
  async listApplications(args: { candidateId: string }) {
    const { candidateId } = args;

    const items = await this.prisma.jobApplication.findMany({
      where: { candidate_id: candidateId },
      orderBy: { applied_at: "desc" },
      select: {
        application_id: true,
        status: true,
        applied_at: true,

        relevance_score: true,
        vector_score: true,
        trigger: true,
        scored_at: true,
        score_version: true,

        job: {
          select: {
            job_id: true,
            title: true,
            location: true,
            experience_level: true,
            status: true,
          },
        },
      },
    });

    return { total: items.length, items };
  }

  /**
   * =========================
   * READ
   * GET /candidate/applications/:id/timeline
   * =========================
   */
  async getTimeline(args: { candidateId: string; applicationId: string }) {
    const { candidateId, applicationId } = args;

    const application = await this.prisma.jobApplication.findUnique({
      where: { application_id: applicationId },
      select: {
        application_id: true,
        candidate_id: true,
        job_id: true,
        status: true,
      },
    });

    if (!application) {
      const err: any = new Error("Application not found");
      err.statusCode = 404;
      throw err;
    }

    if (application.candidate_id !== candidateId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    const timeline = await this.prisma.jobApplicationScoreHistory.findMany({
      where: { application_id: applicationId },
      orderBy: { created_at: "asc" },
      select: {
        history_id: true,
        created_at: true,

        relevance_score: true,
        vector_score: true,
        trigger: true,

        reason_codes: true,
        missing_skills: true,
        breakdown: true,

        source: true,
        created_by: true,
      },
    });

    return {
      application: {
        application_id: application.application_id,
        job_id: application.job_id,
        status: application.status,
      },
      timeline,
    };
  }

  /**
   * A5: recompute candidate global score (simple version)
   * - average relevance_score of applications
   * - stores CandidateGlobalScore + history
   */
  async recomputeCandidateGlobalScore(args: { candidateId: string; reason?: string }) {
    const { candidateId, reason } = args;
    return this.prisma.$transaction((tx) =>
      this.recomputeCandidateGlobalScoreTx(tx, candidateId, reason ?? "recompute"),
    );
  }

  private async recomputeCandidateGlobalScoreTx(tx: any, candidateId: string, reason: string) {
    const apps = await tx.jobApplication.findMany({
      where: { candidate_id: candidateId },
      select: { relevance_score: true, status: true },
    });

    const scores = apps
      .map((a: any) => a.relevance_score)
      .filter((v: any) => typeof v === "number") as number[];

    const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;

    const components = {
      version: "v1",
      applications_count: apps.length,
      avg_relevance_score: avg,
    };

    const row = await tx.candidateGlobalScore.upsert({
      where: { candidate_id: candidateId },
      update: { total_score: avg, components },
      create: { candidate_id: candidateId, total_score: avg, components },
      select: { candidate_id: true, total_score: true, updated_at: true },
    });

    await tx.candidateGlobalScoreHistory.create({
      data: {
        candidate_id: candidateId,
        total_score: avg,
        components,
        reason,
      },
    });

    return row;
  }
}

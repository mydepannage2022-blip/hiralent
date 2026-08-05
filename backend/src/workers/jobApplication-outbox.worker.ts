import { JobApplicationEventStatus, JobApplicationEventType, JobApplicationStatus, NotificationAudience, NotificationType } from "@prisma/client";
import prisma from '../lib/prisma';


type TriggerValue = "INTERVIEW_REQUIRED" | "ASSESSMENT_REQUIRED" | "NO_TRIGGER";

const triggerFromScore = (score: number): TriggerValue => {
  if (score >= 80) return "INTERVIEW_REQUIRED";
  if (score >= 60) return "ASSESSMENT_REQUIRED";
  return "NO_TRIGGER";
};

const toStrArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
};

export async function runJobApplicationOutboxOnce(limit = 50) {
  const events = await prisma.jobApplicationEventOutbox.findMany({
    where: { status: JobApplicationEventStatus.PENDING },
    orderBy: { created_at: "asc" },
    take: limit,
  });

  for (const ev of events) {
    try {
      await prisma.$transaction(async (tx) => {
        // 0) mark attempt
        await tx.jobApplicationEventOutbox.update({
          where: { event_id: ev.event_id },
          data: { attempts: { increment: 1 } },
        });

        // Helper: load application
        const app = await tx.jobApplication.findUnique({
          where: { application_id: ev.application_id },
          select: {
            application_id: true,
            candidate_id: true,
            job_id: true,
            status: true,
            relevance_score: true,
            vector_score: true,
            trigger: true,
            score_version: true,
            job: {
              select: {
                title: true,
              },
            },
          },
        });

        if (!app) throw new Error(`Application not found: ${ev.application_id}`);

        // Helper: idempotent outbox by dedupe_key
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

        // Helper: notify candidate (A6)
        const notifyCandidate = async (args: {
          type: NotificationType;
          title: string;
          message: string;
          action_url?: string;
          data?: any;
        }) => {
          await tx.notification.create({
            data: {
              audience: NotificationAudience.CANDIDATE,
              recipient_id: app.candidate_id,
              type: args.type,
              title: args.title,
              message: args.message,
              action_url: args.action_url ?? "/candidate/dashboard/applications",
              data: args.data ?? { applicationId: app.application_id, jobId: app.job_id },
              sent_via: "in_app",
            },
          });
        };

        // =========================================
        // A5) SCORE PER APPLICATION via event worker
        // =========================================
        if (ev.type === JobApplicationEventType.APPLIED_CREATED) {
          const rec = await tx.jobRecommendation.findUnique({
            where: {
              candidate_id_job_id: {
                candidate_id: app.candidate_id,
                job_id: app.job_id,
              },
            },
            select: {
              match_score: true,
              vector_score: true,
              trigger: true,
              reason_codes: true,
              missing_skills: true,
              skill_match: true,
              is_eligible: true,
              job_embedding_hash: true,
              candidate_embedding_hash: true,
            },
          });

          const matchScore = rec?.match_score ?? 0;
          const vectorScore = rec?.vector_score ?? null;

          const computedTrigger: TriggerValue =
            (rec?.trigger as TriggerValue) ??
            (rec?.is_eligible ? triggerFromScore(matchScore) : "NO_TRIGGER");

          await tx.jobApplication.update({
            where: { application_id: app.application_id },
            data: {
              relevance_score: matchScore,
              vector_score: vectorScore,
              trigger: computedTrigger,
              scored_at: new Date(),
              score_version: app.score_version ?? "v1",
            },
          });

          await tx.jobApplicationScoreHistory.create({
            data: {
              application_id: app.application_id,
              relevance_score: matchScore,
              vector_score: vectorScore ?? undefined,
              trigger: computedTrigger,
              reason_codes: toStrArray(rec?.reason_codes),
              missing_skills: toStrArray(rec?.missing_skills),
              breakdown: rec?.skill_match ?? undefined,
              created_by: "system",
              source: "outbox:APPLIED_CREATED",
            },
          });

          // Follow-up events (idempotent)
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
        }

        // =========================================
        // A4) STATUS TRANSITIONS + A6 NOTIFICATIONS
        // =========================================
        if (ev.type === JobApplicationEventType.INTERVIEW_REQUIRED) {
          if (app.status !== JobApplicationStatus.INTERVIEW_REQUIRED) {
            await tx.jobApplication.update({
              where: { application_id: app.application_id },
              data: { status: JobApplicationStatus.INTERVIEW_REQUIRED },
            });

            await tx.jobApplicationScoreHistory.create({
              data: {
                application_id: app.application_id,
                relevance_score: app.relevance_score ?? 0,
                vector_score: app.vector_score ?? undefined,
                trigger: "INTERVIEW_REQUIRED",
                reason_codes: [],
                missing_skills: [],
                breakdown: ev.payload ?? undefined,
                created_by: "system",
                source: "outbox:INTERVIEW_REQUIRED",
              },
            });

            await notifyCandidate({
              type: NotificationType.INTERVIEW_INVITE,
              title: "Your profile scored well",
              message: `Based on your match score for "${app.job.title}", you are likely to be invited to an interview. This is an automated signal — no recruiter has confirmed this yet.`,
              action_url: "/candidate/dashboard/applications",
              data: {
                applicationId: app.application_id,
                jobId: app.job_id,
                trigger: "INTERVIEW_REQUIRED",
              },
            });
          }
        }

        if (ev.type === JobApplicationEventType.ASSESSMENT_REQUIRED) {
          if (app.status !== JobApplicationStatus.ASSESSMENT_REQUIRED) {
            await tx.jobApplication.update({
              where: { application_id: app.application_id },
              data: { status: JobApplicationStatus.ASSESSMENT_REQUIRED },
            });

            await tx.jobApplicationScoreHistory.create({
              data: {
                application_id: app.application_id,
                relevance_score: app.relevance_score ?? 0,
                vector_score: app.vector_score ?? undefined,
                trigger: "ASSESSMENT_REQUIRED",
                reason_codes: [],
                missing_skills: [],
                breakdown: ev.payload ?? undefined,
                created_by: "system",
                source: "outbox:ASSESSMENT_REQUIRED",
              },
            });

            await notifyCandidate({
              type: NotificationType.ASSESSMENT_INVITE,
              title: "You may be invited to an assessment",
              message: `Your profile score for "${app.job.title}" suggests you could be a good fit. You are likely to receive a skills assessment invitation — completing it improves your chances but is not a guarantee.`,
              action_url: "/candidate/dashboard/skills-assessment",
              data: {
                applicationId: app.application_id,
                jobId: app.job_id,
                trigger: "ASSESSMENT_REQUIRED",
              },
            });
          }
        }

        // mark SENT
        await tx.jobApplicationEventOutbox.update({
          where: { event_id: ev.event_id },
          data: { status: JobApplicationEventStatus.SENT, last_error: null },
        });
      });
    } catch (err: any) {
      await prisma.jobApplicationEventOutbox.update({
        where: { event_id: ev.event_id },
        data: {
          status: JobApplicationEventStatus.FAILED,
          last_error: String(err?.message ?? err),
        },
      });
    }
  }

  return { processed: events.length };
}
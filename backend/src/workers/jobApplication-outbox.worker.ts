import {
  PrismaClient,
  JobApplicationEventStatus,
  JobApplicationEventType,
  JobApplicationStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

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

        // Helper: load application (needed for scoring + transitions)
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
          },
        });

        if (!app) {
          // If application is missing, we can’t process this event
          throw new Error(`Application not found: ${ev.application_id}`);
        }

        // =========================================
        // A5) SCORE PER APPLICATION via event worker
        // =========================================
        if (ev.type === JobApplicationEventType.APPLIED_CREATED) {
          // 1) Try to get recommendation computed by matching worker
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

          // if no rec: keep NO_TRIGGER (don’t invent eligibility)
          const computedTrigger: TriggerValue =
            (rec?.trigger as TriggerValue) ??
            (rec?.is_eligible ? triggerFromScore(matchScore) : "NO_TRIGGER");

          // 2) Update application snapshot (A5)
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

          // 3) Append timeline entry (A5 history)
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

          // 4) Optional: if trigger implies a transition, emit follow-up events
          // (keeps your architecture event-driven)
          if (computedTrigger === "INTERVIEW_REQUIRED") {
            await tx.jobApplicationEventOutbox.create({
              data: {
                application_id: app.application_id,
                type: JobApplicationEventType.INTERVIEW_REQUIRED,
                payload: { trigger: computedTrigger, match_score: matchScore },
                status: JobApplicationEventStatus.PENDING,
                dedupe_key: `INTERVIEW_REQUIRED:${app.application_id}`,
              },
            });
          } else if (computedTrigger === "ASSESSMENT_REQUIRED") {
            await tx.jobApplicationEventOutbox.create({
              data: {
                application_id: app.application_id,
                type: JobApplicationEventType.ASSESSMENT_REQUIRED,
                payload: { trigger: computedTrigger, match_score: matchScore },
                status: JobApplicationEventStatus.PENDING,
                dedupe_key: `ASSESSMENT_REQUIRED:${app.application_id}`,
              },
            });
          }
        }

        // =========================================
        // A4) STATUS TRANSITIONS + TIMELINE ENTRY
        // =========================================
        if (ev.type === JobApplicationEventType.INTERVIEW_REQUIRED) {
          await tx.jobApplication.update({
            where: { application_id: app.application_id },
            data: { status: JobApplicationStatus.INTERVIEW_REQUIRED },
          });

          // history entry for transition (A5 timeline)
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
        }

        if (ev.type === JobApplicationEventType.ASSESSMENT_REQUIRED) {
          await tx.jobApplication.update({
            where: { application_id: app.application_id },
            data: { status: JobApplicationStatus.ASSESSMENT_REQUIRED },
          });

          // history entry for transition (A5 timeline)
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
        }

        // STATUS_UPDATED: optional (future)
        // if (ev.type === JobApplicationEventType.STATUS_UPDATED) { ... }

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

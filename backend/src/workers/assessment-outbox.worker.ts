// backend/src/workers/assessmentOutbox.worker.ts
import { PrismaClient } from "@prisma/client";
import { setTimeout as wait } from "node:timers/promises";
import Redis from "ioredis";
import { Worker as BullWorker, QueueEvents } from "bullmq";

import { nextAssessmentOutboxJob } from "../queues/assessment.queue";
import { SkillRadarFromAssessmentService } from "../services/company/internal/skillRadarFromAssessment.service";
import { enqueueAssessmentInsight } from "./assessmentQueue";
import { NotificationAudience, NotificationType } from "@prisma/client";

// ✅ NEW
import { AssessmentScoringService } from "../services/company/internal/assessmentScoring.service";

const prisma = new PrismaClient();

async function processOutbox(sessionId: string) {
  const s = await prisma.candidateAssessmentSession.findUnique({
    where: { session_id: sessionId },
    select: { status: true },
  });
  if (!s) return;
  if (s.status !== "SUBMITTED") return;

  // ✅ 1) Compute final score + breakdown
  await AssessmentScoringService.computeAndStore(sessionId);

  // ✅ 2) Build tag-based radar (fallback)
  await SkillRadarFromAssessmentService.buildAndPush(sessionId);

  // ✅ 3) Generate Gemini insight
  await enqueueAssessmentInsight({ sessionId });
    // ✅ 4) Notify company: candidate completed assessment
  const session = await prisma.candidateAssessmentSession.findUnique({
    where: { session_id: sessionId },
    select: {
      session_id: true,
      candidate_id: true,
      assessment_id: true,
      assessment: {
        select: {
          title: true,
          company_id: true,
          job_id: true,
        },
      },
    },
  });

  if (session?.assessment?.company_id) {
    await prisma.notification.create({
      data: {
        audience: NotificationAudience.COMPANY,
        recipient_id: session.assessment.company_id,
        type: NotificationType.APPLICATION_STATUS_CHANGED, // ✅ si pas existant, mets APPLICATION_STATUS_CHANGED ou un type que tu as
        title: "Assessment completed ✅",
        message: `A candidate completed "${session.assessment.title}".`,
        action_url: `/company/dashboard/employer-assessments/${session.assessment_id}/analytics`,
        data: {
          sessionId: session.session_id,
          assessmentId: session.assessment_id,
          candidateId: session.candidate_id,
          jobId: session.assessment.job_id,
        },
        sent_via: "in_app",
      },
    });
  }

}

async function pollerMain() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = nextAssessmentOutboxJob();
    if (job) {
      try {
        await processOutbox(job.sessionId);
      } catch (e) {
        console.error("assessment-outbox worker error:", e);
      }
    } else {
      await wait(300);
    }
  }
}

async function bullWorkerMain() {
  const redisUrl = process.env.REDIS_URL!;
  // wait for Redis readiness
  const maxAttempts = 10;
  let connected = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const tmp = new Redis(redisUrl, { enableOfflineQueue: true });
      // eslint-disable-next-line no-await-in-loop
      await tmp.ping();
      tmp.disconnect();
      connected = true;
      break;
    } catch {
      const delay = Math.min(200 * attempt, 2000);
      // eslint-disable-next-line no-await-in-loop
      await wait(delay);
    }
  }
  if (!connected) throw new Error("Unable to connect to Redis");

  const w = new BullWorker(
    "assessment_outbox",
    async (job: any) => {
      await processOutbox(job.data.sessionId);
    },
    { connection: { url: redisUrl } }
  );

  const qEvents = new QueueEvents("assessment_outbox", { connection: { url: redisUrl } });
  qEvents.on("completed", ({ jobId }) => console.log("assessment_outbox completed", jobId));
  qEvents.on("failed", ({ jobId, failedReason }) =>
    console.warn("assessment_outbox failed", jobId, failedReason)
  );

  w.on("error", (err) => console.error("assessment_outbox bull worker error", err));
  console.log("assessment-outbox worker listening");
}

if (require.main === module) {
  const forceInMemory =
    (process.env.FORCE_INMEMORY || process.env.USE_IN_MEMORY_QUEUE) === "1" ||
    (process.env.FORCE_INMEMORY || "").toLowerCase() === "true";

  if (!forceInMemory && process.env.REDIS_URL) {
    bullWorkerMain().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    if (forceInMemory) console.log("FORCE_INMEMORY enabled — assessment-outbox using in-memory poller");
    pollerMain().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}

export { pollerMain };

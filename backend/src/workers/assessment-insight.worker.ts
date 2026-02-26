/**Calls your assessment-ai-service.client.ts (or direct LLM service) and stores CandidateAssessmentInsight. */
import { setTimeout as wait } from "node:timers/promises";
import Redis from "ioredis";
import { Worker as BullWorker, QueueEvents } from "bullmq";

import { nextAssessmentInsightJob } from "../queues/assessment.queue";
import { CandidateAssessmentInsightService } from "../services/candidate/candidateAssessmentInsight.service";

async function processInsight(sessionId: string) {
  await CandidateAssessmentInsightService.generateAndStore(sessionId);
}

async function pollerMain() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = nextAssessmentInsightJob();
    if (job) {
      try {
        await processInsight(job.sessionId);
      } catch (e) {
        console.error("assessment-insight worker error:", e);
      }
    } else {
      await wait(300);
    }
  }
}

async function bullWorkerMain() {
  const redisUrl = process.env.REDIS_URL!;
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
    "assessment_insight",
    async (job: any) => {
      await processInsight(job.data.sessionId);
    },
    { connection: { url: redisUrl } }
  );

  const qEvents = new QueueEvents("assessment_insight", { connection: { url: redisUrl } });
  qEvents.on("completed", ({ jobId }) => console.log("assessment_insight completed", jobId));
  qEvents.on("failed", ({ jobId, failedReason }) =>
    console.warn("assessment_insight failed", jobId, failedReason)
  );

  w.on("error", (err) => console.error("assessment_insight bull worker error", err));
  console.log("assessment-insight worker listening");
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
    if (forceInMemory) console.log("FORCE_INMEMORY enabled — assessment-insight using in-memory poller");
    pollerMain().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}

export { pollerMain };

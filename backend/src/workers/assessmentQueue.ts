import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  enqueueAssessmentOutboxInMemory,
  enqueueAssessmentInsightInMemory,
} from "../queues/assessment.queue";

let outboxQueue: Queue | null = null;
let insightQueue: Queue | null = null;

const forceInMemory =
  (process.env.FORCE_INMEMORY || process.env.USE_IN_MEMORY_QUEUE) === "1" ||
  (process.env.FORCE_INMEMORY || "").toLowerCase() === "true";

async function tryInitRedisQueues() {
  if (forceInMemory) {
    console.log("FORCE_INMEMORY enabled — using in-memory assessment queues");
    return { outbox: null, insight: null };
  }

  const url = process.env.REDIS_URL;
  if (!url) return { outbox: null, insight: null };

  const tmp = new Redis(url, {
    connectTimeout: 1000,
    enableOfflineQueue: true,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(50 + times * 100, 2000),
  });

  try {
    let ok = false;
    for (let i = 0; i < 5; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await tmp.ping();
        ok = true;
        break;
      } catch {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    if (!ok) {
      console.warn("Redis unreachable — falling back to in-memory assessment queues");
      return { outbox: null, insight: null };
    }

    const outbox = new Queue("assessment_outbox", { connection: { url } });
    const insight = new Queue("assessment_insight", { connection: { url } });
    return { outbox, insight };
  } catch (e) {
    console.warn("Redis unreachable — falling back to in-memory assessment queues", e);
    return { outbox: null, insight: null };
  } finally {
    try {
      tmp.disconnect();
    } catch {}
  }
}

(async () => {
  try {
    const qs = await tryInitRedisQueues();
    outboxQueue = qs.outbox;
    insightQueue = qs.insight;
  } catch (e) {
    console.warn("Failed to init assessment queues:", e);
    outboxQueue = null;
    insightQueue = null;
  }
})();

export async function enqueueAssessmentOutbox(payload: { sessionId: string }) {
  if (outboxQueue) {
    await outboxQueue.add("outbox", payload, {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: true,
    });
  } else {
    enqueueAssessmentOutboxInMemory(payload);
  }
}

export async function enqueueAssessmentInsight(payload: { sessionId: string }) {
  if (insightQueue) {
    await insightQueue.add("insight", payload, {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: true,
    });
  } else {
    enqueueAssessmentInsightInMemory(payload);
  }
}

export default { outboxQueue, insightQueue };

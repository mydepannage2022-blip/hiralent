// backend/src/workers/queue.ts (ou ../../workers/queue selon ton projet)
import { Queue } from "bullmq";
import Redis from "ioredis";
import { enqueueRunInMemory } from "../queues/runs.queue";

let queue: Queue | null = null;

// Allow forcing in-memory queue for local development/testing even when REDIS_URL is set.
const forceInMemory =
  (process.env.FORCE_INMEMORY || process.env.USE_IN_MEMORY_QUEUE) === "1" ||
  (process.env.FORCE_INMEMORY || "").toLowerCase() === "true";

export type RunPayload = {
  submissionId: string;
  assessmentId: string;
  questionId: string;
  language: string;

  // ✅ optional extras for simple test runner
  attemptId?: string;
  suite?: any[];
  loadedTestsCount?: number;
  firstExpected?: string;
};

async function tryInitRedisQueue() {
  if (forceInMemory) {
    console.log("FORCE_INMEMORY enabled — using in-memory queue");
    return null;
  }

  const url = process.env.REDIS_URL;
  if (!url) return null;

  // ping check with retries to avoid failing hard when Redis is starting
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
      console.warn("Redis unreachable after retries — falling back to in-memory queue");
      return null;
    }

    // Redis reachable — create the bull queue
    const q = new Queue("runs", { connection: { url } });
    return q;
  } catch (e) {
    console.warn("Redis unreachable — falling back to in-memory queue", e);
    return null;
  } finally {
    try {
      tmp.disconnect();
    } catch {}
  }
}

// initialize without throwing
(async () => {
  try {
    queue = await tryInitRedisQueue();
  } catch (e) {
    console.warn("Failed to initialize queue:", e);
    queue = null;
  }
})();

export async function enqueueRun(payload: RunPayload) {
  if (queue) {
    await queue.add("run", payload, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
  } else {
    // ✅ in-memory should accept the same shape
    enqueueRunInMemory(payload as any);
  }
}

export default queue;

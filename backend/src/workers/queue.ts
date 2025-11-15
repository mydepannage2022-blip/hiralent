import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { enqueueRunInMemory } from '../queues/runs.queue';

let queue: Queue | null = null;

// Allow forcing in-memory queue for local development/testing even when REDIS_URL is set.
const forceInMemory = (process.env.FORCE_INMEMORY || process.env.USE_IN_MEMORY_QUEUE) === '1' || (process.env.FORCE_INMEMORY || '').toLowerCase() === 'true';

async function tryInitRedisQueue() {
  if (forceInMemory) {
    console.log('FORCE_INMEMORY enabled — using in-memory queue');
    return null;
  }
  const url = process.env.REDIS_URL;
  if (!url) return null;

  // quick ping check to avoid creating long-lived clients when Redis is down
  const tmp = new Redis(url, { connectTimeout: 1000, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
  try {
    await tmp.ping();
    // Redis reachable — create the bull queue
    const q = new Queue('runs', { connection: { url } });
    return q;
  } catch (e) {
    console.warn('Redis unreachable — falling back to in-memory queue');
    return null;
  } finally {
    try { tmp.disconnect(); } catch {}
  }
}

// initialize synchronously-ish: try to create queue but don't throw if unreachable
(async () => {
  try {
    queue = await tryInitRedisQueue();
  } catch (e) {
    console.warn('Failed to initialize queue:', e);
    queue = null;
  }
})();

export async function enqueueRun(payload: {
  submissionId: string;
  assessmentId: string;
  questionId: string;
  language: string;
}) {
  if (queue) {
    await queue.add('run', payload, { attempts: 1, removeOnComplete: true, removeOnFail: true });
  } else {
    enqueueRunInMemory(payload);
  }
}

export default queue;

import { Queue, JobsOptions } from 'bullmq';
import { getRedis } from '../lib/redis';
import { AppError } from '../errors/httpErrors';

/**
 * AI company-setup queue (BullMQ).
 *
 * ⚠️ The connection is built LAZILY, and that is load-bearing — do NOT hoist it back to
 * module scope.
 *
 * This module used to do `const connection = getRedis()` at import time. `getRedis()`
 * (lib/redis.ts:8) THROWS `REDIS_URL missing` when the var is unset, and this module is
 * imported by `routes/insights.routes.ts:5`, which `app.ts:228` mounts — so an unset
 * REDIS_URL crashed the ENTIRE API at boot, before a single request was served.
 * `FORCE_INMEMORY` did not rescue it either: that flag is honoured by `workers/queue.ts` and
 * `workers/assessmentQueue.ts`, but was never consulted on this path. Net effect: Redis,
 * which every other queue treats as optional with an in-memory fallback, was silently a hard
 * BOOT dependency for the whole API. (Found while building the Wave 8-lite single-process
 * staging entry, W-2; `assessmentQueue.ts` already had the correct lazy shape.)
 *
 * This queue genuinely has NO in-memory fallback — its only consumer
 * (`workers/ai_company_setup.worker.ts`) is a BullMQ `Worker` with no poller equivalent. So on
 * a deployment without Redis the honest behaviour is to refuse the enqueue with a clear 503,
 * NOT to boot-crash the API, and NOT to pretend the job was accepted.
 */

let queue: Queue | null = null;

/** True when this deployment has the Redis broker this pipeline requires. */
export function isAiCompanySetupAvailable(): boolean {
  return Boolean((process.env.REDIS_URL || '').trim());
}

function getQueue(): Queue {
  if (!isAiCompanySetupAvailable()) {
    // Express 5 auto-forwards async rejections to the central error handler, so throwing here
    // surfaces the standard envelope with a machine-readable code instead of an opaque 500.
    throw new AppError(
      'AI company setup is unavailable in this deployment (no Redis broker is configured).',
      503,
      'AI_COMPANY_SETUP_UNAVAILABLE'
    );
  }
  if (!queue) {
    queue = new Queue('ai-company-setup', { connection: getRedis() });
  }
  return queue;
}

// Default job settings: retry logic and cleanup
const defaultJobOptions: JobsOptions = {
  attempts: 3, // Retry up to 3 times on failure
  backoff: { type: 'exponential', delay: 10_000 }, // Progressive delay between retries
  removeOnComplete: 1000, // Auto-clean successful jobs (keep last 1000)
  removeOnFail: 1000, // Auto-clean failed jobs (keep last 1000)
};

// Helper to create safe BullMQ-compatible job IDs
function createSafeJobId(prefix: string, companyId: string, version: number): string {
  return `${prefix}-${companyId}-${version}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

// Queue a new company for initial AI setup
export async function enqueueAiCompanySetup(companyId: string) {
  const version = Date.now(); // Ensure job uniqueness
  const jobId = createSafeJobId('approval', companyId, version);

  await getQueue().add(
    'ai-company-setup',
    { companyId, version, reason: 'approval' },
    {
      ...defaultJobOptions,
      jobId, // Safe ID guaranteed
    }
  );
}

// Re-run AI setup for existing company (higher priority)
export async function enqueueAiCompanySetupRecompute(companyId: string) {
  const version = Date.now();
  const jobId = createSafeJobId('recompute', companyId, version);

  await getQueue().add(
    'ai-company-setup',
    { companyId, version, reason: 'recompute' },
    {
      ...defaultJobOptions,
      jobId, // Safe ID guaranteed
      priority: 1, // Jump ahead of normal jobs
    }
  );
}

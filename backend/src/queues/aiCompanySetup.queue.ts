import { Queue, JobsOptions } from 'bullmq';
import { getRedis } from '../lib/redis';

const connection = getRedis();

// Main queue for AI company setup processing
export const aiCompanySetupQueue = new Queue('ai-company-setup', { connection });

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
  
  await aiCompanySetupQueue.add(
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

  await aiCompanySetupQueue.add(
    'ai-company-setup',
    { companyId, version, reason: 'recompute' },
    {
      ...defaultJobOptions,
      jobId, // Safe ID guaranteed
      priority: 1, // Jump ahead of normal jobs
    }
  );
}
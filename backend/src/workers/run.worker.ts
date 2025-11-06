import { PrismaClient } from '@prisma/client';
import { nextRunJob } from '../queues/runs.queue';
import { run_submission_and_grade } from '../services/execution.service';
import { emitSubmissionEvent } from '../lib/submissionEmitter';
import logger from '../lib/logger';
import { RunnerResultSchema, PlagiarismReportSchema } from '../validation/execution.validation';
import { ZodError } from 'zod';
import { runProcessed, runFailed, runDuration } from '../lib/metrics';
import { setTimeout as wait } from 'node:timers/promises';
import { Worker as BullWorker, QueueEvents } from 'bullmq';

const prisma = new PrismaClient();

let processed = 0;
let failed = 0;

async function processOne(job: { submissionId: string; assessmentId: string; questionId: string; language: string }) {
  const s = await (prisma as any).codeSubmission.findUnique({ where: { submission_id: job.submissionId } });
  if (!s) return;

  // mark running
  await (prisma as any).codeSubmission.update({ where: { submission_id: job.submissionId }, data: { status: 'RUNNING' } });
  emitSubmissionEvent({ submissionId: job.submissionId, status: 'RUNNING' });

  // perform run + grading
  const endTimer = runDuration.startTimer();
  try {
    const res = await run_submission_and_grade({ submissionId: job.submissionId, questionId: job.questionId, language: job.language, code: s.code, userId: s.candidate_id });
    // validate runner & plagiarism shapes and attach warnings if any
    const validationWarnings: any[] = [];
    try {
      if (res && res.runner) {
        RunnerResultSchema.parse(res.runner);
      }
    } catch (ve) {
      if (ve instanceof ZodError) {
        // Zod v3 exposes `issues` for detailed validation info
        validationWarnings.push({ type: 'runner_schema', issues: ve.issues });
        logger.warn({ submissionId: job.submissionId, validationErrors: ve.issues }, 'runner result schema validation failed');
      } else {
        logger.warn({ submissionId: job.submissionId, err: String(ve) }, 'runner schema validation exception');
      }
    }

    try {
      if (res && res.plagiarism) {
        PlagiarismReportSchema.parse(res.plagiarism);
      }
    } catch (ve) {
      if (ve instanceof ZodError) {
        validationWarnings.push({ type: 'plagiarism_schema', issues: ve.issues });
        logger.warn({ submissionId: job.submissionId, validationErrors: ve.issues }, 'plagiarism schema validation failed');
      } else {
        logger.warn({ submissionId: job.submissionId, err: String(ve) }, 'plagiarism schema validation exception');
      }
    }

    // attach warnings to result object so they are persisted with the submission
    if (validationWarnings.length > 0 && typeof res === 'object' && res !== null) {
      try { (res as any).validationWarnings = validationWarnings; } catch { /* ignore */ }
    }

    // store result JSON
    await (prisma as any).codeSubmission.update({ where: { submission_id: job.submissionId }, data: { status: 'COMPLETED', result: res, ended_at: new Date() } });
    emitSubmissionEvent({ submissionId: job.submissionId, status: 'COMPLETED', payload: res });
    processed++;
    runProcessed.inc();
    logger.info({ submissionId: job.submissionId, score: res.score }, 'run completed');
  } catch (e) {
    logger.error({ err: String(e), submissionId: job.submissionId }, 'run failed');
    await (prisma as any).codeSubmission.update({ where: { submission_id: job.submissionId }, data: { status: 'FAILED', ended_at: new Date(), error: String(e) } });
    emitSubmissionEvent({ submissionId: job.submissionId, status: 'FAILED', payload: { error: String(e) } });
    failed++;
    runFailed.inc();
  } finally {
    endTimer();
  }
}

async function pollerMain() {
  // in-memory poller fallback
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = nextRunJob();
    if (job) {
      try {
        await processOne(job as any);
      } catch (e) {
        console.error('Worker error', e);
      }
    } else {
      await wait(250);
    }
  }
}

async function bullWorkerMain() {
  const redisUrl = process.env.REDIS_URL!;
  const w = new BullWorker('runs', async (job: any) => {
    await processOne(job.data);
  }, { connection: { url: redisUrl } });

  const qEvents = new QueueEvents('runs', { connection: { url: redisUrl } });
  qEvents.on('completed', ({ jobId }) => {
    console.log('Job completed', jobId, 'processed:', processed, 'failed:', failed);
  });
  qEvents.on('failed', ({ jobId, failedReason }) => {
    console.warn('Job failed', jobId, failedReason);
  });

  w.on('error', (err) => {
    console.error('Bull worker error', err);
  });

  console.log('Run worker connected to Redis and listening');
}

if (require.main === module) {
  const forceInMemory = (process.env.FORCE_INMEMORY || process.env.USE_IN_MEMORY_QUEUE) === '1' || (process.env.FORCE_INMEMORY || '').toLowerCase() === 'true';
  if (!forceInMemory && process.env.REDIS_URL) {
    bullWorkerMain().catch((e) => { console.error(e); process.exit(1); });
  } else {
    if (forceInMemory) console.log('FORCE_INMEMORY enabled — run.worker using in-memory poller');
    pollerMain().catch((e) => { console.error(e); process.exit(1); });
  }
}

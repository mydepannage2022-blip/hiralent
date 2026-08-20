// backend/src/staging-entry.ts
//
// Single-process entrypoint: the HTTP API **and** the background pollers in one Node process.
// Wave 8-lite / W-2 (see hiralent-master-plan/waves/wave-8-lite-staging.md).
//
// ── Why this file exists ─────────────────────────────────────────────────────────────────────
// The normal topology is one API process plus six worker processes
// (`docker-compose.workers.yml`), coordinated through Redis. The staging deployment runs on a
// single free-tier container with no broker, so producers and consumers must share a process:
// `workers/queue.ts` enqueues into an in-memory queue, and only a poller inside THIS process
// can see it. Booting `dist/src/server.js` alone would accept work and drain none of it.
//
// ── Why `dev/run-with-poller.ts` could not be reused ─────────────────────────────────────────
// That helper forces `NODE_ENV=development` (line 6), which flips `server.ts:29` into loading
// the dev stubs. Shipping it would expose dev-only behaviour on a public URL. It also starts
// only the run poller, and lets any poller failure kill the process.
//
// ── Design rules ─────────────────────────────────────────────────────────────────────────────
//  1. NODE_ENV is never written here. Staging runs as `production`, which is what keeps
//     `assertSafeRunner`, `assertDbPoolConfig` and the fail-closed prod seed active.
//  2. The topology guard runs BEFORE the server import (see assertSingleProcessTopology.ts).
//  3. Every poller is supervised: a crash restarts that poller, it never takes down the API.
//     The stock runners do the opposite — `jobApplication-outbox.runner.ts:29` calls
//     `process.exit(1)`, which in a shared process would kill the HTTP server too.
//  4. The reusable unit is imported, never the self-starting runner module. The `*.runner.ts`
//     files start themselves on import and cannot be supervised.
//
// ⚠️ SINGLE INSTANCE ONLY. In-memory queues, in-process cron and the MemoryStore rate limiter
// are all per-process. Scaling this to 2 replicas double-fires every cron job and splits the
// queue. Recorded as shortcut S-1 in the Wave 8-lite plan.

// MUST be first — see the module's own header for why import order is load-bearing.
import './bootstrap/assertSingleProcessTopology';

// Starts the HTTP server, Socket.IO, the schedulers and the Prisma pool.
import './server';

import { setTimeout as wait } from 'node:timers/promises';
import { supervise } from './bootstrap/supervise';
import prisma from './lib/prisma';
import { createMatchingAIServiceClient } from './clients/matching-ai-service.client';
import { MatchingOutboxWorker } from './workers/matching-outbox.worker';
import { runJobApplicationOutboxOnce } from './workers/jobApplication-outbox.worker';
import { pollerMain as runQueuePoller } from './workers/run.worker';
import { pollerMain as assessmentOutboxPoller } from './workers/assessment-outbox.worker';
import { pollerMain as assessmentInsightPoller } from './workers/assessment-insight.worker';
import { main as assessmentInviteSweeper } from './workers/assessmentInviteSweeper.worker';

/** Poll interval for the two DB-backed outbox loops (mirrors the stock runners' 3s cadence). */
const OUTBOX_INTERVAL_MS = 3_000;

/** Start a supervised poller and announce it. Restart policy lives in bootstrap/supervise.ts. */
function start(name: string, poller: () => Promise<unknown>): void {
  supervise(name, poller);
  console.log(`   ↳ poller started: ${name}`);
}

/**
 * Job-application outbox. Reimplemented here rather than importing
 * `jobApplication-outbox.runner.ts`, which self-starts on import and `process.exit(1)`s on a
 * fatal error — in a shared process that would take the HTTP server down with it.
 */
async function jobApplicationOutboxPoller(): Promise<never> {
  for (;;) {
    try {
      const r = await runJobApplicationOutboxOnce(50);
      if (r?.processed) console.log('✅ jobApplication outbox processed:', r.processed);
    } catch (e) {
      console.error('❌ jobApplication outbox error:', e);
    }
    await wait(OUTBOX_INTERVAL_MS);
  }
}

/**
 * Matching outbox. Same reasoning as above, plus one fix: the stock runner
 * (`matching-outbox.runner.ts:16`) uses `setInterval`, so a tick slower than 3s overlaps the
 * next one. Awaiting sequentially keeps exactly one tick in flight.
 */
async function matchingOutboxPoller(): Promise<never> {
  const worker = new MatchingOutboxWorker(prisma, createMatchingAIServiceClient());
  for (;;) {
    try {
      await worker.tick();
    } catch (e) {
      console.error('❌ matching outbox error:', e);
    }
    await wait(OUTBOX_INTERVAL_MS);
  }
}

console.log('🧩 staging-entry: single-process mode (API + in-process pollers)');

// Code-execution runs. Under FORCE_INMEMORY this drains the very queue `workers/queue.ts`
// writes to — which only works because the enqueue and the poll now share a process.
start('run', runQueuePoller);

// Assessment pipeline.
start('assessment-outbox', assessmentOutboxPoller);
start('assessment-insight', assessmentInsightPoller);
start('assessment-invite-sweeper', assessmentInviteSweeper);

// DB-backed transactional outboxes.
start('jobApplication-outbox', jobApplicationOutboxPoller);

// Matching is gated on its service URL: unset (Phase 1 and 2 of the staging plan) the client
// falls back to `http://localhost:8011`, so an ungated poller would emit a connection error
// every 3 seconds and bury the real logs.
if ((process.env.MATCHING_AI_BASE_URL || '').trim()) {
  start('matching-outbox', matchingOutboxPoller);
} else {
  console.log('   ↳ poller SKIPPED: matching-outbox (MATCHING_AI_BASE_URL not set)');
}

// NOT started here, deliberately:
//   • ai_company_setup.worker  — a BullMQ Worker with no in-memory equivalent; it cannot run
//     without Redis. Its producer now refuses with a clear 503 instead of boot-crashing the API
//     (see queues/aiCompanySetup.queue.ts).
//   • verification.worker      — the "simulate" verification path, still mocked
//     (00-CURRENT-STATE.md §9) and absent from docker-compose.workers.yml. Running a mock on
//     staging would manufacture fake verification decisions.
//
// Shutdown is handled by server.ts's SIGTERM/SIGINT handlers, which close the HTTP server and
// the Prisma pool and then exit — killing these loops with it. In-flight outbox work is safe to
// lose: the outbox rows stay PENDING in Postgres and are picked up on the next boot.

// backend/src/bootstrap/assertSingleProcessTopology.ts
//
// Boot guard for the single-process staging entry (Wave 8-lite / W-2).
//
// SIDE-EFFECT MODULE: importing it runs the check. It must be the FIRST import in
// `staging-entry.ts` — TypeScript's CommonJS emit hoists `import` declarations into `require`
// calls in source order, so a plain statement placed above `import './server'` would still run
// AFTER the server had already started listening. Importing the guard first is what makes it
// actually guard anything.
//
// `dotenv/config` is imported here (not just in server.ts) because this module runs BEFORE
// server.ts calls `dotenv.config()`. Without it the check would read an empty process.env
// locally and pass vacuously. dotenv never overrides an already-set variable, so the platform
// env (Railway) still wins and server.ts's own call becomes a harmless no-op.
import 'dotenv/config';

/**
 * Same predicate as `workers/queue.ts:9` and `workers/assessmentQueue.ts:12`. Deliberately
 * duplicated rather than imported: importing those modules would construct their queues (and,
 * with a REDIS_URL present, open a connection) as a side effect of running the guard.
 */
function isInMemoryForced(): boolean {
  const v = process.env.FORCE_INMEMORY || process.env.USE_IN_MEMORY_QUEUE || '';
  return v === '1' || v.toLowerCase() === 'true';
}

/**
 * Refuse to start in a topology this entry cannot actually serve.
 *
 * The failure being prevented is SILENT, which is why it is fatal rather than a warning:
 * with REDIS_URL set and FORCE_INMEMORY off, `workers/queue.ts` and `workers/assessmentQueue.ts`
 * enqueue to **BullMQ/Redis**, while this entry starts the **in-memory** pollers. Producers and
 * consumers then sit on different substrates — every job is accepted, nothing is ever drained,
 * and there is no error anywhere to notice. Submissions would hang in RUNNING forever.
 *
 * This entry cannot simply start the Bull workers instead: `bullWorkerMain()` is private to each
 * worker module (only `pollerMain` is exported). A Redis-backed deployment is therefore the
 * multi-process topology — `docker-compose.workers.yml` — not this file.
 */
export function assertSingleProcessTopology(): void {
  const redisUrl = (process.env.REDIS_URL || '').trim();
  if (!redisUrl || isInMemoryForced()) return;

  throw new Error(
    'Refusing to start the single-process entry: REDIS_URL is set but FORCE_INMEMORY is not enabled.\n' +
      '  In this combination the API enqueues to BullMQ/Redis while this entry runs the in-memory\n' +
      '  pollers, so jobs are accepted and never processed — silently.\n' +
      '  Fix one of:\n' +
      '    • set FORCE_INMEMORY=1   (single-process, no broker — the Wave 8-lite staging topology), or\n' +
      '    • unset REDIS_URL        (same effect; the queues fall back to in-memory), or\n' +
      '    • run dist/src/server.js plus the separate workers (docker-compose.workers.yml) if you\n' +
      '      genuinely want the Redis-backed multi-process topology.'
  );
}

assertSingleProcessTopology();

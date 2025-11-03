import { EventEmitter } from 'events';
import Redis from 'ioredis';
export type SubmissionEvent = { submissionId: string; status: string; payload?: any };

// In-process EventEmitter (fast) but if REDIS_URL is present we also use Redis pub/sub so
// worker processes (separate Node processes) can publish events that the API server will receive.
const ee = new EventEmitter();

const redisUrl = process.env.REDIS_URL;
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

if (redisUrl) {
  // Probe Redis first with a short-lived client. If ping succeeds we create
  // persistent publisher/subscriber clients; otherwise we skip creating them
  // and silently fall back to the in-process emitter.
  (async () => {
    const probeOpts: any = { connectTimeout: 1000, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null };
    const probe = new Redis(redisUrl, probeOpts);
    try {
      await probe.ping();
    } catch (e) {
      console.warn('Redis unreachable — submissionEmitter will use in-process emitter');
      try { probe.disconnect(); } catch {}
      return;
    }
    try {
      try { probe.disconnect(); } catch {}

      const redisOpts: any = { maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null };
      publisher = new Redis(redisUrl, redisOpts);
      subscriber = new Redis(redisUrl, redisOpts);

      // attach error handlers to avoid unhandled 'error' events crashing the process
      const attachErrHandlers = (r: Redis) => {
        r.on('error', (err) => {
          try {
            console.warn('Redis client error (submissionEmitter):', err && err.message ? err.message : err);
          } catch {}
        });
        r.on('close', () => {
          try { console.warn('Redis client closed (submissionEmitter)'); } catch {}
        });
        r.on('end', () => {
          try { console.warn('Redis client ended (submissionEmitter)'); } catch {}
        });
      };
      attachErrHandlers(publisher);
      attachErrHandlers(subscriber);

      // attach pmessage handler
      subscriber.on('pmessage', (_pattern, channel, message) => {
        try {
          const payload = JSON.parse(message);
          const submissionId = channel.replace(/^submission:/, '');
          ee.emit(submissionId, payload);
        } catch (e) {
          console.error('Failed to parse submission event message', e);
        }
      });

      // subscribe when ready
      const doPsubscribe = () => {
        try {
          subscriber.psubscribe('submission:*').catch((e) => console.error('Redis psubscribe failed', e));
        } catch (e) {
          console.error('Redis psubscribe failed', e);
        }
      };
      if ((subscriber as any).status === 'ready') {
        doPsubscribe();
      } else {
        subscriber.once('ready', doPsubscribe);
      }
    } catch (e) {
      console.warn('Failed to initialize Redis pub/sub for submissionEmitter', e);
      try { probe.disconnect(); } catch {}
      publisher = null;
      subscriber = null;
    }
  })();
}

export function emitSubmissionEvent(e: SubmissionEvent) {
  // emit locally
  try {
    ee.emit(e.submissionId, e);
  } catch (_) {
    // ignore
  }
  // publish over redis so other processes (workers) can publish events
  if (publisher) {
    try {
      publisher.publish(`submission:${e.submissionId}`, JSON.stringify(e)).catch(() => {});
    } catch (_) {
      // ignore
    }
  }
}

export function onSubmissionEvent(submissionId: string, cb: (e: SubmissionEvent) => void) {
  ee.on(submissionId, cb);
  return () => ee.off(submissionId, cb);
}

export default ee;

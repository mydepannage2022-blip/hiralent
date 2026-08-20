// backend/src/bootstrap/supervise.ts
//
// Poller supervision for the single-process staging entry (Wave 8-lite / W-2).
//
// Kept as its own dependency-light module (no prisma / app / worker imports) for the same
// reason `services/runner.security.ts` is: the probe can import and exercise it directly under
// tsx without booting the server. Supervision that only exists inside `staging-entry.ts` cannot
// be tested at all, because importing that file starts an HTTP listener.
//
// The behaviour being protected: in the multi-process topology a worker that dies just restarts
// its own container. In the single-process topology it shares a process with the HTTP API, so
// the stock runners' `process.exit(1)` (jobApplication-outbox.runner.ts:29) would take the API
// down with it. Supervision converts "one poller died" from an outage into a log line.

export interface SuperviseOptions {
  /** Delay before a stopped/crashed poller is started again. */
  restartDelayMs?: number;
  /** Observation hook — the probe uses it; production passes nothing and gets console logs. */
  onEvent?: (event: SuperviseEvent, name: string, err?: unknown) => void;
}

export type SuperviseEvent = 'started' | 'returned' | 'crashed';

export interface SupervisedHandle {
  /** Stop supervising: cancels a pending restart. A poller already running is NOT interrupted. */
  stop(): void;
  /** How many times the poller has been (re)started after its first launch. */
  restarts(): number;
}

export const DEFAULT_RESTART_DELAY_MS = 5_000;

/**
 * Run a never-returning poller, keeping it alive without ever letting it kill the process.
 *
 * Both outcomes are treated as failures and restarted:
 *   - rejection  → something structural broke (lost pool, bad migration)
 *   - resolution → also a bug; every supervised poller is an infinite loop, so returning at all
 *                  means the loop exited
 *
 * Restarting beats both alternatives: exiting takes the API down, and doing nothing silently
 * strands every job on that queue for the life of the container.
 */
export function supervise(
  name: string,
  start: () => Promise<unknown>,
  opts: SuperviseOptions = {}
): SupervisedHandle {
  const restartDelayMs = opts.restartDelayMs ?? DEFAULT_RESTART_DELAY_MS;
  const emit =
    opts.onEvent ??
    ((event: SuperviseEvent, poller: string, err?: unknown) => {
      if (event === 'started') return;
      const verb = event === 'crashed' ? 'crashed' : 'returned unexpectedly';
      const log = event === 'crashed' ? console.error : console.warn;
      log(`${event === 'crashed' ? '❌' : '⚠️ '} [supervise] poller "${poller}" ${verb} — restarting in ${restartDelayMs}ms`, err ?? '');
    });

  let stopped = false;
  let restarts = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule(): void {
    if (stopped) return;
    timer = setTimeout(() => {
      timer = null;
      restarts += 1;
      attempt();
    }, restartDelayMs);
  }

  function attempt(): void {
    if (stopped) return;
    emit('started', name);
    // Guard against a `start` that throws synchronously — that would escape the .then() chain
    // and become an unhandled exception, i.e. exactly the process kill we are preventing.
    let p: Promise<unknown>;
    try {
      p = start();
    } catch (err) {
      emit('crashed', name, err);
      schedule();
      return;
    }
    p.then(
      () => {
        emit('returned', name);
        schedule();
      },
      (err: unknown) => {
        emit('crashed', name, err);
        schedule();
      }
    );
  }

  attempt();

  return {
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    restarts() {
      return restarts;
    },
  };
}

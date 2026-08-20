// backend/src/__tests__/staging-supervisor.probe.ts
//
// Wave 8-lite / W-2 — proves the single-process staging entry's poller supervision.
//
// Why this exists: in the single-process topology the pollers share a process with the HTTP
// API, so "a poller died" must NOT mean "the API died". That is the entire safety claim of
// staging-entry.ts, and it is invisible in a boot smoke test — a healthy boot proves the
// pollers started, never that a crashing one is contained and restarted.
//
// The real module is imported (bootstrap/supervise.ts), not a copy — a probe that re-implements
// the logic it is testing proves nothing.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/staging-supervisor.probe.ts
// (No DB, no Redis, no network — this module is dependency-light on purpose.)

import { supervise, DEFAULT_RESTART_DELAY_MS, type SuperviseEvent } from '../bootstrap/supervise';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main(): Promise<void> {
  console.log('\n── staging supervisor probe ──\n');

  // ── 1. A poller that rejects is restarted, repeatedly ──────────────────────────────────
  {
    let calls = 0;
    const events: SuperviseEvent[] = [];
    const h = supervise(
      'always-rejects',
      async () => {
        calls += 1;
        throw new Error('boom');
      },
      { restartDelayMs: 20, onEvent: (e) => events.push(e) }
    );

    await wait(200);
    h.stop();
    const callsAtStop = calls;

    check('rejecting poller is restarted (not abandoned after the first crash)', calls > 3, `calls=${calls}`);
    check('every failure is reported as "crashed"', events.filter((e) => e === 'crashed').length === calls, `crashed=${events.filter((e) => e === 'crashed').length} calls=${calls}`);
    check('restarts() counts the relaunches', h.restarts() === calls - 1, `restarts=${h.restarts()} calls=${calls}`);

    // stop() must actually stop — otherwise a probe/test could never release the process, and
    // a shutdown would keep resurrecting pollers.
    await wait(120);
    check('stop() halts further restarts', calls === callsAtStop, `calls grew ${callsAtStop} → ${calls}`);
  }

  // ── 2. A poller that RETURNS is also restarted ─────────────────────────────────────────
  // Every supervised poller is an infinite loop, so a clean return is a bug, not success.
  {
    let calls = 0;
    const h = supervise(
      'returns-immediately',
      async () => {
        calls += 1;
      },
      { restartDelayMs: 20 }
    );
    await wait(150);
    h.stop();
    check('poller that returns normally is also restarted', calls > 3, `calls=${calls}`);
  }

  // ── 3. A synchronously-throwing start is contained ─────────────────────────────────────
  // This is the case that would escape a bare `.then()` chain and become an unhandled
  // exception — i.e. the exact process kill the supervisor exists to prevent.
  {
    let calls = 0;
    const h = supervise(
      'throws-synchronously',
      (): Promise<unknown> => {
        calls += 1;
        throw new Error('sync boom');
      },
      { restartDelayMs: 20 }
    );
    await wait(150);
    h.stop();
    check('synchronous throw is caught and restarted (never an unhandled exception)', calls > 3, `calls=${calls}`);
  }

  // ── 4. A healthy poller is left alone ──────────────────────────────────────────────────
  // Guard-teeth: without this, a supervisor that restarted everything constantly would still
  // pass checks 1–3.
  {
    let calls = 0;
    const h = supervise(
      'healthy-infinite-loop',
      async () => {
        calls += 1;
        await wait(10_000); // never resolves within the probe window
      },
      { restartDelayMs: 20 }
    );
    await wait(150);
    h.stop();
    check('healthy poller is started exactly once (no needless restarts)', calls === 1, `calls=${calls}`);
  }

  // ── 5. The process survived all of the above ───────────────────────────────────────────
  check('probe process is still alive after 3 crashing pollers', true);

  // ── 6. The production default is not a hot-loop ────────────────────────────────────────
  check('default restart delay is a sane backoff', DEFAULT_RESTART_DELAY_MS >= 1_000, `${DEFAULT_RESTART_DELAY_MS}ms`);

  console.log(`\n── ${passed} passed, ${failed} failed ──\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('probe crashed:', e);
  process.exit(1);
});

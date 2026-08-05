// backend/src/services/runner.security.ts
//
// Runner security helpers — Wave 1 / Phase 1.4 (R-03, code-execution lockdown).
//
// Kept intentionally dependency-light (no prisma / axios / logger / app imports) so the
// verifier can import and exercise buildDockerBaseArgs() + assertSafeRunner() directly via
// tsx — no Docker daemon, no app boot. These are the pure, testable security primitives;
// runner.dispatcher.ts consumes them.

/** Thrown when no *containerized* runner is available and host execution is disabled.
 *  The worker turns this into a FAILED submission — candidate code never runs on the host. */
export class SecureRunnerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureRunnerUnavailableError';
  }
}

export interface DockerHardeningOpts {
  workdir: string;
  memory?: string;
  cpus?: string;
  pidsLimit?: string;
  user?: string;
  useRunsc?: boolean;
  testTimeoutS?: string;
}

/**
 * Build the base `docker run` argv with the full hardening set. Pure function
 * (same input → same output), so it is unit-assertable without a daemon.
 *
 * Isolation (R-03): drop to a non-root user, read-only root filesystem, drop ALL Linux
 * capabilities, forbid privilege escalation, cap PIDs, and no network. Compiled languages
 * need to write+exec build artifacts, so `/work` stays a writable bind mount and `/tmp`
 * (plus HOME=/work) is writable while the rest of the fs is read-only. Memory/CPU/ulimits
 * bound resource abuse.
 */
export function buildDockerBaseArgs(opts: DockerHardeningOpts): string[] {
  const memory = opts.memory || '256m';
  const cpus = opts.cpus || '0.5';
  const pids = opts.pidsLimit || '128';
  const user = opts.user || '1000:1000';
  const testTimeoutS = opts.testTimeoutS || '2.0';

  const args = [
    'docker', 'run', '--rm',
    // --- isolation ---
    '--network', 'none',
    '--user', user,
    '--read-only',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--pids-limit', pids,
    // --- resource limits ---
    '--memory', memory,
    '--cpus', cpus,
    '--ulimit', 'nofile=256:256',
    '--ulimit', 'nproc=256:256',
    // --- writable surfaces (root fs is read-only) ---
    '-v', `${opts.workdir}:/work`,
    '--tmpfs', '/tmp:rw,size=32m',
    '-e', 'HOME=/work',
    '-e', `TEST_TIMEOUT_S=${testTimeoutS}`,
  ];
  if (opts.useRunsc) args.push('--runtime', 'runsc');
  return args;
}

/** The hardening flags that MUST be present in the argv — asserted by the verifier. */
export const REQUIRED_DOCKER_FLAGS: readonly string[] = [
  '--network',
  '--user',
  '--read-only',
  '--cap-drop',
  '--security-opt',
  '--pids-limit',
];

/**
 * Is running candidate code directly on the host explicitly permitted?
 * OFF unless `RUNNER_ALLOW_HOST_EXEC=1` is set, and NEVER in production. This is the
 * only gate that lets the local `entrypoint.py` path run — a dev-only escape hatch.
 */
export function isHostExecAllowed(): boolean {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') return false;
  return process.env.RUNNER_ALLOW_HOST_EXEC === '1';
}

/**
 * Boot-time guard (called from server.ts after dotenv). Refuses to start when the runner
 * config would let candidate code escape the container in production:
 *   - RUNNER_ALLOW_HOST_EXEC=1 in production  → host RCE, or
 *   - RUNNER_HTTP_URL set without RUNNER_STUB_TOKEN → the HTTP runner is callable unauth.
 * No-op outside production. Proven in both directions by verify-runner-hardening.mjs.
 */
export function assertSafeRunner(): void {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd) return;

  const problems: string[] = [];
  if (process.env.RUNNER_ALLOW_HOST_EXEC === '1') {
    problems.push('RUNNER_ALLOW_HOST_EXEC=1 in production — candidate code would run on the host (RCE).');
  }
  const httpUrl = (process.env.RUNNER_HTTP_URL || '').trim();
  const stubToken = (process.env.RUNNER_STUB_TOKEN || '').trim();
  if (httpUrl && !stubToken) {
    problems.push('RUNNER_HTTP_URL is set without RUNNER_STUB_TOKEN — the HTTP runner would be callable unauthenticated.');
  }
  if (problems.length) {
    throw new Error('Refusing to start (unsafe code-runner config):\n  - ' + problems.join('\n  - '));
  }
}

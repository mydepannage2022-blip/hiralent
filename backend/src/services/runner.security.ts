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
 * Is the process running in an explicitly-declared local/dev environment?
 *
 * SECURITY (fail-closed): only a KNOWN dev/test value counts as non-production. An unset,
 * empty, misspelled ("prod"), or novel ("staging") NODE_ENV is treated as PRODUCTION so the
 * host-exec escape hatch can never open by accident on a mis-declared deploy. The old code
 * did the inverse (`=== 'production'`), which meant any non-canonical NODE_ENV silently
 * re-enabled host RCE the moment RUNNER_ALLOW_HOST_EXEC=1 leaked in from a copied .env.
 */
function isExplicitlyNonProd(): boolean {
  const env = (process.env.NODE_ENV || '').toLowerCase().trim();
  return env === 'development' || env === 'dev' || env === 'test' || env === 'local';
}

/**
 * Is running candidate code directly on the host explicitly permitted?
 * OFF unless BOTH an explicit dev/test NODE_ENV AND `RUNNER_ALLOW_HOST_EXEC=1` are set.
 * This is the only gate that lets the local `entrypoint.py` path run — a dev-only escape
 * hatch that fails closed everywhere else.
 */
export function isHostExecAllowed(): boolean {
  if (!isExplicitlyNonProd()) return false;
  return process.env.RUNNER_ALLOW_HOST_EXEC === '1';
}

/**
 * Boot-time guard (called from server.ts after dotenv). Refuses to start when the runner
 * config would let candidate code escape the container in a production-treated environment:
 *   - RUNNER_ALLOW_HOST_EXEC=1  → host RCE, or
 *   - RUNNER_HTTP_URL set without RUNNER_STUB_TOKEN → the HTTP runner is callable unauth.
 * No-op ONLY in an explicitly-declared dev/test env. Proven both directions by
 * verify-runner-hardening.mjs.
 */
export function assertSafeRunner(): void {
  if (isExplicitlyNonProd()) return;

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

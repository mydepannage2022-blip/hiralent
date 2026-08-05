// backend/src/config/requireEnv.ts
//
// Fail-fast environment access. Wave 1 / Phase 1.1 (Secrets rotation).
//
// Purpose: secrets must come from the environment and, when missing, fail LOUDLY
// instead of silently falling back to a weak, publicly-known default value.
// A forgeable/guessable secret is worse than a crash.
//
// Usage patterns:
//   - Core secrets that the whole app needs (JWT_SECRET, ADMIN_JWT_SECRET) are asserted
//     once at boot via assertCoreSecrets(), called in server.ts right AFTER dotenv.config().
//     That is ordering-safe (dotenv has definitely run) and gives one clear early error.
//   - Read a required secret lazily at call time with requireEnv('NAME'). Reading lazily
//     (inside a getter/function) rather than at module-load avoids import-ordering pitfalls
//     where a module could evaluate before dotenv.config() has populated process.env.
//   - Read an optional value (integration keys, tunables) with optionalEnv('NAME', fallback).

/**
 * Return the value of a required environment variable, or throw a clear error.
 * Blank/whitespace-only values are treated as missing.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in the service environment (.env) — no default is provided for secrets.`
    );
  }
  return value;
}

/**
 * Return an optional environment variable, falling back to `fallback` when unset/blank.
 * Use ONLY for non-secret tunables — never to supply a default credential.
 */
export function optionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return value;
}

/**
 * Core auth secrets without which the app cannot run securely. Asserted once at boot.
 * Throws (crashing boot) if any is missing — by design.
 */
const CORE_SECRETS = ['JWT_SECRET', 'ADMIN_JWT_SECRET'] as const;

export function assertCoreSecrets(): void {
  const missing = CORE_SECRETS.filter((name) => {
    const v = process.env[name];
    return v === undefined || v.trim() === '';
  });
  if (missing.length) {
    throw new Error(
      `Refusing to start: missing required secret(s): ${missing.join(', ')}. ` +
        `Set them in the environment before boot (see backend/.env.example).`
    );
  }
}

/**
 * Guard the ACTUAL runtime DATABASE_URL — not just the .env.example template — against
 * an unbounded connection pool (R-06).
 *
 * Why: the whole point of the Prisma-singleton + pooling work is to keep the process from
 * opening an unbounded number of Postgres connections. But Prisma's pool size is read from
 * the `connection_limit` param ON the URL; if a deploy pastes a bare provider connection
 * string (no `?connection_limit=`), Prisma silently defaults to `num_cpus * 2 + 1` PER
 * process. On a many-core host across web + worker processes that blows past Postgres'
 * `max_connections` and reproduces the exact outage this Wave exists to prevent — while a
 * gate that only inspects `.env.example` stays green.
 *
 * In production a missing `connection_limit` is fatal (fail fast at boot). Outside
 * production it is a loud warning so local dev still runs.
 */
export function assertDbPoolConfig(): void {
  const url = process.env.DATABASE_URL;
  const isProd = process.env.NODE_ENV === 'production';

  if (url === undefined || url.trim() === '') {
    if (isProd) {
      throw new Error(
        'Refusing to start: DATABASE_URL is not set. Set it (with a ?connection_limit= param) before boot.'
      );
    }
    console.warn('⚠️  [db-pool] DATABASE_URL is not set — skipping pool-config check (non-production).');
    return;
  }

  // Query string lives after the first '?'. Accept connection_limit anywhere in it.
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const m = /(?:^|&)connection_limit=(\d+)/.exec(query);
  const limit = m ? Number(m[1]) : null;

  if (limit === null || !Number.isFinite(limit) || limit < 1) {
    const msg =
      `DATABASE_URL is missing a valid \`connection_limit=\` param. Without it Prisma defaults the ` +
      `pool to (num_cpus * 2 + 1) PER process, which can exhaust Postgres max_connections under load ` +
      `(R-06). Add e.g. \`?connection_limit=10&pool_timeout=20\` — see backend/.env.example.`;
    if (isProd) {
      throw new Error(`Refusing to start: ${msg}`);
    }
    console.warn(`⚠️  [db-pool] ${msg}`);
    return;
  }

  if (!/(?:^|&)pool_timeout=\d+/.test(query)) {
    console.warn(
      '⚠️  [db-pool] DATABASE_URL has connection_limit but no pool_timeout= — add one to bound queue waits (see .env.example).'
    );
  }
}

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

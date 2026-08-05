import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedis } from "../lib/redis";

/**
 * Rate-limiting for the edge (Phase 1.5, R-28).
 *
 * A single global limiter plus stricter per-area limiters. The store is chosen at
 * boot time:
 *   - REDIS_URL set  -> RedisStore backed by the shared ioredis singleton, so the
 *     limit is enforced ACROSS every backend instance (horizontal scale). This is
 *     what makes "N requests total across 2 pods -> 429" hold.
 *   - REDIS_URL unset -> express-rate-limit's default in-memory store (single
 *     process only) plus a one-time warning. We deliberately DEGRADE here instead
 *     of throwing: a limiter must never turn a missing Redis into a boot crash
 *     (dev/CI run without Redis). Availability > perfect distributed limiting.
 *
 * Every window/max is env-driven with a sane prod default so ops can tune limits
 * (and the verifier can inject tiny values to force a 429 deterministically).
 */

// Kill-switch: force the in-memory store even when REDIS_URL is set. Useful to keep
// the app's queue Redis untouched while running the limiter per-process (tests, or an
// ops override if the shared limiter ever misbehaves).
const FORCE_MEMORY = process.env.RATE_LIMIT_FORCE_MEMORY === "1";
const HAS_REDIS = !!process.env.REDIS_URL && !FORCE_MEMORY;
// Optional namespace prepended to every Redis key. Lets separate deployments (or a
// test run) share one Redis without their counters colliding. Empty by default.
const KEY_PREFIX = process.env.RATE_LIMIT_PREFIX ?? "";
let warnedNoRedis = false;

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Build a distinct store per limiter. Redis keys are namespaced by `prefix` so
 * the auth/OCR/etc. buckets never collide. When Redis is absent we return
 * undefined and express-rate-limit falls back to its per-process MemoryStore.
 */
function makeStore(prefix: string) {
  if (!HAS_REDIS) {
    if (!warnedNoRedis) {
      warnedNoRedis = true;
      console.warn(
        "[rateLimit] REDIS_URL not set — using in-memory rate-limit store. " +
          "Limits are per-process only and NOT shared across instances. Set REDIS_URL in production."
      );
    }
    return undefined;
  }
  return new RedisStore({
    prefix: KEY_PREFIX + prefix,
    // ioredis: .call(cmd, ...args) returns a Promise, which is exactly the
    // sendCommand contract rate-limit-redis expects.
    sendCommand: (...args: string[]) => getRedis().call(args[0], ...args.slice(1)) as Promise<any>,
  });
}

interface LimiterOpts {
  windowMs: number;
  max: number;
  prefix: string;
}

function makeLimiter({ windowMs, max, prefix }: LimiterOpts): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    store: makeStore(prefix),
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
}

/** All requests. High ceiling — protects against blunt floods without hurting normal use. */
export const globalLimiter = makeLimiter({
  windowMs: num("RATE_LIMIT_GLOBAL_WINDOW_MS", 15 * 60 * 1000),
  max: num("RATE_LIMIT_GLOBAL_MAX", 600),
  prefix: "rl:global:",
});

/** Auth surface (login/refresh/forgot). Strict — this is the credential-guessing target. */
export const authLimiter = makeLimiter({
  windowMs: num("RATE_LIMIT_AUTH_WINDOW_MS", 15 * 60 * 1000),
  max: num("RATE_LIMIT_AUTH_MAX", 20),
  prefix: "rl:auth:",
});

/** OCR uploads — heavy CPU (Tesseract). Strict. */
export const ocrLimiter = makeLimiter({
  windowMs: num("RATE_LIMIT_OCR_WINDOW_MS", 15 * 60 * 1000),
  max: num("RATE_LIMIT_OCR_MAX", 30),
  prefix: "rl:ocr:",
});

/** Code submissions / executions — enqueue runner jobs. */
export const submissionLimiter = makeLimiter({
  windowMs: num("RATE_LIMIT_SUBMISSION_WINDOW_MS", 15 * 60 * 1000),
  max: num("RATE_LIMIT_SUBMISSION_MAX", 60),
  prefix: "rl:submission:",
});

/** Routes that fan out to the (paid) AI services. */
export const aiLimiter = makeLimiter({
  windowMs: num("RATE_LIMIT_AI_WINDOW_MS", 15 * 60 * 1000),
  max: num("RATE_LIMIT_AI_MAX", 60),
  prefix: "rl:ai:",
});

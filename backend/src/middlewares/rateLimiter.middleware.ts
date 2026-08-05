/**
 * Deprecated. Rate limiting now lives in ./rateLimit.ts, which provides a
 * Redis-backed (cross-instance) store and per-area limiters. This file is kept
 * only as a backward-compatible alias — new code should import the named limiters
 * (authLimiter/ocrLimiter/submissionLimiter/aiLimiter/globalLimiter) directly.
 */
export { authLimiter as limiter } from "./rateLimit";

// backend/src/config/secretCompare.ts
//
// Constant-time comparison for shared secrets (internal service keys, bearer tokens).
// A plain `===` / `!==` on a secret short-circuits at the first differing byte, which
// leaks the length of the matching prefix through response timing and lets an attacker
// recover a token byte-by-byte given enough samples.
//
// Both sides are hashed to a fixed 32 bytes first so timingSafeEqual can never throw on
// a length mismatch — and so the expected secret's length is not leaked either.

import crypto from 'crypto';

export function secretsMatch(provided: string | undefined | null, expected: string | undefined | null): boolean {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

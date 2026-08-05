// backend/src/utils/tokenHash.ts
//
// Single source of truth for hashing opaque tokens (access JWTs and refresh
// tokens) before they are stored in / looked up from the database.
//
// Wave 1 / Phase 1.2: sessions and the JWT blacklist MUST use the SAME
// deterministic hash so revocation actually matches. Previously sessions were
// stored with a salted bcrypt hash while the blacklist compared sha256 — the two
// never matched, so logout/terminate silently revoked nothing. JWTs and random
// refresh tokens are already high-entropy, so a fast deterministic sha256 is the
// correct choice (bcrypt buys nothing here and breaks equality lookups).

import crypto from 'crypto';

/** Deterministic sha256 hex digest, used for session + blacklist token lookups. */
export const sha256Hex = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// backend/src/utils/tempPassword.ts
//
// Cryptographically-secure temporary password generator. Wave 1 / Phase 1.2 (R-28).
// Replaces Math.random() (predictable, not for secrets) with crypto.randomInt.
// Guarantees at least one upper / lower / digit / symbol so the result also
// satisfies typical password-complexity policies.

import crypto from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O (ambiguous)
const LOWER = 'abcdefghijkmnopqrstuvwxyz'; // no l
const DIGITS = '23456789'; // no 0/1
const SYMBOLS = '!@#$%^&*-_';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

const pick = (set: string): string => set[crypto.randomInt(set.length)];

/** Generate a random temp password (default 16 chars) with guaranteed complexity. */
export const generateTempPassword = (length = 16): string => {
  const size = Math.max(12, length);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(ALL));

  // Fisher–Yates shuffle with a CSPRNG so the guaranteed chars aren't positionally predictable.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

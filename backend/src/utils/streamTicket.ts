// backend/src/utils/streamTicket.ts
//
// Short-lived, tamper-proof capability ticket for the submission SSE stream.
//
// EventSource cannot send an Authorization header, so the stream used to accept the
// caller's real access token via ?access_token=. That put a full ~15-min account
// credential in the URL (proxy logs / browser history). Instead we mint a tiny ticket,
// behind checkAuth + ownership, that is bound to ONE submission and ONE user and lives
// only ~60s. A leaked stream URL then exposes at most a 60-second view of that single
// submission — never the account. HMAC-signed with the server secret, so unforgeable.

import crypto from "crypto";

// Reuse FILE_URL_SECRET / JWT_SECRET so no new mandatory secret is introduced.
function ticketSecret(): string {
  const s = process.env.FILE_URL_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("FILE_URL_SECRET (or JWT_SECRET) is not set");
  return s;
}

// 5 min: long enough that a brief network blip + EventSource auto-reconnect (which reuses
// the same ticket URL) still succeeds, short enough that a leaked stream URL is useless fast.
// An already-open stream is unaffected by expiry — the ticket is only checked at connect.
const DEFAULT_TTL_SECONDS = Number(process.env.STREAM_TICKET_TTL_SECONDS) || 300;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Sign a ticket bound to (submissionId, userId): `<payload>.<sig>` where
 * payload = base64url(JSON({ s, u, e: expiryEpochSec })).
 */
export function signStreamTicket(
  submissionId: string,
  userId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(Buffer.from(JSON.stringify({ s: submissionId, u: userId, e: exp }), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", ticketSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Verify a ticket. Returns { submissionId, userId } if the signature is valid and the
 * ticket has not expired; otherwise null. Constant-time signature comparison.
 */
export function verifyStreamTicket(token: string): { submissionId: string; userId: string } | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = b64url(crypto.createHmac("sha256", ticketSecret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let decoded: { s?: string; u?: string; e?: number };
  try {
    decoded = JSON.parse(fromB64url(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (!decoded || typeof decoded.s !== "string" || typeof decoded.u !== "string" || typeof decoded.e !== "number") {
    return null;
  }
  if (Math.floor(Date.now() / 1000) > decoded.e) return null; // expired
  return { submissionId: decoded.s, userId: decoded.u };
}

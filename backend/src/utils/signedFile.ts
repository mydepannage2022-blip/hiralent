// backend/src/utils/signedFile.ts
//
// Short-lived, tamper-proof capability tokens for serving local `uploads/` files.
//
// We replaced `express.static('/uploads')` — which served every CV/resume publicly,
// forever, to anyone who knew the path — with a route that only accepts a signed,
// expiring token. The token itself IS the capability: it encodes the relative file
// path + an expiry, HMAC-signed with a server secret, so it cannot be forged or
// replayed after it expires. Minting the token is done behind checkAuth.

import crypto from "crypto";
import path from "path";

// Reuse JWT_SECRET when a dedicated FILE_URL_SECRET is not set, so no new secret is
// mandatory for the feature to work — but allow separating them in production.
function fileSecret(): string {
  const s = process.env.FILE_URL_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("FILE_URL_SECRET (or JWT_SECRET) is not set");
  return s;
}

const DEFAULT_TTL_SECONDS = Number(process.env.FILE_URL_TTL_SECONDS) || 600; // 10 min

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Normalize a caller-supplied path to a SAFE relative path under `uploads/`.
 * Accepts either a stored value like `/uploads/resumes/cv/x.pdf`, `uploads/...`,
 * or a bare `resumes/cv/x.pdf`. Returns the path relative to the uploads root
 * (e.g. `resumes/cv/x.pdf`), or null if it escapes the uploads root.
 */
export function toUploadsRelative(stored: string): string | null {
  if (!stored) return null;
  let rel = stored.trim();
  // strip absolute http(s) origins if a full URL was stored
  rel = rel.replace(/^https?:\/\/[^/]+/i, "");
  // strip leading slashes and an optional leading `uploads/`
  rel = rel.replace(/^\/+/, "");
  rel = rel.replace(/^uploads\//i, "");
  // POSIX-normalize and reject traversal
  const normalized = path.posix.normalize(rel);
  if (!normalized || normalized.startsWith("..") || path.posix.isAbsolute(normalized)) return null;
  if (normalized.split("/").some((seg) => seg === "..")) return null;
  return normalized;
}

/**
 * Sign a relative uploads path into an opaque token: `<payload>.<sig>` where
 * payload = base64url(JSON({ p: relPath, e: expiryEpochSec })).
 * Returns null if the path is unsafe.
 */
export function signFileToken(storedPath: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): string | null {
  const rel = toUploadsRelative(storedPath);
  if (!rel) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(Buffer.from(JSON.stringify({ p: rel, e: exp }), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", fileSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Verify a token. Returns the safe relative path if the signature is valid and the
 * token has not expired; otherwise null. Constant-time signature comparison.
 */
export function verifyFileToken(token: string): { relPath: string } | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = b64url(crypto.createHmac("sha256", fileSecret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let decoded: { p?: string; e?: number };
  try {
    decoded = JSON.parse(fromB64url(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (!decoded || typeof decoded.p !== "string" || typeof decoded.e !== "number") return null;
  if (Math.floor(Date.now() / 1000) > decoded.e) return null; // expired

  const rel = toUploadsRelative(decoded.p);
  if (!rel) return null;
  return { relPath: rel };
}

/**
 * Build the app-absolute signed URL for a stored uploads path, or return the value
 * unchanged if it's already an external URL (e.g. Cloudinary) or empty.
 */
export function toSignedFileUrl(storedPath: string | null | undefined, ttlSeconds?: number): string | null {
  if (!storedPath) return null;
  if (/^https?:\/\//i.test(storedPath) && !/\/uploads\//i.test(storedPath)) {
    // an external absolute URL that is NOT one of our /uploads links — leave as-is
    return storedPath;
  }
  const token = signFileToken(storedPath, ttlSeconds);
  if (!token) return null;
  const base = (process.env.APP_URL || process.env.BACKEND_URL || "").replace(/\/+$/, "");
  return `${base}/api/v1/files/${token}`;
}

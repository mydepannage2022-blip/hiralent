// frontend/src/lib/config/api.ts
//
// Single source of truth for every URL the frontend talks to (R-27).
//
// Before this, the API host was expressed four different ways (NEXT_PUBLIC_API_URL,
// NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SOCKET_URL) with two
// incompatible suffix conventions, and ~47 files hardcoded `http://localhost:5000`. A
// staging/prod build silently talked to localhost. This module fixes ONE canonical
// convention — NEXT_PUBLIC_API_URL = the bare host (scheme + host + port, NO path) — and
// derives every concrete base from it.
//
// ── Canonical var ────────────────────────────────────────────────────────────
//   NEXT_PUBLIC_API_URL = http://localhost:5000   (bare host, no /api suffix)
// Older vars are still accepted as a backward-compat fallback (see HOST below) so an
// un-migrated deployment keeps working, but new/redeployed envs should set NEXT_PUBLIC_API_URL.
//
// ⚠️ Next.js inlines NEXT_PUBLIC_* into the CLIENT bundle at BUILD time, and only when the
// reference is a *literal* member expression (`process . env . NEXT_PUBLIC_<NAME>`). Do NOT refactor
// the reads below into a `getEnv(name)` helper, dynamic key, or destructure — that breaks the
// static replacement and the value becomes `undefined` in the browser (while SSR/Node still
// work, so it fails silently in production only). Keep each read as a full literal.

// NEXT_PUBLIC_BASE_URL historically carries a trailing `/api/v1`; strip it back to a bare host.
function stripApiV1(u: string): string {
  return u.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
}

// Resolution order: canonical → legacy base (suffix-stripped) → legacy alt → localhost default.
// Each NEXT_PUBLIC_* read below is a literal so Next inlines it before these run at runtime.
const HOST =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_BASE_URL ? stripApiV1(process.env.NEXT_PUBLIC_BASE_URL) : "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000"; // the ONE sanctioned localhost literal in frontend/src

/** Bare API host — scheme + host + port, no path. Use for building non-standard URLs. */
export const API_HOST = HOST.replace(/\/+$/, "");

/** Primary REST base: `${host}/api/v1`. Append bare paths, e.g. `${API_V1_BASE}/auth/login`. */
export const API_V1_BASE = `${API_HOST}/api/v1`;

/**
 * Legacy `/api` base (NOT `/api/v1`). Exists ONLY for `POST /api/ocr`, which has no `/api/v1`
 * alias on the backend (see backend app.ts). Everything else is `/api/v1` — do not "clean up".
 */
export const API_ROOT = `${API_HOST}/api`;

/** Socket.IO host — the bare host, overridable independently via NEXT_PUBLIC_SOCKET_URL. */
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_HOST;

/** User-facing frontend base (self-links, share URLs). Env: NEXT_PUBLIC_FRONTEND_URL. */
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

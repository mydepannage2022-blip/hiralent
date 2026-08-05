// frontend/src/lib/auth/refresh.ts
//
// Client-side access-token rotation. Wave 1 / Phase 1.2.
//
// Access tokens are short-lived (~15m). This module silently exchanges the stored
// refresh token for a fresh access token via POST /auth/refresh. Two triggers use
// it: a proactive timer in AuthContext (refresh just before expiry) and a reactive
// 401 handler on the shared API clients. All callers share ONE in-flight request
// so a burst of 401s (or a timer + a 401 racing) only fires a single refresh.

import { API_V1_BASE } from "@/src/lib/config/api";

const BASE = API_V1_BASE;

const ACCESS_KEY = "authToken";
const REFRESH_KEY = "refreshToken";

let inFlight: Promise<string | null> | null = null;

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

/** Persist a freshly-issued access (and, when rotated, refresh) token. */
export function storeAuthTokens(accessToken: string, refreshToken?: string | null): void {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

/**
 * Best-effort server-side revocation. Fires POST /auth/logout with the current
 * access token so the session is deactivated + the token blacklisted immediately
 * (otherwise a "logged out" token stays valid until its ~15m expiry). The token is
 * read synchronously before any localStorage clear, `keepalive` lets the request
 * outlive the ensuing navigation, and it never throws or blocks the logout UX.
 */
export function logoutBackend(): void {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) return;
  try {
    void fetch(`${BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore — logout must never fail on the client */
  }
}

/** Wipe all auth state (used when the refresh token itself is rejected). */
export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("authUser");
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    // 401/403 => the refresh token is invalid/expired/revoked → this session is over.
    if (res.status === 401 || res.status === 403) {
      clearAuthTokens();
      return null;
    }
    if (!res.ok) return null; // transient (5xx) — keep tokens, allow a later retry

    const body = await res.json().catch(() => ({} as any));
    // Response envelope (R-36): tokens live under `data`, not at the top level.
    // Reading `body.token` here silently returned undefined → tokens never rotated
    // → users were signed out every ~15m. Read `body.data.token`.
    const payload = body?.data ?? body;
    if (!payload?.token) return null;

    storeAuthTokens(payload.token, payload.refreshToken);
    return payload.token as string;
  } catch {
    // Network error — don't destroy tokens; a subsequent attempt may succeed.
    return null;
  }
}

/**
 * Refresh the access token, coalescing concurrent callers into one request.
 * Resolves to the new access token, or null if refresh was not possible.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

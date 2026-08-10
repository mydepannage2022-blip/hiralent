// Shared client helper for the superadmin dashboard pages (Session 8).
//
// Admin pages authenticate with the admin session JWT stored in localStorage as
// `sessionToken` (minted by the /admin/auth MFA flow, ADMIN_JWT_SECRET) — NOT the
// candidate/company cookie session. Every admin endpoint speaks the standard
// { success:true, data } / { success:false, error } envelope. This helper attaches the
// bearer token, unwraps `data` on success, and throws a readable Error on failure.

import { API_V1_BASE } from "@/src/lib/config/api";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sessionToken");
}

export async function adminFetch<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_V1_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty/non-JSON body */
  }

  if (!res.ok || json?.success === false) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // Enveloped success → data; tolerate a bare body just in case.
  return (json?.data !== undefined ? json.data : json) as T;
}

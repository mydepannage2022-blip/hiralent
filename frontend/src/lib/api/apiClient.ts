// src/lib/api/apiClient.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_PREFIX = "/api/v1";

export type Audience = "CANDIDATE" | "COMPANY";

function readToken(keys: string[]) {
  if (typeof window === "undefined") return "";
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return "";
}

export function getAuthToken(audience: Audience) {
  if (audience === "CANDIDATE") return readToken(["authToken", "candidate_token", "token"]);
  return readToken(["authToken", "company_token", "token"]);
}

export async function apiFetch<T>(
  audience: Audience,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAuthToken(audience);

  const res = await fetch(`${BASE}${API_PREFIX}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || "Invalid JSON response");
  }
}

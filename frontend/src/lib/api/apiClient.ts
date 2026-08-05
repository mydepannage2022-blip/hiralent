// src/lib/api/apiClient.ts
import { refreshAccessToken } from "../auth/refresh";
import { API_HOST } from "@/src/lib/config/api";

const BASE = API_HOST;
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

  const doFetch = (bearer: string) =>
    fetch(`${BASE}${API_PREFIX}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        "Content-Type": "application/json",
      },
    });

  let res = await doFetch(token);

  // Reactive safety-net: on 401, refresh the access token once and retry.
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }

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

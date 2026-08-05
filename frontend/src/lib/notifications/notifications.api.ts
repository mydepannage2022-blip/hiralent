import type {
  NotificationAudience,
  NotificationListResponseDTO,
  NotificationUpdateResponseDTO,
} from "@/src/types/notifications.types";

import { API_HOST } from "@/src/lib/config/api";

const BASE = API_HOST;
const API_PREFIX = "/api/v1";

function readTokenFromStorage(keys: string[]) {
  if (typeof window === "undefined") return "";
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return "";
}

function getAuthToken(audience: NotificationAudience) {
  // ✅ d’après ton screenshot: authToken
  // + fallback au cas où
  if (audience === "CANDIDATE") return readTokenFromStorage(["authToken", "candidate_token", "token"]);
  return readTokenFromStorage(["authToken", "company_token", "token"]);
}

async function apiFetch<T>(
  audience: NotificationAudience,
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
    cache: "no-store",
  });

  // ✅ pour voir l’erreur exacte côté UI
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function listNotifications(
  audience: NotificationAudience,
  params?: { limit?: number; cursor?: string },
) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);

  const prefix = audience === "CANDIDATE" ? "/candidate" : "/company";
  const suffix = q.toString() ? `?${q.toString()}` : "";

  // ✅ backend: GET /api/v1/candidate/notifications
  return apiFetch<{ success: true; data: NotificationListResponseDTO }>(
    audience,
    `${prefix}/notifications${suffix}`,
  ).then((r) => r.data);
}

export async function markNotificationRead(
  audience: NotificationAudience,
  notificationId: string,
) {
  const prefix = audience === "CANDIDATE" ? "/candidate" : "/company";

  // ✅ backend: PATCH /api/v1/candidate/notifications/:id/read
  return apiFetch<{ success: true; data: { success: true } }>(
    audience,
    `${prefix}/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
}

export async function markAllNotificationsRead(audience: NotificationAudience) {
  const prefix = audience === "CANDIDATE" ? "/candidate" : "/company";

  // ✅ backend: PATCH /api/v1/candidate/notifications/read-all
  return apiFetch<{ success: true; data: { success: true } }>(
    audience,
    `${prefix}/notifications/read-all`,
    { method: "PATCH" },
  );
}

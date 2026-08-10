// src/lib/notifications/preferences.api.ts
//
// Role-neutral notification-preference persistence, backed by
// GET/PUT /api/v1/notification-preferences (keyed by the authenticated user).
// Used by the agency, company and candidate settings screens. Each screen owns
// its own key-set and merges the server response over its role defaults.

import { apiFetch, Audience } from "@/src/lib/api/apiClient";

export type NotificationPreferences = Record<string, boolean>;

type PrefsEnvelope = { success: boolean; data: NotificationPreferences };

export async function getNotificationPreferences(
  audience: Audience = "COMPANY"
): Promise<NotificationPreferences> {
  const res = await apiFetch<PrefsEnvelope>(audience, "/notification-preferences", {
    method: "GET",
  });
  return res?.data ?? {};
}

export async function updateNotificationPreferences(
  prefs: NotificationPreferences,
  audience: Audience = "COMPANY"
): Promise<NotificationPreferences> {
  const res = await apiFetch<PrefsEnvelope>(audience, "/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
  return res?.data ?? prefs;
}

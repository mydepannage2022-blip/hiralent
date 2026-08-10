import prisma from "../lib/prisma";

/**
 * Per-user notification toggle preferences.
 *
 * Key-sets differ per role (agency/company/candidate), so preferences are
 * stored as a single JSON object rather than typed columns. Callers own the
 * shape of the object; this service just persists and returns it verbatim.
 */

export type NotificationPreferences = Record<string, boolean>;

/**
 * Returns the stored preferences for a user, or an empty object when none
 * exist yet (the frontend merges this over its role-specific defaults).
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  const row = await prisma.userNotificationPreferences.findUnique({
    where: { user_id: userId },
  });

  return (row?.preferences as NotificationPreferences) ?? {};
};

/**
 * Creates or overwrites the preferences row for a user and returns the
 * persisted value.
 */
export const upsertNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  const row = await prisma.userNotificationPreferences.upsert({
    where: { user_id: userId },
    create: { user_id: userId, preferences },
    update: { preferences },
  });

  return row.preferences as NotificationPreferences;
};

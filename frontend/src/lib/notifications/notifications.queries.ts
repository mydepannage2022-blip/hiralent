"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationAudience } from "@/src/types/notifications.types";
import { listNotifications, markNotificationRead } from "./notifications.api";

export function useNotifications(
  audience: NotificationAudience,
  params?: { limit?: number; cursor?: string },
) {
  return useQuery({
    queryKey: ["notifications", audience, params ?? {}],
    queryFn: () => listNotifications(audience, params),
  });
}

export function useMarkNotificationRead(audience: NotificationAudience) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { notificationId: string }) =>
      markNotificationRead(audience, args.notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", audience] });
    },
  });
}

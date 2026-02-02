export type NotificationAudience = "CANDIDATE" | "COMPANY";
export type NotificationType = string;

export type NotificationDTO = {
  notification_id: string;

  audience: NotificationAudience;
  recipient_id: string;

  type: NotificationType;
  title: string;
  message: string;

  action_url?: string | null;
  data?: any;

  sent_via?: string | null;

  created_at: string;

  read_at?: string | null;
  starred_at?: string | null;
};

export type NotificationListResponseDTO = {
  items: NotificationDTO[];
  nextCursor: string | null;
};

export type NotificationUnreadCountDTO = {
  count: number;
};

export type NotificationUpdateResponseDTO = {
  success: true;
};

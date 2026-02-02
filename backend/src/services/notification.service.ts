import {
  PrismaClient,
  NotificationAudience,
  NotificationType,
} from "@prisma/client";

export type CreateNotificationArgs = {
  audience: NotificationAudience;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  data?: any;
  sentVia?: string | null; // "in_app" | "email" | ...
};

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  async create(args: CreateNotificationArgs) {
    return this.prisma.notification.create({
      data: {
        audience: args.audience,
        recipient_id: args.recipientId,
        type: args.type,
        title: args.title,
        message: args.message,
        action_url: args.actionUrl ?? null,
        data: args.data ?? {},
        sent_via: args.sentVia ?? "in_app",
      },
    });
  }

  async list(params: {
    recipientId: string;
    audience: NotificationAudience;
    limit?: number;
    cursor?: string;
  }) {
    const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);

    const items = await this.prisma.notification.findMany({
      where: {
        recipient_id: params.recipientId,
        audience: params.audience,
      },
      orderBy: { created_at: "desc" },
      take: limit,
      ...(params.cursor
        ? { skip: 1, cursor: { notification_id: params.cursor } }
        : {}),
    });

    const nextCursor =
      items.length === limit ? items[items.length - 1].notification_id : null;

    return { items, nextCursor };
  }

  async unreadCount(recipientId: string, audience: NotificationAudience) {
    const count = await this.prisma.notification.count({
      where: {
        recipient_id: recipientId,
        audience,
        read_at: null,
      },
    });
    return count;
  }

  async markRead(params: {
    recipientId: string;
    audience: NotificationAudience;
    notificationId: string;
  }) {
    // updateMany = safe (ownership)
    await this.prisma.notification.updateMany({
      where: {
        notification_id: params.notificationId,
        recipient_id: params.recipientId,
        audience: params.audience,
        read_at: null,
      },
      data: { read_at: new Date() },
    });
    return { success: true };
  }

  async markAllRead(recipientId: string, audience: NotificationAudience) {
    await this.prisma.notification.updateMany({
      where: {
        recipient_id: recipientId,
        audience,
        read_at: null,
      },
      data: { read_at: new Date() },
    });
    return { success: true };
  }
}

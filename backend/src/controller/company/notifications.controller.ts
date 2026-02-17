import { PrismaClient, NotificationAudience } from "@prisma/client";
import { NotificationService } from "../../services/notification.service";

const prisma = new PrismaClient();
const notifications = new NotificationService(prisma);

export class CompanyNotificationsController {
  async list(req: any, res: any) {
    const userId = req.user?.user_id;
    const limit = Number(req.query.limit ?? 30);
    const cursor = (req.query.cursor ? String(req.query.cursor) : undefined) as
      | string
      | undefined;

    const data = await notifications.list({
      recipientId: userId,
      audience: NotificationAudience.COMPANY,
      limit,
      cursor,
    });

    return res.json({ success: true, data });
  }

  async unreadCount(req: any, res: any) {
    const userId = req.user?.user_id;

    const count = await notifications.unreadCount(
      userId,
      NotificationAudience.COMPANY
    );

    return res.json({ success: true, data: { count } });
  }

  async markRead(req: any, res: any) {
    const userId = req.user?.user_id;
    const id = req.params.id;

    const data = await notifications.markRead({
      recipientId: userId,
      audience: NotificationAudience.COMPANY,
      notificationId: id,
    });

    return res.json({ success: true, data });
  }

  async markAllRead(req: any, res: any) {
    const userId = req.user?.user_id;

    const data = await notifications.markAllRead(
      userId,
      NotificationAudience.COMPANY
    );

    return res.json({ success: true, data });
  }
}

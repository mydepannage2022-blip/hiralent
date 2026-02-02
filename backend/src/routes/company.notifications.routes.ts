import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { CompanyNotificationsController } from "../controller/company/notifications.controller";

const router = Router();
const controller = new CompanyNotificationsController();

router.use(checkAuth);

router.get("/company/notifications", controller.list.bind(controller));
router.get(
  "/company/notifications/unread-count",
  controller.unreadCount.bind(controller)
);
router.patch(
  "/company/notifications/:id/read",
  controller.markRead.bind(controller)
);
router.patch(
  "/company/notifications/read-all",
  controller.markAllRead.bind(controller)
);

export default router;

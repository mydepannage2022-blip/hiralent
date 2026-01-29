import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.middleware";
import { CandidateNotificationsController } from "../../controller/candidate/notifications.controller";

const router = Router();
const controller = new CandidateNotificationsController();

router.use(checkAuth);

router.get("/candidate/notifications", controller.list.bind(controller));
router.get(
  "/candidate/notifications/unread-count",
  controller.unreadCount.bind(controller)
);
router.patch(
  "/candidate/notifications/:id/read",
  controller.markRead.bind(controller)
);
router.patch(
  "/candidate/notifications/read-all",
  controller.markAllRead.bind(controller)
);

export default router;

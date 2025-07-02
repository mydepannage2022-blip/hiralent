import express from "express";
import { updateJob } from "../controller/job.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { checkRole } from "../middlewares/checkRole.middleware";
import { ownershipGuard } from "../middlewares/ownershipGuard.middleware";
import { validateBody } from "../middlewares/validateBody.middleware";
import { sanitizeRichText } from "../middlewares/sanitizeRichText.middleware";
import { updateJobSchema } from "../validation/job.schema";

const router = express.Router();

router.put(
  "/jobs/:id",
  checkAuth,
  checkRole("recruiter"),
  ownershipGuard((req) => req.user!.user_id), // ✅ Fix: pass extractor function, not string
  sanitizeRichText,
  validateBody(updateJobSchema),
  updateJob
);

export default router;

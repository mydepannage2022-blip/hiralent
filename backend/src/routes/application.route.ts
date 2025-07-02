import express from "express";
import { submitApplication, updateStatus } from "../controller/application.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { checkRole } from "../middlewares/checkRole.middleware";
import { uploadCV } from "../middlewares/uploadCV.middleware";
import { validateBody } from "../middlewares/validateBody.middleware";
import { statusTransitionValidator } from "../middlewares/statusTransitionValidator.middleware";
import { submitApplicationSchema, updateStatusSchema } from "../validation/application.schema";

const router = express.Router();

router.post(
  "/applications",
  checkAuth,
  checkRole("candidate"),
  uploadCV.single("cv"),
  validateBody(submitApplicationSchema),
  submitApplication
);

router.patch(
  "/applications/:id/status",
  checkAuth,
  checkRole("recruiter", "admin"),
  validateBody(updateStatusSchema),
  statusTransitionValidator,
  updateStatus
);

export default router;

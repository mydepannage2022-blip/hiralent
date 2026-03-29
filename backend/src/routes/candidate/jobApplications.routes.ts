import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import {
  applyToJob,
  listMyApplications,
  getApplicationTimeline,
} from "../../controller/candidate/jobApplications.controller";

const router = Router();

router.use(authMiddleware);

/**
 * APPLY to a job
 * POST /api/v1/candidate/applications/apply
 */
router.post("/applications/apply", applyToJob);

/**
 * LIST my applications
 * GET /api/v1/candidate/applications
 */
router.get("/applications", listMyApplications);

/**
 * APPLICATION TIMELINE (JobApplicationScoreHistory)
 * GET /api/v1/candidate/applications/:id/timeline
 */
router.get("/applications/:id/timeline", getApplicationTimeline);


export default router;

import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

import {
  applyToJob,
  listMyApplications,
  getApplicationTimeline,
} from "../../controller/candidate/jobApplications.controller";

const router = Router();

// Use the hardened session-aware guard (blacklist + active-session enforced), not
// the legacy bare-jwt guard — otherwise logout/terminate would not revoke these
// routes and session-less tokens would slip through. (Wave 1 / Phase 1.2)
router.use(checkAuth);

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

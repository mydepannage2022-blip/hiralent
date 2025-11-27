import { Router } from "express";
import { getAssessmentSkillRadarHandler } from "../controller/company/skillRadar.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware"; // your auth middleware

const router = Router();

/**
 * GET /api/employer/assessments/:assessmentId/skill-radar
 * Returns radar data for all candidates who took that employer assessment
 */
router.get(
  "/employer/assessments/:assessmentId/skill-radar",
  checkAuth, // sets req.user
  getAssessmentSkillRadarHandler
);

export default router;

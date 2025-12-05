import { Router } from "express";
import { mockAssessmentResultHandler } from "../controller/company/mockAssessmentResult.controller";

// dev-only route – you can protect it later if you want
const router = Router();

/**
 * POST /api/dev/mock-assessment-result
 * Simulates Youssra sending scoring results.
 */
router.post("/dev/mock-assessment-result", mockAssessmentResultHandler);

export default router;

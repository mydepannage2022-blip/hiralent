/**
 * router.use(checkAuth);

router.get("/assessment-templates", listTemplates);
router.get("/assessment-templates/:template_id", getTemplateById);

// This creates a company-owned EmployerAssessment instance from template
router.post("/employer-assessments/from-template", createFromTemplate);

 */
import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";

import {
  listTemplatesController,
  getTemplateByIdController,
  createFromTemplateController,
} from "../controller/company/assessmentTemplate.controller";

const router = Router();

/**
 * All routes require an authenticated user.
 */
router.use(checkAuth);

/**
 * Templates library (HackerRank-style catalog)
 */
router.get("/assessment-templates", listTemplatesController);
router.get("/assessment-templates/:template_id", getTemplateByIdController);

/**
 * Create company-owned EmployerAssessment instance from template + attach to job
 */
router.post("/employer-assessments/from-template", createFromTemplateController);

export default router;

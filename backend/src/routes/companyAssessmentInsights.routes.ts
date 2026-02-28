// backend/src/routes/companyAssessmentInsights.routes.ts
import { Router } from "express";
import { CompanyAssessmentInsightsController } from "../controller/company/companyAssessmentInsights.controller";

const r = Router();
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

r.get(
  "/candidates/:candidateId/assessments/completed",
  wrap(CompanyAssessmentInsightsController.getCompletedForCandidate)
);

r.get(
  "/assessment-sessions/:sessionId/insight",
  wrap(CompanyAssessmentInsightsController.getSessionInsight)
);

// ✅ NEW: left panel list
r.get(
  "/assessments/:assessmentId/analytics/candidates",
  wrap(CompanyAssessmentInsightsController.getAssessmentCandidatesAnalytics)
);

// ✅ NEW: right panel detail
r.get(
  "/assessment-sessions/:sessionId/analytics",
  wrap(CompanyAssessmentInsightsController.getSessionAnalytics)
);

export default r;

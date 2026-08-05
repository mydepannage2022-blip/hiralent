import { Router } from "express";
import { CandidateAssessmentTelemetryController } from "../../controller/candidate/assessmentTelemetry.controller";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

const r = Router();
r.use(checkAuth);
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);

r.post(
  "/assessment-sessions/:sessionId/telemetry",
  wrap(CandidateAssessmentTelemetryController.ingest)
);

export default r;

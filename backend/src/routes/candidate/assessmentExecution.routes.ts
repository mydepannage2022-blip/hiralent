import { Router } from "express";
import { CandidateAssessmentExecutionController } from "../../controller/candidate/assessmentExecution.controller";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

const r = Router();
r.use(checkAuth);
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);

r.post(
  "/assessment-sessions/:sessionId/questions/:questionId/run",
  wrap(CandidateAssessmentExecutionController.run)
);

r.get(
  "/assessment-sessions/:sessionId/submissions/:submissionId",
  wrap(CandidateAssessmentExecutionController.getSubmission)
);

export default r;

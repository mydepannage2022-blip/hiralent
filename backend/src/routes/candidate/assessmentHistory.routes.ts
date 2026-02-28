import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.middleware";
import { CandidateAssessmentHistoryController } from "../../controller/candidate/assessmentHistory.controller";

const r = Router();
r.use(checkAuth);

const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

r.get("/candidate/assessment-history", wrap(CandidateAssessmentHistoryController.listCompleted));

export default r;

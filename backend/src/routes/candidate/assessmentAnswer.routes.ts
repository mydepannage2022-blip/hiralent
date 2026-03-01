import { Router } from "express";
import { CandidateAssessmentAnswerController } from "../../controller/candidate/assessmentAnswer.controller";

const r = Router();
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);

r.put(
  "/assessment-sessions/:sessionId/answers/:questionId",
  wrap(CandidateAssessmentAnswerController.save)
);

r.get(
  "/assessment-sessions/:sessionId/answers",
  wrap(CandidateAssessmentAnswerController.list)
);

export default r;

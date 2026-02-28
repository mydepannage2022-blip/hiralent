import { Router } from "express";
import { CandidateAssessmentSessionController } from "../../controller/candidate/assessmentSession.controller";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

const r = Router();
r.use(checkAuth);
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);


r.post("/assessment-sessions/start", wrap(CandidateAssessmentSessionController.start));
r.get("/assessment-sessions/:sessionId", wrap(CandidateAssessmentSessionController.get));
r.get("/assessment-sessions/:sessionId/questions", wrap(CandidateAssessmentSessionController.questions));
r.patch("/assessment-sessions/:sessionId/navigation", wrap(CandidateAssessmentSessionController.navigation));
r.post("/assessment-sessions/:sessionId/submit", wrap(CandidateAssessmentSessionController.submit));

export default r;

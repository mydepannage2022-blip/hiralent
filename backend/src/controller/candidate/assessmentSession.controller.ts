import { Request, Response } from "express";
import { createSessionSchema, navigationSchema, submitSessionSchema } from "../../validation/candidateAssessmentSession.validation";
import { CandidateAssessmentSessionService } from "../../services/candidate/candidateAssessmentSession.service";
import { CandidateAssessmentSubmissionService } from "../../services/candidate/candidateAssessmentSubmission.service";

const getCandidateId = (req: any) => req.user?.user_id || req.user?.id || req.userId;

export class CandidateAssessmentSessionController {
  static async start(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const body = createSessionSchema.parse(req.body);

try {
  const session = await CandidateAssessmentSessionService.startSession(candidateId, body.assessment_id);
  return res.json({ session_id: session.session_id });
} catch (e: any) {
  if (e?.message === "ALREADY_SUBMITTED") {
    return res.status(409).json({ message: "Assessment already submitted" });
  }
  throw e;
}

  }

  static async get(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId } = req.params as any;

    const view = await CandidateAssessmentSessionService.getSession(sessionId, candidateId);
    res.json(view);
  }

  static async questions(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId } = req.params as any;

    const q = await CandidateAssessmentSessionService.getSessionQuestions(sessionId, candidateId);
    res.json({ questions: q });
  }

  static async navigation(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId } = req.params as any;
    const body = navigationSchema.parse(req.body);

    const result = await CandidateAssessmentSessionService.setNavigation(
      sessionId,
      candidateId,
      body.current_index
    );

    res.json(result);
  }

  static async submit(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId } = req.params as any;
    const body = submitSessionSchema.parse(req.body);

    const result = await CandidateAssessmentSubmissionService.submitSession(
      sessionId,
      candidateId,
      body.reason
    );

    res.json(result);
  }
}

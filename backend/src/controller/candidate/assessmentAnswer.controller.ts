import { Request, Response } from "express";
import { saveAnswerSchema } from "../../validation/candidateAssessmentAnswer.validation";
import { CandidateAssessmentAnswerService } from "../../services/candidate/candidateAssessmentAnswer.service";

const getCandidateId = (req: any) => req.user?.user_id || req.user?.id || req.userId;

const toIsoOrNull = (v: unknown) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export class CandidateAssessmentAnswerController {
  static async save(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId, questionId } = req.params as any;
    const body = saveAnswerSchema.parse(req.body);

    const row = await CandidateAssessmentAnswerService.saveAnswer(
      sessionId,
      candidateId,
      questionId,
      body.payload,
      Boolean(body.isFinal),
      Boolean(body.isFlagged)
    );

    res.json({
      session_id: row.session_id,
      question_id: row.question_id,
      state: row.state,
      is_flagged: row.is_flagged,
      updated_at: toIsoOrNull((row as any).updated_at),
    });
  }

  static async list(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId } = req.params as any;

    const answers = await CandidateAssessmentAnswerService.getAnswers(
      sessionId,
      candidateId
    );

    res.json({ answers });
  }
}

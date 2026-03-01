/**POST /candidate/assessment-sessions/:sessionId/questions/:questionId/run

POST /candidate/assessment-sessions/:sessionId/questions/:questionId/submit-code */
import { Request, Response } from "express";
import { z } from "zod";
import { ExecutionService } from "../../services/candidate/candidateAssessementExecution.service";

const getCandidateId = (req: any) => req.user?.user_id || req.user?.id || req.userId;

const runSchema = z.object({
  language: z.string().min(1).max(32),
  code: z.string().min(1).max(200_000),
});

export class CandidateAssessmentExecutionController {
  // POST /candidate/assessment-sessions/:sessionId/questions/:questionId/run
  static async run(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId, questionId } = req.params as any;
    const body = runSchema.parse(req.body);

    const out = await ExecutionService.createRunSubmission({
      sessionId,
      candidateId,
      questionId,
      language: body.language,
      code: body.code,
    });

    return res.status(200).json(out);
  }

  // GET /candidate/assessment-sessions/:sessionId/submissions/:submissionId
  static async getSubmission(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { submissionId } = req.params as any;

    const out = await ExecutionService.getSubmission(candidateId, submissionId);
    return res.status(200).json(out);
  }
}

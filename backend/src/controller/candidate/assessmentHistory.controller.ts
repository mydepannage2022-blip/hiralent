import { Request, Response } from "express";
import { CandidateAssessmentHistoryService } from "../../services/candidate/candidateAssessmentHistory.service";

const getCandidateId = (req: any) => req.user?.user_id || req.user?.id || req.userId;

export class CandidateAssessmentHistoryController {
  // GET /candidate/assessment-history
  static async listCompleted(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const items = await CandidateAssessmentHistoryService.listCompleted(candidateId);
    return res.json({ ok: true, items });
  }
}

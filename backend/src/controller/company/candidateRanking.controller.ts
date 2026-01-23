import { Request, Response } from "express";
import { CandidateRankingService } from "../../services/company/candidateRanking.service";

const getAuthUser = (req: Request) => (req as any).user;
const getCompanyId = (req: Request) => getAuthUser(req)?.company_id ?? null;

const toBool = (v: any) => {
  if (v === undefined) return undefined;
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return undefined;
};

const toInt = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export class CandidateRankingController {
  constructor(private service: CandidateRankingService) {}

  getRankedCandidatesForJob = async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const jobId = String(req.params.jobId);
      if (!jobId) return res.status(400).json({ success: false, message: "jobId is required" });

      const page = toInt(req.query.page, 1);
      const limit = toInt(req.query.limit, 20);
      const eligible = toBool(req.query.eligible);

      const result = await this.service.getRankedCandidatesForJob({
        jobId,
        companyId,
        page,
        limit,
        eligible,
      });

      return res.json({ success: true, data: result });
    } catch (e: any) {
      const code = e?.statusCode ?? 500;
      return res.status(code).json({ success: false, message: e?.message ?? String(e) });
    }
  };
}

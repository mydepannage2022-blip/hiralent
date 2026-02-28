// backend/src/controller/company/companyAssessmentInsights.controller.ts
import { Request, Response } from "express";
import { CompanyAssessmentInsightsService } from "../../services/company/companyAssessmentInsights.service";

const getAuth = (req: any) =>
  (req as any).user as { user_id: string; role: string } | undefined;

export class CompanyAssessmentInsightsController {
  static async getCompletedForCandidate(req: Request, res: Response) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { candidateId } = req.params as any;

    const data = await CompanyAssessmentInsightsService.getCompletedForCandidate(
      companyId,
      candidateId
    );

    return res.status(200).json({ candidateId, completed: data });
  }

  static async getSessionInsight(req: Request, res: Response) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { sessionId } = req.params as any;

    try {
      const data = await CompanyAssessmentInsightsService.getInsight(companyId, sessionId);
      return res.status(200).json(data);
    } catch (e: any) {
      if (e?.message === "SESSION_NOT_FOUND") return res.status(404).json({ message: "Session not found" });
      if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      console.error("getSessionInsight error:", e);
      return res.status(500).json({ message: "Failed to load insight", error: e?.message });
    }
  }

  // ✅ NEW: left panel list
  static async getAssessmentCandidatesAnalytics(req: Request, res: Response) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { assessmentId } = req.params as any;

    try {
      const data = await CompanyAssessmentInsightsService.getAssessmentCandidatesAnalytics(companyId, assessmentId);
      return res.status(200).json(data);
    } catch (e: any) {
      if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      console.error("getAssessmentCandidatesAnalytics error:", e);
      return res.status(500).json({ message: "Failed to load candidates analytics", error: e?.message });
    }
  }

  // ✅ NEW: right panel detail
  static async getSessionAnalytics(req: Request, res: Response) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { sessionId } = req.params as any;

    try {
      const data = await CompanyAssessmentInsightsService.getSessionAnalytics(companyId, sessionId);
      return res.status(200).json(data);
    } catch (e: any) {
      if (e?.message === "SESSION_NOT_FOUND") return res.status(404).json({ message: "Session not found" });
      if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      console.error("getSessionAnalytics error:", e);
      return res.status(500).json({ message: "Failed to load session analytics", error: e?.message });
    }
  }
  static async getAssessmentKPIs(req: Request, res: Response) {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ message: "Unauthorized" });
  if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

  const companyId = auth.user_id;
  const { assessmentId } = req.params as any;

  try {
    const data = await CompanyAssessmentInsightsService.getAssessmentKPIs(companyId, assessmentId);
    return res.status(200).json(data);
  } catch (e: any) {
    if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
    console.error("getAssessmentKPIs error:", e);
    return res.status(500).json({ message: "Failed to load KPIs", error: e?.message });
  }
}
}

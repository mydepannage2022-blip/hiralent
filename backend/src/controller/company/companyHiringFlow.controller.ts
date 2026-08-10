import prisma from '../../lib/prisma';
import { CompanyHiringFlowService } from "../../services/company/companyHiringFlow.service";

const service = new CompanyHiringFlowService(prisma);

const getAuth = (req: any) => (req as any).user as { user_id: string; role: string } | undefined;

export class CompanyHiringFlowController {
  static async reject(req: any, res: any) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { applicationId } = req.params;
    const { reason } = req.body ?? {};

    const out = await service.rejectApplication({ companyId, applicationId, reason });
    return res.json(out);
  }

  static async inviteSimpleTest(req: any, res: any) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { applicationId } = req.params;
    const { expires_at } = req.body ?? {};

    if (!expires_at) return res.status(400).json({ message: "expires_at is required (ISO date)" });

    const out = await service.inviteToSimpleTest({
      companyId,
      applicationId,
      expiresAt: new Date(String(expires_at)),
    });

    return res.json(out);
  }

  static async inviteAssessment(req: any, res: any) {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    if (auth.role !== "company_admin") return res.status(403).json({ message: "Forbidden" });

    const companyId = auth.user_id;
    const { applicationId } = req.params;
    const { assessment_id, expires_at } = req.body ?? {};

    if (!assessment_id) return res.status(400).json({ message: "assessment_id is required" });
    if (!expires_at) return res.status(400).json({ message: "expires_at is required (ISO date)" });

    try {
      const out = await service.inviteToAssessment({
        companyId,
        applicationId,
        assessmentId: String(assessment_id),
        expiresAt: new Date(String(expires_at)),
      });
      return res.json(out);
    } catch (e: any) {
      const msg = e?.message;
      if (msg === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      if (msg === "APPLICATION_NOT_FOUND" || msg === "ASSESSMENT_NOT_FOUND" || msg === "JOB_SIMPLE_TEST_NOT_FOUND")
        return res.status(404).json({ message: msg });
      if (msg === "ASSESSMENT_NOT_FOR_JOB")
        return res.status(400).json({ message: "This assessment does not belong to the job for this application." });
      if (msg === "ASSESSMENT_NOT_ACTIVE")
        return res.status(409).json({ message: "Activate the assessment before inviting candidates. It is still in DRAFT/inactive status." });
      throw e; // unknown -> central error handler
    }
  }
}
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

    const out = await service.inviteToAssessment({
      companyId,
      applicationId,
      assessmentId: String(assessment_id),
      expiresAt: new Date(String(expires_at)),
    });

    return res.json(out);
  }
}
// backend/src/controllers/company/skillRadar.controller.ts
import { Request, Response } from "express";
import { getAssessmentSkillRadar } from "../../services/company/skillRadar.service";

// We rely on the global augmentation of Request.user done in session.types.ts
// so we don't create a new interface here.

export const getAssessmentSkillRadarHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { assessmentId } = req.params;

    // req.user is added by your checkAuth / authenticate middleware
    const authUser = (req as any).user as
      | { user_id: string; role: string; session_id?: string }
      | undefined;

    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (authUser.role !== "company_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const companyId = authUser.user_id;

    const data = await getAssessmentSkillRadar(assessmentId, companyId);

    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Error in getAssessmentSkillRadarHandler:", err);
    return res.status(500).json({
      message: "Failed to load skill radar for this assessment.",
      error: err?.message,
    });
  }
};

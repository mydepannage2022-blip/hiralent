// backend/src/controllers/company/skillRadar.controller.ts
import { Request, Response } from "express";
import { getAssessmentSkillRadar } from "../../services/company/skillRadar.service";

const asSingleString = (v: unknown): string | null => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
  return null;
};

export const getAssessmentSkillRadarHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const assessmentId = asSingleString((req as any).params?.assessmentId);

    if (!assessmentId) {
      return res.status(400).json({ message: "Missing assessmentId" });
    }

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

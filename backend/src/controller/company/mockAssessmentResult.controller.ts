import { Request, Response } from "express";
import { saveMockAssessmentResult } from "../../services/company/mockAssessmentResult.service";
import { MockAssessmentResultPayload } from "../../types/mockAssessmentResult.types";

export const mockAssessmentResultHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body as MockAssessmentResultPayload;

    const result = await saveMockAssessmentResult(body);

    return res.status(201).json({
      message: "Mock assessment result stored.",
      assessmentId: result.assessment_id,
    });
  } catch (err: any) {
    console.error("Error in mockAssessmentResultHandler:", err);
    return res.status(500).json({
      message: "Failed to store mock assessment result.",
      error: err?.message,
    });
  }
};

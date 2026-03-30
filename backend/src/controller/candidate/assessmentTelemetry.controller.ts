/**POST /candidate/assessment-sessions/:sessionId/telemetry */
import { Request, Response } from "express";
import { telemetryBatchSchema } from "../../validation/candidateAssessmentTelemetry.validation";
import { CandidateAssessmentTelemetryService } from "../../services/candidate/candidateAssessmentTelemetry.service";

const getCandidateId = (req: any) => req.user?.user_id || req.user?.id || req.userId;

export class CandidateAssessmentTelemetryController {
  static async ingest(req: Request, res: Response) {
    const candidateId = getCandidateId(req);
    const { sessionId } = req.params as any;

    const body = telemetryBatchSchema.parse(req.body);
    const result = await CandidateAssessmentTelemetryService.logEvents(
      sessionId,
      candidateId,
      body.events
    );

    res.json(result);
  }
}

import { Request, Response } from "express";
import { upsertSourcedCandidateService } from "../../../services/company/internal/sourcedCandidates.service";

export async function upsertSourcedCandidate(req: Request, res: Response) {
  try {
    const idempotencyKey = req.header("Idempotency-Key") || null;

    const result = await upsertSourcedCandidateService({
      payload: req.body,
      idempotencyKey,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      message: "Internal upsert failed",
      error: err?.message ?? String(err),
    });
  }
}

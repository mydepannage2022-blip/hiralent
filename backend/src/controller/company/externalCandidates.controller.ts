import { Request, Response } from "express";
import {
  listExternalCandidatesService,
  getExternalCandidateByIdService,
  listExternalSourcesService,
} from "../../services/company/externalCandidates.service";

/**
 * GET /api/v1/company/candidates/external
 */
export async function listExternalCandidates(req: Request, res: Response) {
  try {
    const { q, source, status, page = "1", limit = "20" } = req.query;

    const result = await listExternalCandidatesService({
      q: q ? String(q) : undefined,
      source: source ? String(source) : undefined,
      status: status ? String(status) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      message: "Failed to list external candidates",
      error: err?.message ?? String(err),
    });
  }
}

/**
 * GET /api/v1/company/candidates/external/:id
 */
export async function getExternalCandidateById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const result = await getExternalCandidateByIdService(id);

    if (!result) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      message: "Failed to fetch external candidate",
      error: err?.message ?? String(err),
    });
  }
}

/**
 * GET /api/v1/company/candidates/external/sources
 */
export async function listExternalSources(req: Request, res: Response) {
  try {
    const sources = await listExternalSourcesService();
    return res.status(200).json({ sources });
  } catch (err: any) {
    return res.status(500).json({
      message: "Failed to list sources",
      error: err?.message ?? String(err),
    });
  }
}

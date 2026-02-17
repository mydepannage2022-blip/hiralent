import { Request, Response } from "express";
import { searchCandidates } from "../../services/agency/agency.candidate.service";

/**
 * GET /api/v1/agency/candidates/search
 * Search for existing candidates by name or email
 * Query params: query (required)
 */
export const searchCandidatesController = async (req: Request, res: Response) => {
  try {
    const agencyId = req.user?.agency_id;
    const query = req.query.query as string | undefined;

    if (!agencyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Agency ID not found",
      });
    }

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const candidates = await searchCandidates(query.trim());

    return res.status(200).json({
      success: true,
      message: `Found ${candidates.length} candidate(s)`,
      data: candidates,
    });
  } catch (error) {
    console.error("❌ Search candidates error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search candidates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
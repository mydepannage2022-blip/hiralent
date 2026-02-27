import { Request, Response } from "express";
import { searchCandidates } from "../services/search.service";

export const searchCandidatesPublicController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q =
      typeof req.query.q === "string" ? req.query.q : undefined;
    const location =
      typeof req.query.location === "string" ? req.query.location : undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(
      20,
      Math.max(1, parseInt(req.query.limit as string, 10) || 12)
    );

    const data = await searchCandidates({ q, location, page, limit });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Search candidates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search candidates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

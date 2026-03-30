import { Request, Response } from "express";
import { searchCandidates, searchJobs, JobSearchParams } from "../services/search.service";

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

    const isAuthenticated = !!(req as any).user;
    const data = await searchCandidates({ q, location, page, limit, isAuthenticated });

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

export const searchJobsPublicController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q        = typeof req.query.q        === "string" ? req.query.q        : undefined;
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    const jobType  = typeof req.query.jobType  === "string" ? req.query.jobType  : undefined;
    const remote   = req.query.remote === "true";
    const page     = parseInt(req.query.page  as string, 10) || 1;
    const limit    = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 12));

    const params: JobSearchParams = { q, location, page, limit, jobType, remote };
    const data = await searchJobs(params);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Search jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search jobs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

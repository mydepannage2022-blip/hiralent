import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/v1/agency/candidates/search
 * Search for existing candidates by name or email
 * Query params: query (required)
 */
export const searchCandidatesController = async (req: Request, res: Response) => {
  try {
    const agencyId = req.user?.agency_id;
    const { query } = req.query;

    if (!agencyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Agency ID not found",
      });
    }

    if (!query || (query as string).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const searchTerm = (query as string).trim();

    // Search candidates by name or email
    const candidates = await prisma.user.findMany({
      where: {
        role: "candidate",
        OR: [
          {
            full_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone_number: true,
      },
      take: 10, // Limit results to 10
      orderBy: {
        full_name: "asc",
      },
    });

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
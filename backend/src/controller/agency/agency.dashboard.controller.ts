import { Request, Response } from "express";
import { AgencyType } from "@prisma/client";
import {
  getUserAgency,
  getUserAgencyBasic,
  getVisaDashboardStats,
  getRelocationDashboardStats,
  getIntegrationDashboardStats,
  getFallbackDashboardStats,
  getVisaRecentCases,
  getRelocationRecentCases,
  getIntegrationRecentCases,
  mapCasesToActivities,
  getAnalyticsCases,
  getAgencyReviews,
  computeAnalytics,
} from "../../services/agency/agency.dashboard.service";

// GET /api/v1/agency/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgency(userId);

    if (!user?.agency_id || !user.agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const agencyType = user.agency.type;
    const agencyId = user.agency_id;
    const agencyName = user.agency.name;

    let stats;

    if (agencyType === AgencyType.VISA) {
      stats = await getVisaDashboardStats(agencyId, agencyName);
    } else if (agencyType === AgencyType.RELOCATION) {
      stats = await getRelocationDashboardStats(agencyId, agencyName);
    } else if (agencyType === AgencyType.INTEGRATION) {
      stats = await getIntegrationDashboardStats(agencyId, agencyName);
    } else {
      stats = getFallbackDashboardStats(agencyType, agencyName);
    }

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
  }
};

// GET /api/v1/agency/dashboard/activities
export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgencyBasic(userId);

    if (!user?.agency_id || !user.agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const agencyType = user.agency.type;
    let recentCases: any[] = [];

    if (agencyType === AgencyType.VISA) {
      recentCases = await getVisaRecentCases(user.agency_id);
    } else if (agencyType === AgencyType.RELOCATION) {
      recentCases = await getRelocationRecentCases(user.agency_id);
    } else if (agencyType === AgencyType.INTEGRATION) {
      recentCases = await getIntegrationRecentCases(user.agency_id);
    }

    const activities = mapCasesToActivities(recentCases, agencyType);

    return res.status(200).json({ success: true, data: activities });
  } catch (error) {
    console.error("Get recent activities error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch activities" });
  }
};

// GET /api/v1/agency/dashboard/analytics
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgencyBasic(userId);

    if (!user?.agency_id || !user.agency) {
      return res.status(403).json({ success: false, message: "User is not associated with an agency" });
    }

    const agencyType = user.agency.type;

    const allCases = await getAnalyticsCases(user.agency_id, agencyType);
    const reviews = await getAgencyReviews(user.agency_id);
    const analytics = computeAnalytics(allCases, reviews, agencyType);

    return res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};
import { Request, Response } from "express";
import { PrismaClient, AgencyType } from "@prisma/client";
import {
  isActiveVisaCase,
  isActiveRelocationCase,
  isActiveIntegrationCase,
  isCompletedVisaCase,
  isCompletedRelocationCase,
  isCompletedIntegrationCase,
  getPendingIntegrationServicesCount,
  getCompletedIntegrationServicesCount,
  getInProgressIntegrationServicesCount,
  CASE_STATUSES,
  INTEGRATION_SERVICE_STATUSES,
} from "../../constants/caseStatuses";

const prisma = new PrismaClient();

// GET /api/v1/agency/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get agency info including type
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        agency_id: true,
        agency: {
          select: {
            type: true,
            name: true,
          },
        },
      },
    });

    if (!user?.agency_id || !user.agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    const agencyType = user.agency.type;
    const agencyId = user.agency_id;

    // ============================================
    // VISA AGENCY
    // ============================================
    if (agencyType === AgencyType.VISA) {
      const allCases = await prisma.relocationCase.findMany({
        where: { agency_id: agencyId },
        select: {
          case_id: true,
          candidate_id: true,
          status: true,
          service_type: true,
          estimated_cost: true,
          actual_cost: true,
          created_at: true,
          updated_at: true,
          housing_agency_id: true,
          embassy_submission: {
            select: {
              status: true,
            },
          },
        },
      });

      // Using helper functions
      const completedCases = allCases.filter((c) =>
        isCompletedVisaCase(
          c.status,
          c.embassy_submission?.status,
          c.housing_agency_id !== null
        )
      ).length;

      const activeCases = allCases.filter((c) =>
        isActiveVisaCase(
          c.status,
          c.embassy_submission?.status,
          c.housing_agency_id !== null
        )
      ).length;

      const uniqueClients = new Set(allCases.map((c) => c.candidate_id));
      const totalClients = uniqueClients.size;

      const revenue = allCases.reduce(
        (sum, c) => sum + (c.actual_cost || 0),
        0
      );

      // Pending actions: cases waiting for documents
      const pendingActions = allCases.filter(
        (c) => c.status === CASE_STATUSES.PENDING_DOCUMENTS
      ).length;

      // VISA-specific metrics
      const approvedVisas = allCases.filter(
        (c) => c.embassy_submission?.status === "approved"
      ).length;

      const pendingVisas = allCases.filter(
        (c) =>
          c.embassy_submission &&
          ["submitted", "under_review", "interview_scheduled"].includes(
            c.embassy_submission.status
          )
      ).length;

      const successRate =
        allCases.length > 0
          ? Math.round((approvedVisas / allCases.length) * 100)
          : 0;

      return res.status(200).json({
        success: true,
        data: {
          agencyType,
          agencyName: user.agency.name,
          activeCases,
          completedCases,
          totalClients,
          revenue,
          pendingActions,
          totalVisaApplications: allCases.length,
          approvedVisas,
          pendingVisas,
          successRate,
          embassySubmissions: pendingVisas,
        },
      });
    }

    // ============================================
    // RELOCATION AGENCY
    // ============================================
    else if (agencyType === AgencyType.RELOCATION) {
      // Query by housing_agency_id directly instead of CaseAssignment
      const allCases = await prisma.relocationCase.findMany({
        where: {
          housing_agency_id: agencyId, // Direct query
        },
        select: {
          case_id: true,
          candidate_id: true,
          status: true,
          service_type: true,
          estimated_cost: true,
          actual_cost: true,
          created_at: true,
          updated_at: true,
          candidate: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
            },
          },
          housing_details: {
            // Get from HousingArrangement table
            select: {
              housing_type: true,
              housing_address: true,
              utility_water: true,
              utility_electricity: true,
              utility_internet: true,
              arrival_date: true,
            },
          },
        },
      });

      // Using helper functions
      const completedCases = allCases.filter((c) =>
        isCompletedRelocationCase(c.status)
      ).length;

      const activeCases = allCases.filter((c) =>
        isActiveRelocationCase(c.status)
      ).length;

      const uniqueClients = new Set(allCases.map((c) => c.candidate_id));
      const totalClients = uniqueClients.size;

      const revenue = allCases.reduce(
        (sum, c) => sum + (c.actual_cost || 0),
        0
      );

      // PENDING ACTIONS: Housing info missing OR utilities incomplete
      const pendingActions = allCases.filter((c) => {
        // Skip if already ready or completed
        if (
          c.status === CASE_STATUSES.READY_FOR_ARRIVAL ||
          c.status === CASE_STATUSES.COMPLETED
        ) {
          return false;
        }

        const housingDetails = c.housing_details;

        if (!housingDetails) {
          // If no housing details created yet, definitely has pending actions
          return true;
        }

        // Checking if housing details are incomplete
        const housingIncomplete =
          !housingDetails.housing_address ||
          !housingDetails.housing_type ||
          !housingDetails.arrival_date;

        // Checking if utilities are incomplete
        const utilitiesIncomplete =
          housingDetails.utility_water !== "completed" ||
          housingDetails.utility_electricity !== "completed" ||
          housingDetails.utility_internet !== "completed";

        return housingIncomplete || utilitiesIncomplete;
      }).length;

      // RELOCATION-specific metrics
      const housingCompleted = allCases.filter(
        (c) => c.status === CASE_STATUSES.READY_FOR_ARRIVAL
      ).length;

      const housingInProgress = allCases.filter(
        (c) =>
          c.status === CASE_STATUSES.HOUSING_IN_PROGRESS ||
          c.status === CASE_STATUSES.HOUSING_ASSIGNED
      ).length;

      return res.status(200).json({
        success: true,
        data: {
          agencyType,
          agencyName: user.agency.name,
          activeCases,
          completedCases,
          totalClients,
          revenue,
          pendingActions,
          totalRelocationCases: allCases.length,
          housingCompleted,
          housingInProgress,
          leasesActive: housingCompleted,
          propertiesFound: housingCompleted,
        },
      });
    }

    // ============================================
    // INTEGRATION AGENCY
    // ============================================
    else if (agencyType === AgencyType.INTEGRATION) {
      const allCases = await prisma.relocationCase.findMany({
        where: {
          integration_agency_id: agencyId, // Query by integration agency
        },
        select: {
          case_id: true,
          candidate_id: true,
          status: true,
          service_type: true,
          estimated_cost: true,
          actual_cost: true,
          created_at: true,
          updated_at: true,
          integrationServices: {
            // Include services
            select: {
              service_id: true,
              service_type: true,
              status: true,
              service_date: true,
            },
          },
        },
      });

      // Active cases - using helper function
      const activeCases = allCases.filter((c) =>
        isActiveIntegrationCase(c.integrationServices)
      ).length;

      // Completed cases - using helper function
      const completedCases = allCases.filter((c) =>
        isCompletedIntegrationCase(c.integrationServices)
      ).length;

      const uniqueClients = new Set(allCases.map((c) => c.candidate_id));
      const totalClients = uniqueClients.size;

      const revenue = allCases.reduce(
        (sum, c) => sum + (c.actual_cost || 0),
        0
      );

      // Pending actions - count pending services
      const pendingActions = allCases.reduce((sum, c) => {
        return sum + getPendingIntegrationServicesCount(c.integrationServices);
      }, 0);

      // INTEGRATION-specific metrics
      const totalServices = allCases.reduce(
        (sum, c) => sum + c.integrationServices.length,
        0
      );

      const servicesCompleted = allCases.reduce(
        (sum, c) =>
          sum + getCompletedIntegrationServicesCount(c.integrationServices),
        0
      );

      const servicesInProgress = allCases.reduce(
        (sum, c) =>
          sum + getInProgressIntegrationServicesCount(c.integrationServices),
        0
      );

      // Count specific service types completed
      const bankAccountsOpened = allCases.reduce(
        (sum, c) =>
          sum +
          c.integrationServices.filter(
            (s) =>
              s.service_type === "banking" &&
              s.status === INTEGRATION_SERVICE_STATUSES.COMPLETED
          ).length,
        0
      );

      const healthcareRegistrations = allCases.reduce(
        (sum, c) =>
          sum +
          c.integrationServices.filter(
            (s) =>
              s.service_type === "healthcare" &&
              s.status === INTEGRATION_SERVICE_STATUSES.COMPLETED
          ).length,
        0
      );

      return res.status(200).json({
        success: true,
        data: {
          agencyType,
          agencyName: user.agency.name,
          activeCases,
          completedCases,
          totalClients,
          revenue,
          pendingActions,
          totalIntegrationCases: allCases.length,
          servicesCompleted,
          servicesInProgress,
          bankAccountsOpened,
          healthcareRegistrations,
        },
      });
    }

    // ============================================
    // FALLBACK (Unknown agency type)
    // ============================================
    else {
      return res.status(200).json({
        success: true,
        data: {
          agencyType,
          agencyName: user.agency.name,
          activeCases: 0,
          completedCases: 0,
          totalClients: 0,
          revenue: 0,
          pendingActions: 0,
        },
      });
    }
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};

// GET /api/v1/agency/dashboard/activities
export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        agency_id: true,
        agency: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!user?.agency_id || !user.agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    const agencyType = user.agency.type;
    let recentCases: any[] = [];

    // ============================================
    // VISA AGENCY - Get cases they created
    // ============================================
    if (agencyType === AgencyType.VISA) {
      recentCases = await prisma.relocationCase.findMany({
        where: { agency_id: user.agency_id },
        orderBy: { updated_at: "desc" },
        take: 10,
        select: {
          case_id: true,
          case_number: true,
          status: true,
          service_type: true,
          updated_at: true,
          candidate: {
            select: {
              full_name: true,
            },
          },
          embassy_submission: {
            select: {
              status: true,
            },
          },
        },
      });
    }

    // ============================================
    // RELOCATION AGENCY - Get assigned cases
    // ============================================
    else if (agencyType === AgencyType.RELOCATION) {
      recentCases = await prisma.relocationCase.findMany({
        where: {
          housing_agency_id: user.agency_id, // Direct query
        },
        orderBy: { updated_at: "desc" },
        take: 10,
        select: {
          case_id: true,
          case_number: true,
          status: true,
          service_type: true,
          updated_at: true,
          candidate: {
            select: {
              full_name: true,
            },
          },
        },
      });
    }
    // ============================================
    // INTEGRATION AGENCY - Get assigned cases
    // ============================================
    else if (agencyType === AgencyType.INTEGRATION) {
      recentCases = await prisma.relocationCase.findMany({
        where: {
          integration_agency_id: user.agency_id, // Direct query
        },
        orderBy: { updated_at: "desc" },
        take: 10,
        select: {
          case_id: true,
          case_number: true,
          status: true,
          service_type: true,
          updated_at: true,
          candidate: {
            select: {
              full_name: true,
            },
          },
          integrationServices: {
            select: {
              status: true,
            },
          },
        },
      });
    }

    // Map cases to activities
    const activities = recentCases.map((c) => {
      let type: "new_case" | "completed" | "pending_document" | "message" =
        "new_case";
      let title = "Case update";

      if (agencyType === AgencyType.VISA) {
        // VISA agency activity types
        if (c.embassy_submission?.status === "approved") {
          type = "completed";
          title = "Visa approved";
        } else if (c.status === CASE_STATUSES.PENDING_DOCUMENTS) {
          type = "pending_document";
          title = "Document pending";
        } else if (c.status === CASE_STATUSES.INITIATED) {
          type = "new_case";
          title = "New case created";
        } else if (c.embassy_submission?.status === "submitted") {
          title = "Submitted to embassy";
        }
      } else if (agencyType === AgencyType.RELOCATION) {
        // RELOCATION agency activity types
        if (c.status === CASE_STATUSES.READY_FOR_ARRIVAL) {
          type = "completed";
          title = "Housing ready for arrival";
        } else if (c.status === CASE_STATUSES.HOUSING_ASSIGNED) {
          type = "new_case";
          title = "New housing case assigned";
        } else if (c.status === CASE_STATUSES.HOUSING_IN_PROGRESS) {
          title = "Housing arrangement in progress";
        }
      } else if (agencyType === AgencyType.INTEGRATION) {
        // INTEGRATION agency activity types
        const allCompleted = c.integrationServices?.every(
          (s) => s.status === "completed"
        );
        const anyInProgress = c.integrationServices?.some(
          (s) => s.status === "in_progress"
        );

        if (allCompleted) {
          type = "completed";
          title = "All integration services completed";
        } else if (c.status === CASE_STATUSES.INTEGRATION_ASSIGNED) {
          type = "new_case";
          title = "New integration case assigned";
        } else if (anyInProgress) {
          title = "Integration services in progress";
        }
      }

      return {
        id: c.case_id,
        type,
        title,
        description: `${c.candidate.full_name} - ${c.service_type.replace(
          /_/g,
          " "
        )}`,
        timestamp: c.updated_at.toISOString(),
        status:
          type === "completed"
            ? ("success" as const)
            : type === "pending_document"
            ? ("warning" as const)
            : ("info" as const),
      };
    });

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get recent activities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
    });
  }
};

// GET /api/v1/agency/dashboard/analytics
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        agency_id: true,
        agency: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!user?.agency_id || !user.agency) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const agencyType = user.agency.type;
    let allCases: any[] = [];

    // Get cases based on agency type
    if (agencyType === AgencyType.VISA) {
      // VISA agencies: cases they created
      allCases = await prisma.relocationCase.findMany({
        where: { agency_id: user.agency_id },
        include: {
          candidate: {
            select: {
              user_id: true,
            },
          },
          embassy_submission: true,
          housingAgency: true,
        },
      });
    } else if (agencyType === AgencyType.RELOCATION) {
      // RELOCATION: assigned cases
      allCases = await prisma.relocationCase.findMany({
        where: {
          housing_agency_id: user.agency_id, // CHANGED: Direct query
        },
        include: {
          candidate: {
            select: {
              user_id: true,
            },
          },
        },
      });
    } else if (agencyType === AgencyType.INTEGRATION) {
      // INTEGRATION agencies
      allCases = await prisma.relocationCase.findMany({
        where: {
          integration_agency_id: user.agency_id,
        },
        include: {
          candidate: {
            select: {
              user_id: true,
            },
          },
          integrationServices: true,
        },
      });
    }

    // Get reviews for ratings
    const reviews = await prisma.agencyReview.findMany({
      where: { agency_id: user.agency_id },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Revenue metrics
    const currentMonthCases = allCases.filter((c) => {
      const date = new Date(c.created_at);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });

    const lastMonthCases = allCases.filter((c) => {
      const date = new Date(c.created_at);
      return (
        date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
      );
    });

    const currentMonthRevenue = currentMonthCases.reduce(
      (sum, c) => sum + (c.actual_cost || 0),
      0
    );
    const lastMonthRevenue = lastMonthCases.reduce(
      (sum, c) => sum + (c.actual_cost || 0),
      0
    );

    const revenueChange =
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // ✅ Completion rate (adjusted per agency type using helper functions)
    let completedCases = 0;
    if (agencyType === AgencyType.VISA) {
      completedCases = allCases.filter((c: any) =>
        isCompletedVisaCase(
          c.status,
          c.embassy_submission?.status,
          c.housing_agency_id !== null
        )
      ).length;
    } else if (agencyType === AgencyType.RELOCATION) {
      completedCases = allCases.filter((c: any) =>
        isCompletedRelocationCase(c.status)
      ).length;
    } else if (agencyType === AgencyType.INTEGRATION) {
      // Integration completion
      completedCases = allCases.filter((c: any) =>
        isCompletedIntegrationCase(c.integrationServices || [])
      ).length;
    }

    const totalCases = allCases.length;
    const completionRate =
      totalCases > 0 ? (completedCases / totalCases) * 100 : 0;

    const industryAverage = 85;
    const comparisonToIndustry = completionRate - industryAverage;

    // Average processing time
    const completedWithDates = allCases.filter(
      (c: any) => c.status === CASE_STATUSES.COMPLETED && c.actual_completion
    );

    let avgProcessingTime = 0;
    if (completedWithDates.length > 0) {
      const totalDays = completedWithDates.reduce((sum, c) => {
        const start = new Date(c.created_at);
        const end = new Date(c.actual_completion!);
        const days = Math.floor(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgProcessingTime = Math.round(totalDays / completedWithDates.length);
    }

    const industryAvgTime = 26;
    const timeDifference = industryAvgTime - avgProcessingTime;

    // Client satisfaction
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const analytics = {
      revenue: {
        monthly: currentMonthRevenue,
        change: revenueChange,
        trend: revenueChange >= 0 ? "up" : "down",
      },
      completionRate: {
        rate: Math.round(completionRate),
        comparison: comparisonToIndustry >= 0 ? "above" : "below",
        difference: Math.abs(Math.round(comparisonToIndustry)),
      },
      processingTime: {
        days: avgProcessingTime,
        comparison: timeDifference >= 0 ? "faster" : "slower",
        difference: Math.abs(timeDifference),
      },
      satisfaction: {
        rating: avgRating.toFixed(1),
        reviewCount: reviews.length,
      },
    };

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};

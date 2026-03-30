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

// ── Shared helpers ──

export const getUserAgency = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      agency_id: true,
      agency: { select: { type: true, name: true } },
    },
  });
};

export const getUserAgencyBasic = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      agency_id: true,
      agency: { select: { type: true } },
    },
  });
};

// ── getDashboardStats ──

export const getVisaDashboardStats = async (agencyId: string, agencyName: string) => {
  const allCases = await prisma.relocationCase.findMany({
    where: { agency_id: agencyId },
    select: {
      case_id: true, candidate_id: true, status: true, service_type: true,
      estimated_cost: true, actual_cost: true, created_at: true, updated_at: true,
      housing_agency_id: true,
      embassy_submission: { select: { status: true } },
    },
  });

  const completedCases = allCases.filter((c) =>
    isCompletedVisaCase(c.status, c.embassy_submission?.status, c.housing_agency_id !== null)
  ).length;

  const activeCases = allCases.filter((c) =>
    isActiveVisaCase(c.status, c.embassy_submission?.status, c.housing_agency_id !== null)
  ).length;

  const totalClients = new Set(allCases.map((c) => c.candidate_id)).size;
  const revenue = allCases.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const pendingActions = allCases.filter((c) => c.status === CASE_STATUSES.PENDING_DOCUMENTS).length;
  const approvedVisas = allCases.filter((c) => c.embassy_submission?.status === "approved").length;
  const pendingVisas = allCases.filter((c) =>
    c.embassy_submission && ["submitted", "under_review", "interview_scheduled"].includes(c.embassy_submission.status)
  ).length;
  const successRate = allCases.length > 0 ? Math.round((approvedVisas / allCases.length) * 100) : 0;

  return {
    agencyType: AgencyType.VISA, agencyName, activeCases, completedCases, totalClients, revenue,
    pendingActions, totalVisaApplications: allCases.length, approvedVisas, pendingVisas, successRate,
    embassySubmissions: pendingVisas,
  };
};

export const getRelocationDashboardStats = async (agencyId: string, agencyName: string) => {
  const allCases = await prisma.relocationCase.findMany({
    where: { housing_agency_id: agencyId },
    select: {
      case_id: true, candidate_id: true, status: true, service_type: true,
      estimated_cost: true, actual_cost: true, created_at: true, updated_at: true,
      candidate: { select: { user_id: true, full_name: true, email: true } },
      housing_details: {
        select: {
          housing_type: true, housing_address: true, utility_water: true,
          utility_electricity: true, utility_internet: true, arrival_date: true,
        },
      },
    },
  });

  const completedCases = allCases.filter((c) => isCompletedRelocationCase(c.status)).length;
  const activeCases = allCases.filter((c) => isActiveRelocationCase(c.status)).length;
  const totalClients = new Set(allCases.map((c) => c.candidate_id)).size;
  const revenue = allCases.reduce((sum, c) => sum + (c.actual_cost || 0), 0);

  const pendingActions = allCases.filter((c) => {
    if (c.status === CASE_STATUSES.READY_FOR_ARRIVAL || c.status === CASE_STATUSES.COMPLETED) return false;
    const h = c.housing_details;
    if (!h) return true;
    const housingIncomplete = !h.housing_address || !h.housing_type || !h.arrival_date;
    const utilitiesIncomplete = h.utility_water !== "completed" || h.utility_electricity !== "completed" || h.utility_internet !== "completed";
    return housingIncomplete || utilitiesIncomplete;
  }).length;

  const housingCompleted = allCases.filter((c) => c.status === CASE_STATUSES.READY_FOR_ARRIVAL).length;
  const housingInProgress = allCases.filter((c) =>
    c.status === CASE_STATUSES.HOUSING_IN_PROGRESS || c.status === CASE_STATUSES.HOUSING_ASSIGNED
  ).length;

  return {
    agencyType: AgencyType.RELOCATION, agencyName, activeCases, completedCases, totalClients, revenue,
    pendingActions, totalRelocationCases: allCases.length, housingCompleted, housingInProgress,
    leasesActive: housingCompleted, propertiesFound: housingCompleted,
  };
};

export const getIntegrationDashboardStats = async (agencyId: string, agencyName: string) => {
  const allCases = await prisma.relocationCase.findMany({
    where: { integration_agency_id: agencyId },
    select: {
      case_id: true, candidate_id: true, status: true, service_type: true,
      estimated_cost: true, actual_cost: true, created_at: true, updated_at: true,
      integrationServices: { select: { service_id: true, service_type: true, status: true, service_date: true } },
    },
  });

  const activeCases = allCases.filter((c) => isActiveIntegrationCase(c.integrationServices)).length;
  const completedCases = allCases.filter((c) => isCompletedIntegrationCase(c.integrationServices)).length;
  const totalClients = new Set(allCases.map((c) => c.candidate_id)).size;
  const revenue = allCases.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const pendingActions = allCases.reduce((sum, c) => sum + getPendingIntegrationServicesCount(c.integrationServices), 0);
  const servicesCompleted = allCases.reduce((sum, c) => sum + getCompletedIntegrationServicesCount(c.integrationServices), 0);
  const servicesInProgress = allCases.reduce((sum, c) => sum + getInProgressIntegrationServicesCount(c.integrationServices), 0);
  const bankAccountsOpened = allCases.reduce((sum, c) => sum + c.integrationServices.filter((s) => s.service_type === "banking" && s.status === INTEGRATION_SERVICE_STATUSES.COMPLETED).length, 0);
  const healthcareRegistrations = allCases.reduce((sum, c) => sum + c.integrationServices.filter((s) => s.service_type === "healthcare" && s.status === INTEGRATION_SERVICE_STATUSES.COMPLETED).length, 0);

  return {
    agencyType: AgencyType.INTEGRATION, agencyName, activeCases, completedCases, totalClients, revenue,
    pendingActions, totalIntegrationCases: allCases.length, servicesCompleted, servicesInProgress,
    bankAccountsOpened, healthcareRegistrations,
  };
};

export const getFallbackDashboardStats = (agencyType: string, agencyName: string) => ({
  agencyType, agencyName, activeCases: 0, completedCases: 0, totalClients: 0, revenue: 0, pendingActions: 0,
});

// ── getRecentActivities ──

export const getVisaRecentCases = async (agencyId: string) => {
  return prisma.relocationCase.findMany({
    where: { agency_id: agencyId },
    orderBy: { updated_at: "desc" },
    take: 10,
    select: {
      case_id: true, case_number: true, status: true, service_type: true, updated_at: true,
      candidate: { select: { full_name: true } },
      embassy_submission: { select: { status: true } },
    },
  });
};

export const getRelocationRecentCases = async (agencyId: string) => {
  return prisma.relocationCase.findMany({
    where: { housing_agency_id: agencyId },
    orderBy: { updated_at: "desc" },
    take: 10,
    select: {
      case_id: true, case_number: true, status: true, service_type: true, updated_at: true,
      candidate: { select: { full_name: true } },
    },
  });
};

export const getIntegrationRecentCases = async (agencyId: string) => {
  return prisma.relocationCase.findMany({
    where: { integration_agency_id: agencyId },
    orderBy: { updated_at: "desc" },
    take: 10,
    select: {
      case_id: true, case_number: true, status: true, service_type: true, updated_at: true,
      candidate: { select: { full_name: true } },
      integrationServices: { select: { status: true } },
    },
  });
};

export const mapCasesToActivities = (recentCases: any[], agencyType: AgencyType) => {
  return recentCases.map((c) => {
    let type: "new_case" | "completed" | "pending_document" | "message" = "new_case";
    let title = "Case update";

    if (agencyType === AgencyType.VISA) {
      if (c.embassy_submission?.status === "approved") { type = "completed"; title = "Visa approved"; }
      else if (c.status === CASE_STATUSES.PENDING_DOCUMENTS) { type = "pending_document"; title = "Document pending"; }
      else if (c.status === CASE_STATUSES.INITIATED) { type = "new_case"; title = "New case created"; }
      else if (c.embassy_submission?.status === "submitted") { title = "Submitted to embassy"; }
    } else if (agencyType === AgencyType.RELOCATION) {
      if (c.status === CASE_STATUSES.READY_FOR_ARRIVAL) { type = "completed"; title = "Housing ready for arrival"; }
      else if (c.status === CASE_STATUSES.HOUSING_ASSIGNED) { type = "new_case"; title = "New housing case assigned"; }
      else if (c.status === CASE_STATUSES.HOUSING_IN_PROGRESS) { title = "Housing arrangement in progress"; }
    } else if (agencyType === AgencyType.INTEGRATION) {
      const allCompleted = c.integrationServices?.every((s: any) => s.status === "completed");
      const anyInProgress = c.integrationServices?.some((s: any) => s.status === "in_progress");
      if (allCompleted) { type = "completed"; title = "All integration services completed"; }
      else if (c.status === CASE_STATUSES.INTEGRATION_ASSIGNED) { type = "new_case"; title = "New integration case assigned"; }
      else if (anyInProgress) { title = "Integration services in progress"; }
    }

    return {
      id: c.case_id, type, title,
      description: `${c.candidate.full_name} - ${c.service_type.replace(/_/g, " ")}`,
      timestamp: c.updated_at.toISOString(),
      status: type === "completed" ? ("success" as const) : type === "pending_document" ? ("warning" as const) : ("info" as const),
    };
  });
};

// ── getAnalytics ──

export const getAnalyticsCases = async (agencyId: string, agencyType: AgencyType) => {
  if (agencyType === AgencyType.VISA) {
    return prisma.relocationCase.findMany({
      where: { agency_id: agencyId },
      include: { candidate: { select: { user_id: true } }, embassy_submission: true, housingAgency: true },
    });
  } else if (agencyType === AgencyType.RELOCATION) {
    return prisma.relocationCase.findMany({
      where: { housing_agency_id: agencyId },
      include: { candidate: { select: { user_id: true } } },
    });
  } else if (agencyType === AgencyType.INTEGRATION) {
    return prisma.relocationCase.findMany({
      where: { integration_agency_id: agencyId },
      include: { candidate: { select: { user_id: true } }, integrationServices: true },
    });
  }
  return [];
};

export const getAgencyReviews = async (agencyId: string) => {
  return prisma.agencyReview.findMany({ where: { agency_id: agencyId } });
};

export const computeAnalytics = (allCases: any[], reviews: any[], agencyType: AgencyType) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthCases = allCases.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const lastMonthCases = allCases.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const currentMonthRevenue = currentMonthCases.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const lastMonthRevenue = lastMonthCases.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const revenueChange = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  let completedCases = 0;
  if (agencyType === AgencyType.VISA) {
    completedCases = allCases.filter((c: any) => isCompletedVisaCase(c.status, c.embassy_submission?.status, c.housing_agency_id !== null)).length;
  } else if (agencyType === AgencyType.RELOCATION) {
    completedCases = allCases.filter((c: any) => isCompletedRelocationCase(c.status)).length;
  } else if (agencyType === AgencyType.INTEGRATION) {
    completedCases = allCases.filter((c: any) => isCompletedIntegrationCase(c.integrationServices || [])).length;
  }

  const totalCases = allCases.length;
  const completionRate = totalCases > 0 ? (completedCases / totalCases) * 100 : 0;
  const industryAverage = 85;
  const comparisonToIndustry = completionRate - industryAverage;

  const completedWithDates = allCases.filter((c: any) => c.status === CASE_STATUSES.COMPLETED && c.actual_completion);
  let avgProcessingTime = 0;
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, c) => {
      const start = new Date(c.created_at);
      const end = new Date(c.actual_completion!);
      return sum + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    avgProcessingTime = Math.round(totalDays / completedWithDates.length);
  }

  const industryAvgTime = 26;
  const timeDifference = industryAvgTime - avgProcessingTime;

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return {
    revenue: { monthly: currentMonthRevenue, change: revenueChange, trend: revenueChange >= 0 ? "up" : "down" },
    completionRate: { rate: Math.round(completionRate), comparison: comparisonToIndustry >= 0 ? "above" : "below", difference: Math.abs(Math.round(comparisonToIndustry)) },
    processingTime: { days: avgProcessingTime, comparison: timeDifference >= 0 ? "faster" : "slower", difference: Math.abs(timeDifference) },
    satisfaction: { rating: avgRating.toFixed(1), reviewCount: reviews.length },
  };
};
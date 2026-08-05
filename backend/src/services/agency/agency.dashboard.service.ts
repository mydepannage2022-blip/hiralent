import { AgencyType } from "@prisma/client";
import prisma from '../../lib/prisma';
import {
  isActiveVisaCase,
  isActiveRelocationCase,
  isActiveIntegrationCase,
  isCompletedVisaCase,
  isCompletedRelocationCase,
  isCompletedIntegrationCase,
  CASE_STATUSES,
  INTEGRATION_SERVICE_STATUSES,
} from "../../constants/caseStatuses";


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

// ── Bounded DB-side dashboard stats (R-30) ──
//
// These previously pulled EVERY case for an agency (with relations + candidate PII) into
// memory and aggregated in JS — a per-hit unbounded read that could OOM a large agency's
// dashboard. Each metric is now a discrete count / _sum / groupBy that Postgres computes,
// so total work is bounded regardless of case volume. The predicate translations below are
// FAITHFUL to the JS helpers in constants/caseStatuses.ts and are proven equal to the old
// in-memory computation by verify-agency-dashboard-stats.mjs (golden fixture, new === old).
// If a helper's logic changes, that golden verifier fails until these are re-derived.

// Visa case is "done" (no longer active) once it reaches any housing/integration/completed
// status — mirrors the tail of isActiveVisaCase / body of isCompletedVisaCase.
const VISA_DONE_STATUSES = [
  CASE_STATUSES.HOUSING_ASSIGNED,
  CASE_STATUSES.HOUSING_IN_PROGRESS,
  CASE_STATUSES.READY_FOR_ARRIVAL,
  CASE_STATUSES.INTEGRATION_ASSIGNED,
  CASE_STATUSES.INTEGRATION_IN_PROGRESS,
  CASE_STATUSES.COMPLETED,
];
const PENDING_EMBASSY_STATUSES = ["submitted", "under_review", "interview_scheduled"];

export const getVisaDashboardStats = async (agencyId: string, agencyName: string) => {
  const where = { agency_id: agencyId };

  const [
    totalVisaApplications, clientGroups, revenueAgg, pendingActions,
    approvedVisas, pendingVisas, completedCases, activeCases,
  ] = await Promise.all([
    prisma.relocationCase.count({ where }),
    prisma.relocationCase.groupBy({ by: ["candidate_id"], where }),
    prisma.relocationCase.aggregate({ where, _sum: { actual_cost: true } }),
    prisma.relocationCase.count({ where: { ...where, status: CASE_STATUSES.PENDING_DOCUMENTS } }),
    // approved = embassy_submission.status === "approved"
    prisma.relocationCase.count({ where: { ...where, embassy_submission: { status: "approved" } } }),
    // pending = embassy_submission.status ∈ {submitted, under_review, interview_scheduled}
    prisma.relocationCase.count({ where: { ...where, embassy_submission: { status: { in: PENDING_EMBASSY_STATUSES } } } }),
    // isCompletedVisaCase: embassy approved OR status ∈ done-statuses
    prisma.relocationCase.count({
      where: { ...where, OR: [{ embassy_submission: { status: "approved" } }, { status: { in: VISA_DONE_STATUSES } }] },
    }),
    // isActiveVisaCase: NOT cancelled/completed/done-status AND embassy NOT approved/rejected
    // (a null embassy_submission is not approved/rejected → still eligible, matching the JS).
    prisma.relocationCase.count({
      where: {
        ...where,
        status: { notIn: [CASE_STATUSES.CANCELLED, ...VISA_DONE_STATUSES] },
        NOT: { embassy_submission: { status: { in: ["approved", "rejected"] } } },
      },
    }),
  ]);

  const totalClients = clientGroups.length;
  const revenue = revenueAgg._sum.actual_cost || 0;
  const successRate = totalVisaApplications > 0 ? Math.round((approvedVisas / totalVisaApplications) * 100) : 0;

  return {
    agencyType: AgencyType.VISA, agencyName, activeCases, completedCases, totalClients, revenue,
    pendingActions, totalVisaApplications, approvedVisas, pendingVisas, successRate,
    embassySubmissions: pendingVisas,
  };
};

export const getRelocationDashboardStats = async (agencyId: string, agencyName: string) => {
  const where = { housing_agency_id: agencyId };

  const [
    totalRelocationCases, clientGroups, revenueAgg,
    completedCases, activeCases, housingCompleted, housingInProgress, pendingActions,
  ] = await Promise.all([
    prisma.relocationCase.count({ where }),
    prisma.relocationCase.groupBy({ by: ["candidate_id"], where }),
    prisma.relocationCase.aggregate({ where, _sum: { actual_cost: true } }),
    // isCompletedRelocationCase: status ∈ {ready_for_arrival, completed}
    prisma.relocationCase.count({ where: { ...where, status: { in: [CASE_STATUSES.READY_FOR_ARRIVAL, CASE_STATUSES.COMPLETED] } } }),
    // isActiveRelocationCase: status ∈ {housing_assigned, housing_in_progress}
    prisma.relocationCase.count({ where: { ...where, status: { in: [CASE_STATUSES.HOUSING_ASSIGNED, CASE_STATUSES.HOUSING_IN_PROGRESS] } } }),
    prisma.relocationCase.count({ where: { ...where, status: CASE_STATUSES.READY_FOR_ARRIVAL } }),
    prisma.relocationCase.count({ where: { ...where, status: { in: [CASE_STATUSES.HOUSING_IN_PROGRESS, CASE_STATUSES.HOUSING_ASSIGNED] } } }),
    // pendingActions: not ready/completed AND (no housing_details, OR any required housing field
    // missing/blank, OR any utility not "completed"). null utilities count as incomplete, so each
    // utility contributes an explicit `null` OR branch alongside `not: "completed"` (SQL `<>` alone
    // would drop nulls) — faithfully matching the JS `!== "completed"`.
    prisma.relocationCase.count({
      where: {
        ...where,
        status: { notIn: [CASE_STATUSES.READY_FOR_ARRIVAL, CASE_STATUSES.COMPLETED] },
        OR: [
          { housing_details: { is: null } },
          { housing_details: { housing_address: null } },
          { housing_details: { housing_address: "" } },
          { housing_details: { housing_type: null } },
          { housing_details: { housing_type: "" } },
          { housing_details: { arrival_date: null } },
          { housing_details: { utility_water: null } },
          { housing_details: { utility_water: { not: "completed" } } },
          { housing_details: { utility_electricity: null } },
          { housing_details: { utility_electricity: { not: "completed" } } },
          { housing_details: { utility_internet: null } },
          { housing_details: { utility_internet: { not: "completed" } } },
        ],
      },
    }),
  ]);

  const totalClients = clientGroups.length;
  const revenue = revenueAgg._sum.actual_cost || 0;

  return {
    agencyType: AgencyType.RELOCATION, agencyName, activeCases, completedCases, totalClients, revenue,
    pendingActions, totalRelocationCases, housingCompleted, housingInProgress,
    leasesActive: housingCompleted, propertiesFound: housingCompleted,
  };
};

export const getIntegrationDashboardStats = async (agencyId: string, agencyName: string) => {
  const caseWhere = { integration_agency_id: agencyId };
  const svcWhere = { case: { integration_agency_id: agencyId } };

  const [
    totalIntegrationCases, clientGroups, revenueAgg, activeCases,
    pendingActions, servicesCompleted, servicesInProgress, bankAccountsOpened, healthcareRegistrations,
    svcTotals, svcCompleted,
  ] = await Promise.all([
    prisma.relocationCase.count({ where: caseWhere }),
    prisma.relocationCase.groupBy({ by: ["candidate_id"], where: caseWhere }),
    prisma.relocationCase.aggregate({ where: caseWhere, _sum: { actual_cost: true } }),
    // isActiveIntegrationCase: at least one service not completed/cancelled (empty → not active)
    prisma.relocationCase.count({ where: { ...caseWhere, integrationServices: { some: { status: { notIn: [INTEGRATION_SERVICE_STATUSES.COMPLETED, INTEGRATION_SERVICE_STATUSES.CANCELLED] } } } } }),
    // service-level tallies across all the agency's cases (sum of per-case counts in the JS)
    prisma.integrationService.count({ where: { ...svcWhere, status: INTEGRATION_SERVICE_STATUSES.PENDING } }),
    prisma.integrationService.count({ where: { ...svcWhere, status: INTEGRATION_SERVICE_STATUSES.COMPLETED } }),
    prisma.integrationService.count({ where: { ...svcWhere, status: INTEGRATION_SERVICE_STATUSES.IN_PROGRESS } }),
    prisma.integrationService.count({ where: { ...svcWhere, service_type: "banking", status: INTEGRATION_SERVICE_STATUSES.COMPLETED } }),
    prisma.integrationService.count({ where: { ...svcWhere, service_type: "healthcare", status: INTEGRATION_SERVICE_STATUSES.COMPLETED } }),
    // isCompletedIntegrationCase: a case has >= 6 services AND every one is completed. Reconstruct
    // per-case from two bounded groupBys (case_id + counts only — no full includes/PII).
    prisma.integrationService.groupBy({ by: ["case_id"], where: svcWhere, _count: { _all: true } }),
    prisma.integrationService.groupBy({ by: ["case_id"], where: { ...svcWhere, status: INTEGRATION_SERVICE_STATUSES.COMPLETED }, _count: { _all: true } }),
  ]);

  const completedByCase = new Map(svcCompleted.map((g) => [g.case_id, g._count._all]));
  const completedCases = svcTotals.filter(
    (g) => g._count._all >= 6 && completedByCase.get(g.case_id) === g._count._all
  ).length;

  const totalClients = clientGroups.length;
  const revenue = revenueAgg._sum.actual_cost || 0;

  return {
    agencyType: AgencyType.INTEGRATION, agencyName, activeCases, completedCases, totalClients, revenue,
    pendingActions, totalIntegrationCases, servicesCompleted, servicesInProgress,
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
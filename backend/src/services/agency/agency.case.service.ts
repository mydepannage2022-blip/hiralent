import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";
import { renderEmailKeyValueTable, renderTransactionalEmail } from "../emailTemplates.service";
import {
  isActiveVisaCase,
  isActiveRelocationCase,
  isCompletedVisaCase,
  isCompletedRelocationCase,
  isCompletedIntegrationCase,
  isActiveIntegrationCase,
  CASE_STATUSES,
} from "../../constants/caseStatuses";

const prisma = new PrismaClient();

const getServiceTypeForAgency = (agencyType: string, caseServiceType: string) => {
  const t = (agencyType ?? "").toUpperCase();
  if (t === "RELOCATION") return "housing";
  if (t === "INTEGRATION") return "integration";
  return caseServiceType;
};

// ── Candidate lookup ──

export const findCandidateById = async (candidateId: string) => {
  return prisma.user.findFirst({
    where: {
      user_id: candidateId,
      role: "candidate",
    },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      phone_number: true,
    },
  });
};

// ── Create case ──

export const createCaseInDb = async (params: {
  candidateId: string;
  agencyId: string;
  serviceType: string;
  originCountry?: string;
  destinationCountry: string;
  destinationCity?: string;
  priorityLevel: string;
  estimatedCompletion?: string;
  estimatedCost?: string;
  notes?: string;
}) => {
  const {
    candidateId, agencyId, serviceType, originCountry, destinationCountry,
    destinationCity, priorityLevel, estimatedCompletion, estimatedCost, notes,
  } = params;

  const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const newCase = await prisma.relocationCase.create({
    data: {
      case_number: caseNumber,
      candidate_id: candidateId,
      agency_id: agencyId,
      service_type: serviceType,
      origin_country: originCountry || "Not specified",
      destination_country: destinationCountry,
      destination_city: destinationCity || null,
      priority_level: priorityLevel,
      status: "documents_pending",
      estimated_completion: estimatedCompletion ? new Date(estimatedCompletion) : null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      notes: notes || null,
    },
    include: {
      candidate: {
        select: { user_id: true, full_name: true, email: true, phone_number: true },
      },
      agency: {
        select: { agency_id: true, name: true, email: true },
      },
    },
  });

  console.log(`Case created successfully: ${newCase.case_number}`);
  return newCase;
};

// ── Send case creation email ──

export const sendCaseCreationEmail = async (params: {
  candidateFullName: string;
  candidateEmail: string;
  agencyName: string;
  caseNumber: string;
  caseId: string;
  serviceType: string;
  destinationCountry: string;
  destinationCity?: string;
  priorityLevel: string;
}) => {
  const {
    candidateFullName, candidateEmail, agencyName, caseNumber, caseId,
    serviceType, destinationCountry, destinationCity, priorityLevel,
  } = params;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const caseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;

  const detailsHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Agency", value: agencyName },
    { label: "Service type", value: serviceType.replace("_", " ") },
    {
      label: "Destination",
      value: `${destinationCountry}${destinationCity ? ` (${destinationCity})` : ""}`,
    },
    { label: "Priority", value: priorityLevel },
  ]);

  const nextStepsHtml = `
    <ol style="margin: 0; padding-left: 18px;">
      <li>Open your case to review details and required documents</li>
      <li>Upload any missing documents</li>
      <li>Your agency will review and keep you updated</li>
    </ol>`;

  const emailHtml = renderTransactionalEmail({
    title: "New case created",
    previewText: `A new case (${caseNumber}) is ready to view.`,
    greetingName: candidateFullName,
    introHtml: "A new relocation case has been created for you.",
    sections: [
      { title: "Case details", html: detailsHtml },
      { title: "Next steps", html: nextStepsHtml },
    ],
    cta: { label: "View case", href: caseUrl },
    tone: "info",
  });

  await sendEmail({
    to: candidateEmail,
    subject: `New Case Created - ${caseNumber}`,
    html: emailHtml,
  });
};

// ── User agency lookup ──

export const getUserWithAgency = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      agency_id: true,
      agency: { select: { type: true } },
    },
  });
};

// ── List cases ──

export const listCasesForAgency = async (params: {
  agencyId: string;
  agencyType: string;
  status?: string;
  search?: string;
}) => {
  const { agencyId, agencyType, status, search } = params;

  let where: any = {};

  if (agencyType === "VISA") {
    where.agency_id = agencyId;
  } else if (agencyType === "RELOCATION") {
    where.housing_agency_id = agencyId;
  } else if (agencyType === "INTEGRATION") {
    where.integration_agency_id = agencyId;
  } else {
    return [];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { case_number: { contains: search, mode: "insensitive" } },
      { candidate: { full_name: { contains: search, mode: "insensitive" } } },
      { candidate: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const cases = await prisma.relocationCase.findMany({
    where,
    include: {
      candidate: {
        select: { user_id: true, email: true, full_name: true, phone_number: true },
      },
      embassy_submission: agencyType === "VISA" ? { select: { status: true } } : false,
    },
    orderBy: { created_at: "desc" },
  });

  // VISA dashboards treat visa approval as a completed visa case.
  // Keep DB/workflow status intact; return explicit agency-view fields instead of rewriting `status`.
  if (agencyType === "VISA") {
    return cases.map((c: any) => {
      const embassyStatus = c.embassy_submission?.status;
      const housingAssigned = c.housing_agency_id !== null;
      const completedForAgency = isCompletedVisaCase(c.status, embassyStatus, housingAssigned);
      const activeForAgency = isActiveVisaCase(c.status, embassyStatus, housingAssigned);
      const statusForAgency = completedForAgency ? CASE_STATUSES.COMPLETED : undefined;

      return {
        ...c,
        viewing_agency_type: agencyType,
        serviceTypeForAgency: getServiceTypeForAgency(agencyType, c.service_type),
        statusForAgency,
        completedForAgency,
        activeForAgency,
      };
    });
  }

  return cases.map((c: any) => ({
    ...c,
    viewing_agency_type: agencyType,
    serviceTypeForAgency: getServiceTypeForAgency(agencyType, c.service_type),
  }));
};

// ── Get single case ──

export const getCaseByIdForAgency = async (params: {
  caseId: string;
  agencyId: string;
  agencyType?: string;
}) => {
  const { caseId, agencyId, agencyType } = params;

  let whereClause: any = { case_id: caseId };

  if (agencyType === "VISA") {
    whereClause.agency_id = agencyId;
  } else if (agencyType === "RELOCATION") {
    whereClause.housing_agency_id = agencyId;
  } else if (agencyType === "INTEGRATION") {
    whereClause.integration_agency_id = agencyId;
  }

  const caseData = await prisma.relocationCase.findFirst({
    where: whereClause,
    include: {
      candidate: {
        select: { user_id: true, email: true, full_name: true, phone_number: true },
      },
      updates: { orderBy: { created_at: "desc" }, take: 10 },
      documents: { orderBy: { created_at: "desc" } },
      embassy_submission: true,
      agency: { select: { agency_id: true, name: true, type: true } },
      housing_details: true,
      ...(agencyType === "INTEGRATION"
        ? {
            integrationAgency: {
              select: {
                agency_id: true,
                name: true,
                email: true,
                phone: true,
                type: true,
              },
            },
            integrationServices: {
              orderBy: { created_at: "asc" },
            },
          }
        : {}),
    },
  });

  if (!caseData) return caseData;

  const enrichedBase = {
    ...caseData,
    serviceTypeForAgency: getServiceTypeForAgency(agencyType || "", caseData.service_type),
  };

  if (agencyType === "VISA") {
    const embassyStatus = enrichedBase.embassy_submission?.status;
    const housingAssigned = enrichedBase.housing_agency_id !== null;
    const completedForAgency = isCompletedVisaCase(enrichedBase.status, embassyStatus, housingAssigned);
    const activeForAgency = isActiveVisaCase(enrichedBase.status, embassyStatus, housingAssigned);
    const statusForAgency = completedForAgency ? CASE_STATUSES.COMPLETED : undefined;

    return {
      ...enrichedBase,
      statusForAgency,
      completedForAgency,
      activeForAgency,
    } as any;
  }

  return enrichedBase;
};

export const flattenCaseData = (caseData: any, viewingAgencyType: string | null) => {
  return {
    ...caseData,
    housing_type: caseData.housing_details?.housing_type,
    housing_address: caseData.housing_details?.housing_address,
    monthly_rent_mad: caseData.housing_details?.monthly_rent_mad,
    agency_fee_amount: caseData.housing_details?.agency_fee_amount,
    lease_start_date: caseData.housing_details?.lease_start_date,
    lease_end_date: caseData.housing_details?.lease_end_date,
    housing_contract_url: caseData.housing_details?.housing_contract_url,
    utility_water: caseData.housing_details?.utility_water,
    utility_electricity: caseData.housing_details?.utility_electricity,
    utility_internet: caseData.housing_details?.utility_internet,
    arrival_date: caseData.housing_details?.arrival_date,
    flight_number: caseData.housing_details?.flight_number,
    airport_pickup_required: caseData.housing_details?.airport_pickup_required,
    arrival_notes: caseData.housing_details?.arrival_notes,
    housing_details: undefined,
    viewing_agency_type: viewingAgencyType,
  };
};

// ── Get clients ──

export const getClientsForAgency = async (params: {
  agencyId: string;
  agencyType: string;
}) => {
  const { agencyId, agencyType } = params;

  let cases: any[] = [];

  if (agencyType === "VISA") {
    cases = await prisma.relocationCase.findMany({
      where: { agency_id: agencyId },
      include: {
        candidate: { select: { user_id: true, email: true, full_name: true, phone_number: true, created_at: true } },
        embassy_submission: { select: { status: true } },
      },
    });
  } else if (agencyType === "RELOCATION") {
    cases = await prisma.relocationCase.findMany({
      where: { housing_agency_id: agencyId },
      include: {
        candidate: { select: { user_id: true, email: true, full_name: true, phone_number: true, created_at: true } },
      },
    });
  } else if (agencyType === "INTEGRATION") {
    cases = await prisma.relocationCase.findMany({
      where: { integration_agency_id: agencyId },
      include: {
        candidate: { select: { user_id: true, email: true, full_name: true, phone_number: true, created_at: true } },
        integrationServices: true,
      },
    });
  }

  const clientsMap = new Map();

  cases.forEach((c) => {
    const clientId = c.candidate.user_id;

    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, {
        id: c.candidate.user_id,
        name: c.candidate.full_name,
        email: c.candidate.email,
        phone: c.candidate.phone_number,
        joinedAt: c.candidate.created_at,
        cases: [],
        totalCases: 0,
        activeCases: 0,
        completedCases: 0,
      });
    }

    const client = clientsMap.get(clientId);
    client.cases.push({
      case_id: c.case_id,
      case_number: c.case_number,
      status: c.status,
      service_type: c.service_type,
      created_at: c.created_at,
    });
    client.totalCases += 1;

    if (agencyType === "VISA") {
      const embassyStatus = c.embassy_submission?.status;
      const housingAssigned = c.housing_agency_id !== null;
      if (isCompletedVisaCase(c.status, embassyStatus, housingAssigned)) {
        client.completedCases += 1;
      } else if (isActiveVisaCase(c.status, embassyStatus, housingAssigned)) {
        client.activeCases += 1;
      }
    } else if (agencyType === "RELOCATION") {
      if (isCompletedRelocationCase(c.status)) {
        client.completedCases += 1;
      } else if (isActiveRelocationCase(c.status)) {
        client.activeCases += 1;
      }
    } else if (agencyType === "INTEGRATION") {
      const services = c.integrationServices || [];
      if (isCompletedIntegrationCase(services)) {
        client.completedCases += 1;
      } else if (isActiveIntegrationCase(services)) {
        client.activeCases += 1;
      }
    }
  });

  const clients = Array.from(clientsMap.values()).map((client) => ({
    ...client,
    status: client.activeCases > 0 ? "Active" : "Completed",
  }));

  clients.sort((a, b) => {
    const aLastCase = Math.max(...a.cases.map((c: any) => new Date(c.created_at).getTime()));
    const bLastCase = Math.max(...b.cases.map((c: any) => new Date(c.created_at).getTime()));
    return bLastCase - aLastCase;
  });

  return clients;
};

// ── Get user agency_id only ──

export const getUserAgencyId = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: { agency_id: true },
  });
};

// ── Verify case belongs to agency ──

export const verifyCaseBelongsToAgency = async (caseId: string, agencyId: string) => {
  return prisma.relocationCase.findFirst({
    where: { case_id: caseId, agency_id: agencyId },
  });
};

// ── Update case ──

export const updateCaseInDb = async (
  caseId: string,
  updateFields: {
    status?: string;
    priority_level?: string;
    estimated_completion?: string;
    estimated_cost?: number;
    actual_cost?: number;
    payment_status?: string;
    notes?: string;
    destination_city?: string;
  }
) => {
  const {
    status, priority_level, estimated_completion, estimated_cost,
    actual_cost, payment_status, notes, destination_city,
  } = updateFields;

  const updateData: any = {};

  if (status !== undefined) updateData.status = status;
  if (priority_level !== undefined) updateData.priority_level = priority_level;
  if (destination_city !== undefined) updateData.destination_city = destination_city;
  if (estimated_completion !== undefined) {
    updateData.estimated_completion = estimated_completion ? new Date(estimated_completion) : null;
  }
  if (estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
  if (actual_cost !== undefined) updateData.actual_cost = actual_cost;
  if (payment_status !== undefined) updateData.payment_status = payment_status;
  if (notes !== undefined) updateData.notes = notes;

  return prisma.relocationCase.update({
    where: { case_id: caseId },
    data: updateData,
    include: {
      candidate: {
        select: { user_id: true, email: true, full_name: true, phone_number: true },
      },
    },
  });
};
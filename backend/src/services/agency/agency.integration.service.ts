import { PrismaClient } from "@prisma/client";
import {
  CASE_STATUSES,
  INTEGRATION_SERVICE_STATUSES,
  INTEGRATION_SERVICE_TYPES,
  isCompletedIntegrationCase,
} from "../../constants/caseStatuses";

const prisma = new PrismaClient();

export const getUserAgencyInfoForIntegration = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: { agency_id: true, agency: { select: { type: true } } },
  });
};

export const verifyCaseForIntegrationAgency = async (caseId: string, agencyId: string) => {
  return prisma.relocationCase.findFirst({
    where: { case_id: caseId, integration_agency_id: agencyId },
    select: { case_id: true, status: true },
  });
};

export const listIntegrationServicesForCase = async (caseId: string) => {
  return prisma.integrationService.findMany({
    where: { case_id: caseId },
    orderBy: { created_at: "asc" },
  });
};

const DEFAULT_SERVICE_TYPES = [
  INTEGRATION_SERVICE_TYPES.HEALTHCARE,
  INTEGRATION_SERVICE_TYPES.BANKING,
  INTEGRATION_SERVICE_TYPES.TAX_ID,
  INTEGRATION_SERVICE_TYPES.TELECOM,
  INTEGRATION_SERVICE_TYPES.TRANSPORT,
  INTEGRATION_SERVICE_TYPES.INTEGRATION_PROGRAM,
] as const;

export const bootstrapIntegrationServicesForCase = async (caseId: string) => {
  const existing = await listIntegrationServicesForCase(caseId);
  const existingTypes = new Set(existing.map((s) => s.service_type));

  const missingTypes = DEFAULT_SERVICE_TYPES.filter(
    (t) => !existingTypes.has(t)
  );

  if (missingTypes.length === 0) {
    return { created: 0, services: existing };
  }

  await prisma.$transaction(
    missingTypes.map((serviceType) =>
      prisma.integrationService.create({
        data: {
          case_id: caseId,
          service_type: serviceType,
          status: INTEGRATION_SERVICE_STATUSES.PENDING,
        },
      })
    )
  );

  const services = await listIntegrationServicesForCase(caseId);
  return { created: missingTypes.length, services };
};

const normalizeOptionalString = (value: unknown) => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const updateIntegrationServiceForCase = async (params: {
  caseId: string;
  serviceId: string;
  status?: string;
  service_date?: string | null;
  notes?: string | null;
  proof_document?: string | null;
}) => {
  const { caseId, serviceId, status, service_date, notes, proof_document } =
    params;

  const service = await prisma.integrationService.findFirst({
    where: { service_id: serviceId, case_id: caseId },
  });

  if (!service) {
    return null;
  }

  const allowedStatuses = new Set<string>(
    Object.values(INTEGRATION_SERVICE_STATUSES)
  );

  if (status !== undefined && !allowedStatuses.has(status)) {
    throw new Error("Invalid integration service status");
  }

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;

  if (service_date !== undefined) {
    if (service_date === null || service_date === "") {
      updateData.service_date = null;
    } else {
      const parsed = new Date(service_date);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid service_date");
      }
      updateData.service_date = parsed;
    }
  }

  const normalizedNotes = normalizeOptionalString(notes);
  if (normalizedNotes !== undefined) updateData.notes = normalizedNotes;

  const normalizedProof = normalizeOptionalString(proof_document);
  if (normalizedProof !== undefined) updateData.proof_document = normalizedProof;

  const updated = await prisma.integrationService.update({
    where: { service_id: serviceId },
    data: updateData,
  });

  const allServices = await listIntegrationServicesForCase(caseId);

  const completed = isCompletedIntegrationCase(allServices);
  const anyStarted = allServices.some(
    (s) =>
      s.status === INTEGRATION_SERVICE_STATUSES.IN_PROGRESS ||
      s.status === INTEGRATION_SERVICE_STATUSES.COMPLETED
  );

  if (completed) {
    await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: { status: CASE_STATUSES.COMPLETED },
    });
  } else if (anyStarted) {
    const current = await prisma.relocationCase.findUnique({
      where: { case_id: caseId },
      select: { status: true },
    });

    if (current?.status === CASE_STATUSES.INTEGRATION_ASSIGNED) {
      await prisma.relocationCase.update({
        where: { case_id: caseId },
        data: { status: CASE_STATUSES.INTEGRATION_IN_PROGRESS },
      });
    }
  }

  return updated;
};

import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";
import { renderEmailKeyValueTable, renderTransactionalEmail } from "../emailTemplates.service";

const prisma = new PrismaClient();

export const getUserAgencyInfo = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: { agency_id: true, agency: { select: { type: true, name: true } } },
  });
};

export const verifyCaseForHousingAgency = async (
  caseId: string,
  agencyId: string
) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      housing_agency_id: agencyId,
    },
  });
};

export const verifyCaseForHousingAgencyWithDetails = async (
  caseId: string,
  agencyId: string
) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      housing_agency_id: agencyId,
    },
    include: {
      candidate: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
        },
      },
      housing_details: true,
    },
  });
};

export const upsertHousingDetails = async (
  caseId: string,
  housingData: {
    housing_type?: string;
    housing_address?: string;
    monthly_rent_mad?: number;
    agency_fee_amount?: number;
    lease_start_date?: Date;
    lease_end_date?: Date;
    housing_contract_url?: string;
  }
) => {
  const existingHousing = await prisma.housingArrangement.findUnique({
    where: { case_id: caseId },
  });

  if (existingHousing) {
    return prisma.housingArrangement.update({
      where: { case_id: caseId },
      data: housingData,
    });
  } else {
    return prisma.housingArrangement.create({
      data: {
        case_id: caseId,
        ...housingData,
      },
    });
  }
};

export const progressCaseStatusIfNeeded = async (
  caseId: string,
  currentStatus: string
) => {
  if (currentStatus === "housing_assigned") {
    await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        status: "housing_in_progress",
        updated_at: new Date(),
      },
    });
  }
};

export const getCaseWithHousingDetails = async (caseId: string) => {
  return prisma.relocationCase.findUnique({
    where: { case_id: caseId },
    include: {
      candidate: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
        },
      },
      housing_details: true,
    },
  });
};

export const upsertUtilityStatus = async (
  caseId: string,
  utilities: {
    utility_water?: string;
    utility_electricity?: string;
    utility_internet?: string;
  }
) => {
  return prisma.housingArrangement.upsert({
    where: { case_id: caseId },
    update: {
      utility_water: utilities.utility_water || undefined,
      utility_electricity: utilities.utility_electricity || undefined,
      utility_internet: utilities.utility_internet || undefined,
    },
    create: {
      case_id: caseId,
      utility_water: utilities.utility_water || "pending",
      utility_electricity: utilities.utility_electricity || "pending",
      utility_internet: utilities.utility_internet || "pending",
    },
  });
};

export const upsertArrivalDetails = async (
  caseId: string,
  arrivalData: {
    arrival_date?: string;
    flight_number?: string;
    airport_pickup_required?: boolean;
    arrival_notes?: string;
  }
) => {
  return prisma.housingArrangement.upsert({
    where: { case_id: caseId },
    update: {
      arrival_date: arrivalData.arrival_date
        ? new Date(arrivalData.arrival_date)
        : undefined,
      flight_number: arrivalData.flight_number || undefined,
      airport_pickup_required:
        arrivalData.airport_pickup_required !== undefined
          ? arrivalData.airport_pickup_required
          : undefined,
      arrival_notes: arrivalData.arrival_notes || undefined,
    },
    create: {
      case_id: caseId,
      arrival_date: arrivalData.arrival_date
        ? new Date(arrivalData.arrival_date)
        : null,
      flight_number: arrivalData.flight_number || null,
      airport_pickup_required: arrivalData.airport_pickup_required || false,
      arrival_notes: arrivalData.arrival_notes || null,
    },
  });
};

export const checkHousingCompleteness = (housing: any) => {
  const isComplete = !!(
    housing &&
    housing.housing_type &&
    housing.housing_address &&
    housing.monthly_rent_mad &&
    housing.lease_start_date &&
    housing.utility_water === "completed" &&
    housing.utility_electricity === "completed" &&
    housing.utility_internet === "completed" &&
    housing.arrival_date &&
    housing.flight_number
  );

  const missing = {
    housing_type: !housing?.housing_type,
    housing_address: !housing?.housing_address,
    monthly_rent: !housing?.monthly_rent_mad,
    lease_start: !housing?.lease_start_date,
    water: housing?.utility_water !== "completed",
    electricity: housing?.utility_electricity !== "completed",
    internet: housing?.utility_internet !== "completed",
    arrival_date: !housing?.arrival_date,
    flight_number: !housing?.flight_number,
  };

  return { isComplete, missing };
};

export const markCaseReadyForArrival = async (caseId: string) => {
  return prisma.relocationCase.update({
    where: { case_id: caseId },
    data: {
      status: "ready_for_arrival",
      updated_at: new Date(),
    },
  });
};

export const sendReadyForArrivalEmail = async (params: {
  candidateEmail: string;
  candidateName: string;
  agencyName: string;
  caseNumber: string;
  caseId: string;
  destinationCountry: string;
  housing: {
    housing_type: string | null;
    housing_address: string | null;
    monthly_rent_mad: any;
    agency_fee_amount: any;
    lease_start_date: Date | null;
    arrival_date: Date | null;
    flight_number: string | null;
    airport_pickup_required: boolean | null;
  };
}) => {
  const {
    candidateEmail,
    candidateName,
    agencyName,
    caseNumber,
    caseId,
    destinationCountry,
    housing,
  } = params;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const caseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;
  const moveInDate = housing.lease_start_date
    ? new Date(housing.lease_start_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const arrivalDate = housing.arrival_date
    ? new Date(housing.arrival_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const summaryHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Destination", value: destinationCountry },
    { label: "Managed by", value: agencyName },
  ]);

  const housingHtml = renderEmailKeyValueTable([
    { label: "Type", value: housing.housing_type ? housing.housing_type.replace("_", " ") : null },
    { label: "Address", value: housing.housing_address },
    { label: "Move-in date", value: moveInDate },
    { label: "Monthly rent", value: housing.monthly_rent_mad ? `${housing.monthly_rent_mad} MAD` : null },
    { label: "Agency fee", value: housing.agency_fee_amount ? `${housing.agency_fee_amount} MAD` : null },
  ]);

  const travelHtml = renderEmailKeyValueTable([
    { label: "Arrival date", value: arrivalDate },
    { label: "Flight number", value: housing.flight_number },
    { label: "Airport pickup", value: housing.airport_pickup_required ? "Arranged" : null },
  ]);

  const utilitiesHtml = `
    <ul style="margin: 0; padding-left: 18px;">
      <li>Water: connected</li>
      <li>Electricity: connected</li>
      <li>Internet: connected</li>
    </ul>`;

  const nextHtml = `
    <p style="margin:0 0 10px;">Next step: choose an integration agency to help you settle in.</p>
    <ul style="margin: 0; padding-left: 18px;">
      <li>Healthcare registration</li>
      <li>Bank account setup</li>
      <li>Tax ID registration</li>
      <li>Telecom setup</li>
    </ul>`;

  const emailHtml = renderTransactionalEmail({
    title: "Housing ready for arrival",
    previewText: `Housing is ready for case ${caseNumber}.`,
    greetingName: candidateName,
    introHtml: "Your housing and relocation preparations are complete.",
    sections: [
      { title: "Summary", html: summaryHtml },
      { title: "Housing details", html: housingHtml },
      { title: "Travel details", html: travelHtml },
      { title: "Utilities", html: utilitiesHtml },
      { title: "Next step", html: nextHtml },
    ],
    cta: { label: "Open case dashboard", href: caseUrl },
    tone: "success",
    footerNote: "Safe travels. This is an automated message from Hiralent. Please do not reply.",
  });

  await sendEmail({
    to: candidateEmail,
    subject: `Your Housing is Ready - Choose Integration Agency - ${caseNumber}`,
    html: emailHtml,
  });
};

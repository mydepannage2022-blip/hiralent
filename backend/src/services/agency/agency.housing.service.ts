import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

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

  const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
      .info-section { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
      .next-step-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
      .button-primary { display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: bold; }
      .button-secondary { display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      .highlight { color: #059669; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Your Housing is Ready!</h1>
        <p style="font-size: 18px; margin-top: 10px;">Welcome to ${destinationCountry}, ${candidateName}!</p>
      </div>
      <div class="content">
        <div class="success-box">
          <h2 style="margin-top: 0; color: #059669;">Everything is Prepared for Your Arrival</h2>
          <p>Great news! Your housing and relocation preparations are complete.</p>
          <p><strong>Case Number:</strong> ${caseNumber}</p>
          <p><strong>Managed by:</strong> ${agencyName}</p>
        </div>

        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Housing Details</h3>
          <p><strong>Type:</strong> ${housing.housing_type?.replace("_", " ")}</p>
          <p><strong>Address:</strong> ${housing.housing_address}</p>
          <p><strong>Move-in Date:</strong> ${new Date(housing.lease_start_date!).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <p><strong>Monthly Rent:</strong> ${housing.monthly_rent_mad} MAD</p>
          ${housing.agency_fee_amount ? `<p><strong>Agency Fee:</strong> ${housing.agency_fee_amount} MAD</p>` : ""}
        </div>

        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Travel Details</h3>
          <p><strong>Arrival Date:</strong> ${new Date(housing.arrival_date!).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <p><strong>Flight Number:</strong> ${housing.flight_number}</p>
          ${housing.airport_pickup_required ? `<p><strong>Airport Pickup:</strong> Arranged</p>` : ""}
        </div>

        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Utilities - All Connected!</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Water: <span class="highlight">Connected</span></li>
            <li>Electricity: <span class="highlight">Connected</span></li>
            <li>Internet: <span class="highlight">Connected</span></li>
          </ul>
        </div>

        <div class="next-step-box">
          <h2 style="margin-top: 0; color: #1e40af;">Next Step: Choose Your Integration Agency</h2>
          <p>Now that your housing is ready, it's time to select an integration agency to help you settle in!</p>
          <p><strong>Integration services include:</strong></p>
          <ul style="margin: 15px 0; padding-left: 20px;">
            <li>Healthcare registration</li>
            <li>Bank account setup</li>
            <li>Tax ID registration</li>
            <li>Telecom (mobile & internet)</li>
            <li>Local transportation assistance</li>
            <li>Cultural integration programs</li>
          </ul>
          <div style="text-align: center; margin-top: 25px;">
            <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button-primary">Choose Integration Agency</a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button-secondary">View Full Case Details</a>
        </div>
      </div>
      <div class="footer">
        <p>Safe travels and welcome to your new home!</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
</html>
  `;

  await sendEmail({
    to: candidateEmail,
    subject: `Your Housing is Ready - Choose Integration Agency - ${caseNumber}`,
    html: emailHtml,
  });
};

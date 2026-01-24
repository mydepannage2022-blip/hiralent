import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

/**
 * PUT /api/v1/agency/cases/:caseId/housing
 * Update housing details for a relocation case
 */
export const updateHousingDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify user's agency
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true, agency: { select: { type: true } } },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Verify this is a RELOCATION agency
    if (user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Only relocation agencies can update housing details",
      });
    }

    // CHANGED: Verify case is assigned to this housing agency
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        housing_agency_id: user.agency_id,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const {
      housing_type,
      housing_address,
      monthly_rent_mad,
      agency_fee_amount,
      lease_start_date,
      lease_end_date,
      housing_contract_url,
      housing_notes,
    } = req.body;

    // CHANGED: Update or create HousingArrangement
    const housingData = {
      housing_type: housing_type || undefined,
      housing_address: housing_address || undefined,
      monthly_rent_mad: monthly_rent_mad
        ? parseFloat(monthly_rent_mad)
        : undefined,
      agency_fee_amount: agency_fee_amount
        ? parseFloat(agency_fee_amount)
        : undefined,
      lease_start_date: lease_start_date
        ? new Date(lease_start_date)
        : undefined,
      lease_end_date: lease_end_date ? new Date(lease_end_date) : undefined,
      housing_contract_url: housing_contract_url || undefined,
    };

    // Check if housing arrangement exists
    const existingHousing = await prisma.housingArrangement.findUnique({
      where: { case_id: caseId },
    });

    let updatedHousing;
    if (existingHousing) {
      // Update existing
      updatedHousing = await prisma.housingArrangement.update({
        where: { case_id: caseId },
        data: housingData,
      });
    } else {
      // Create new
      updatedHousing = await prisma.housingArrangement.create({
        data: {
          case_id: caseId,
          ...housingData,
        },
      });
    }

    // Update case status if not already in progress
    if (caseData.status === "housing_assigned") {
      await prisma.relocationCase.update({
        where: { case_id: caseId },
        data: {
          status: "housing_in_progress",
          updated_at: new Date(),
        },
      });
    }

    // Return updated case with housing details
    const updatedCase = await prisma.relocationCase.findUnique({
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

    return res.status(200).json({
      success: true,
      message: "Housing details updated successfully",
      data: updatedCase,
    });
  } catch (error) {
    console.error("Update housing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update housing details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/utilities
 * Update utility setup status
 */
export const updateUtilityStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true, agency: { select: { type: true } } },
    });

    if (!user?.agency_id || user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update utilities",
      });
    }

    // CHANGED: Verify case assignment via housing_agency_id
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        housing_agency_id: user.agency_id,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const { utility_water, utility_electricity, utility_internet } = req.body;

    // CHANGED: Update utilities in HousingArrangement table
    const updatedHousing = await prisma.housingArrangement.upsert({
      where: { case_id: caseId },
      update: {
        utility_water: utility_water || undefined,
        utility_electricity: utility_electricity || undefined,
        utility_internet: utility_internet || undefined,
      },
      create: {
        case_id: caseId,
        utility_water: utility_water || "pending",
        utility_electricity: utility_electricity || "pending",
        utility_internet: utility_internet || "pending",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Utility status updated successfully",
      data: updatedHousing,
    });
  } catch (error) {
    console.error("Update utility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update utility status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/arrival
 * Update travel and arrival details
 */
export const updateArrivalDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true, agency: { select: { type: true } } },
    });

    if (!user?.agency_id || user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update arrival details",
      });
    }

    // CHANGED: Verify case assignment via housing_agency_id
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        housing_agency_id: user.agency_id,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const {
      arrival_date,
      flight_number,
      airport_pickup_required,
      arrival_notes,
    } = req.body;

    // CHANGED: Update arrival details in HousingArrangement table
    const updatedHousing = await prisma.housingArrangement.upsert({
      where: { case_id: caseId },
      update: {
        arrival_date: arrival_date ? new Date(arrival_date) : undefined,
        flight_number: flight_number || undefined,
        airport_pickup_required:
          airport_pickup_required !== undefined
            ? airport_pickup_required
            : undefined,
        arrival_notes: arrival_notes || undefined,
      },
      create: {
        case_id: caseId,
        arrival_date: arrival_date ? new Date(arrival_date) : null,
        flight_number: flight_number || null,
        airport_pickup_required: airport_pickup_required || false,
        arrival_notes: arrival_notes || null,
      },
    });
    return res.status(200).json({
      success: true,
      message: "Arrival details updated successfully",
      data: updatedHousing,
    });
  } catch (error) {
    console.error("Update arrival error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update arrival details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/ready-for-arrival
 * Mark case as ready for candidate arrival
 */
export const markReadyForArrival = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId } = req.params;

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
        agency: { select: { type: true, name: true } },
      },
    });

    if (!user?.agency_id || user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Only relocation agencies can mark cases as ready",
      });
    }

    // CHANGED: Verify case assignment via housing_agency_id
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        housing_agency_id: user.agency_id,
      },
      include: {
        candidate: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
          },
        },
        housing_details: true, // Include HousingArrangement
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const housing = caseData.housing_details;

    // CHANGED: Validate from HousingArrangement table
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

    if (!isComplete) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark as ready - incomplete information",
        missing: {
          housing_type: !housing?.housing_type,
          housing_address: !housing?.housing_address,
          monthly_rent: !housing?.monthly_rent_mad,
          lease_start: !housing?.lease_start_date,
          water: housing?.utility_water !== "completed",
          electricity: housing?.utility_electricity !== "completed",
          internet: housing?.utility_internet !== "completed",
          arrival_date: !housing?.arrival_date,
          flight_number: !housing?.flight_number,
        },
      });
    }
    // Update case status
    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        status: "ready_for_arrival",
        updated_at: new Date(),
      },
    });

    // Send email to candidate
    const readyForArrivalEmailHtml = `
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
      .checklist { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .button-primary { display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: bold; }
      .button-secondary { display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      .highlight { color: #059669; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎉 Your Housing is Ready!</h1>
        <p style="font-size: 18px; margin-top: 10px;">Welcome to ${
          caseData.destination_country
        }, ${caseData.candidate.full_name}!</p>
      </div>
      <div class="content">
        <div class="success-box">
          <h2 style="margin-top: 0; color: #059669;">Everything is Prepared for Your Arrival</h2>
          <p>Great news! Your housing and relocation preparations are complete. You're all set to start your new journey!</p>
          <p><strong>Case Number:</strong> ${caseData.case_number}</p>
          <p><strong>Managed by:</strong> ${user.agency.name}</p>
        </div>

        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Housing Details</h3>
          <p><strong>Type:</strong> ${housing!.housing_type?.replace(
            "_",
            " "
          )}</p>
          <p><strong>Address:</strong> ${housing!.housing_address}</p>
          <p><strong>Move-in Date:</strong> ${new Date(
            housing!.lease_start_date!
          ).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
          <p><strong>Monthly Rent:</strong> ${housing!.monthly_rent_mad} MAD</p>
          ${
            housing!.agency_fee_amount
              ? `<p><strong>Agency Fee:</strong> ${
                  housing!.agency_fee_amount
                } MAD</p>`
              : ""
          }
        </div>

        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Travel Details</h3>
          <p><strong>Arrival Date:</strong> ${new Date(
            housing!.arrival_date!
          ).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
          <p><strong>Flight Number:</strong> ${housing!.flight_number}</p>
          ${
            housing!.airport_pickup_required
              ? `<p><strong>Airport Pickup:</strong> Arranged</p>`
              : ""
          }
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
            <a href="${
              process.env.FRONTEND_URL
            }/candidate/dashboard/cases/${caseId}" class="button-primary">
              Choose Integration Agency
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/candidate/dashboard/cases/${
      caseData.case_id
    }" class="button-secondary">
            View Full Case Details
          </a>
        </div>
      </div>
      <div class="footer">
        <p>🎉 Safe travels and welcome to your new home!</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
</html>
    `;

    await sendEmail({
      to: caseData.candidate.email,
      subject: `🎉 Your Housing is Ready - Choose Integration Agency - ${caseData.case_number}`,
      html: readyForArrivalEmailHtml,
    });

    return res.status(200).json({
      success: true,
      message: "Case marked as ready for arrival",
      data: updatedCase,
    });
  } catch (error) {
    console.error("Mark ready error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark case as ready",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

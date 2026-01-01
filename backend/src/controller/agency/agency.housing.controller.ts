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

    // Verify case exists and is assigned to this agency
    const assignment = await prisma.caseAssignment.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
        status: "active",
      },
    });

    if (!assignment) {
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

    // Update housing details
    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
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
        notes: housing_notes || undefined,
        updated_at: new Date(),
      },
      include: {
        candidate: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
          },
        },
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

    // Verify case assignment
    const assignment = await prisma.caseAssignment.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
        status: "active",
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const { utility_water, utility_electricity, utility_internet } = req.body;

    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        utility_water: utility_water || undefined,
        utility_electricity: utility_electricity || undefined,
        utility_internet: utility_internet || undefined,
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Utility status updated successfully",
      data: updatedCase,
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

    const assignment = await prisma.caseAssignment.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
        status: "active",
      },
    });

    if (!assignment) {
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

    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        arrival_date: arrival_date ? new Date(arrival_date) : undefined,
        flight_number: flight_number || undefined,
        airport_pickup_required:
          airport_pickup_required !== undefined
            ? airport_pickup_required
            : undefined,
        arrival_notes: arrival_notes || undefined,
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Arrival details updated successfully",
      data: updatedCase,
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

    // Verify case assignment
    const assignment = await prisma.caseAssignment.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
        status: "active",
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    // Fetch full case details
    const caseData = await prisma.relocationCase.findUnique({
      where: { case_id: caseId },
      include: {
        candidate: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
          },
        },
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Validate all requirements are met
    const isComplete = !!(
      caseData.housing_type &&
      caseData.housing_address &&
      caseData.monthly_rent_mad &&
      caseData.lease_start_date &&
      caseData.utility_water === "completed" &&
      caseData.utility_electricity === "completed" &&
      caseData.utility_internet === "completed" &&
      caseData.arrival_date &&
      caseData.flight_number
    );

    if (!isComplete) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark as ready - incomplete information",
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
      .checklist { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .button { display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
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
          <p><strong>Type:</strong> ${caseData.housing_type?.replace(
            "_",
            " "
          )}</p>
          <p><strong>Address:</strong> ${caseData.housing_address}</p>
          <p><strong>Move-in Date:</strong> ${new Date(
            caseData.lease_start_date!
          ).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
          <p><strong>Monthly Rent:</strong> ${caseData.monthly_rent_mad} MAD</p>
          ${
            caseData.agency_fee_amount
              ? `<p><strong>Agency Fee:</strong> ${caseData.agency_fee_amount} MAD</p>`
              : ""
          }
          ${
            caseData.lease_end_date
              ? `<p><strong>Lease End Date:</strong> ${new Date(
                  caseData.lease_end_date
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</p>`
              : ""
          }
        </div>

        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Travel Details</h3>
          <p><strong>Arrival Date:</strong> ${new Date(
            caseData.arrival_date!
          ).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
          <p><strong>Flight Number:</strong> ${caseData.flight_number}</p>
          ${
            caseData.airport_pickup_required
              ? `<p><strong>Airport Pickup:</strong> Arranged - We'll meet you at the airport!</p>`
              : `<p><strong>Airport Pickup:</strong> Not required</p>`
          }
          ${
            caseData.arrival_notes
              ? `<p><strong>Notes:</strong> ${caseData.arrival_notes}</p>`
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
          <p style="color: #059669; font-weight: bold; margin-top: 15px;">Everything is ready for you to move in!</p>
        </div>

        <div class="checklist">
          <h3 style="margin-top: 0; color: #1e40af;">What to Bring on Arrival</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Valid passport and visa documents</li>
            <li>Lease contract (we'll provide a copy)</li>
            <li>Initial rent payment (if not already paid)</li>
            <li>Personal identification documents</li>
            <li>Emergency contact information</li>
          </ul>
        </div>

        ${
          caseData.notes
            ? `
        <div class="info-section">
          <h3 style="margin-top: 0; color: #3b82f6;">Additional Notes</h3>
          <p>${caseData.notes}</p>
        </div>
        `
            : ""
        }

        <p style="margin-top: 30px;">
          <strong>Next Steps:</strong> Your relocation agency will contact you shortly with final move-in instructions and any remaining details.
        </p>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${process.env.FRONTEND_URL}/candidate/dashboard/cases/${
      caseData.case_id
    }" class="button">
            View Full Case Details
          </a>
        </div>
      </div>
      <div class="footer">
        <p>🎉 Congratulations on your new home! Safe travels!</p>
        <p>This is an automated message. Please do not reply to this email.</p>
        <p style="margin-top: 10px; font-size: 12px;">
          If you have any questions, please contact ${
            user.agency.name
          } directly.
        </p>
      </div>
    </div>
  </body>
</html>
    `;

    await sendEmail({
      to: caseData.candidate.email,
      subject: `🎉 Your Housing is Ready - ${caseData.case_number}`,
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

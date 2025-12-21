import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

/**
 * GET /api/v1/candidate/agencies/browse
 * Browse available approved agencies
 * Query params: type (RELOCATION), country (optional)
 */
export const browseAgenciesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { type, country } = req.query;

    // Validate type parameter
    if (!type || !["RELOCATION", "INTEGRATION"].includes(type as string)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or missing agency type. Must be RELOCATION or INTEGRATION",
      });
    }

    // Build query filters
    const whereClause: any = {
      type: type as string,
      status: "APPROVED", // Only show approved agencies
    };

    // Optional: Filter by country if provided
    if (country) {
      whereClause.operating_countries = {
        has: country as string,
      };
    }

    // Fetch agencies from database
    const agencies = await prisma.agency.findMany({
      where: whereClause,
      select: {
        agency_id: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        website: true,
        operating_countries: true,
        created_at: true,
        // Optional fields (add if they exist in your schema)
        // rating: true,
        // total_cases: true,
        // success_rate: true,
        // logo_url: true,
        // services: true,
      },
      orderBy: {
        created_at: "desc", // Most recent first (change to rating when available)
      },
    });

    // Return agencies
    return res.status(200).json({
      success: true,
      message: `Found ${agencies.length} ${type} agencies`,
      data: agencies,
    });
  } catch (error) {
    console.error("Browse agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agencies",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/v1/candidate/cases/:caseId/assign-agency
 * Candidate selects and assigns an agency to their case
 * Body: { agencyId: string }
 */
export const assignAgencyToCase = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId } = req.params;
    const { agencyId } = req.body;

    // Validate request body
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: "Agency ID is required",
      });
    }

    // 1. Verify case exists and belongs to logged-in candidate
    const caseData = await prisma.relocationCase.findUnique({
      where: { case_id: caseId },
      include: {
        embassy_submission: true,
        candidate: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
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

    if (caseData.candidate_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to modify this case",
      });
    }

    // 2. Verify visa is approved before allowing housing assignment
    if (
      !caseData.embassy_submission ||
      caseData.embassy_submission.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign housing agency. Visa must be approved first.",
      });
    }

    // 3. Check if housing agency already assigned
    const existingAssignment = await prisma.caseAssignment.findFirst({
      where: {
        case_id: caseId,
        status: "active",
      },
      include: {
        agency: {
          select: {
            agency_id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: `Housing agency already assigned: ${existingAssignment.agency.name}`,
        data: existingAssignment,
      });
    }

    // 4. Verify agency exists and is approved RELOCATION agency
    const agency = await prisma.agency.findUnique({
      where: { agency_id: agencyId },
      select: {
        agency_id: true,
        name: true,
        email: true,
        type: true,
        status: true,
        operating_countries: true,
      },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.type !== "RELOCATION") {
      return res.status(400).json({
        success: false,
        message: "Selected agency is not a relocation/housing agency",
      });
    }

    if (agency.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Selected agency is not approved",
      });
    }

    // 5. Optional: Verify agency operates in destination country
    if (agency.operating_countries && agency.operating_countries.length > 0) {
      if (!agency.operating_countries.includes(caseData.destination_country)) {
        return res.status(400).json({
          success: false,
          message: `Selected agency does not operate in ${caseData.destination_country}`,
          suggestion:
            "Please choose an agency that operates in your destination country",
        });
      }
    }

    // 6. Create case assignment
    const assignment = await prisma.caseAssignment.create({
      data: {
        case_id: caseId,
        agency_id: agencyId,
        agent_id: userId, // Temporarily use candidate's user_id (agency will reassign to their agent)
        assigned_at: new Date(),
        status: "active",
        notes: "Housing agency selected by candidate",
      },
      include: {
        agency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          },
        },
      },
    });

    // 7. Update case status and service_type to housing
    await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        status: "housing_assigned",
        service_type: "housing",
        updated_at: new Date(),
      },
    });

    // 8. Send notification to agency
    try {
      const agencyEmailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button { display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Case Assigned to You</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${agency.name}</strong> team,</p>
            <p>You have been assigned a new relocation case by a candidate whose visa was recently approved!</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #1e40af;">Case Details</h3>
              <p><strong>Case Number:</strong> ${caseData.case_number}</p>
              <p><strong>Candidate:</strong> ${caseData.candidate.full_name}</p>
              <p><strong>Route:</strong> ${caseData.origin_country} → ${
        caseData.destination_country
      }</p>
              ${
                caseData.destination_city
                  ? `<p><strong>City:</strong> ${caseData.destination_city}</p>`
                  : ""
              }
              <p><strong>Visa Status:</strong>Approved</p>
              <p><strong>Service Type:</strong> ${caseData.service_type.replace(
                "_",
                " "
              )}</p>
            </div>

            <h3>What You Need to Do:</h3>
            <ol style="margin: 15px 0; padding-left: 20px;">
              <li>Log in to your agency dashboard</li>
              <li>Review the complete case details</li>
              <li>Contact the candidate to discuss housing needs</li>
              <li>Begin searching for suitable accommodation</li>
            </ol>

            <p style="margin-top: 20px;"><strong>The candidate is waiting to hear from you!</strong></p>

            <div style="text-align: center;">
              <a href="${
                process.env.FRONTEND_URL
              }/agency/dashboard/cases/${caseId}" class="button">
                View Case in Dashboard
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Hiralent.</p>
          </div>
        </div>
      </body>
    </html>
  `;

      await sendEmail({
        to: agency.email || "",
        subject: `New Case Assigned - ${caseData.case_number}`,
        html: agencyEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send agency notification email:", emailError);
      // Don't fail the whole request if email fails
    }

    // 9. Send confirmation email to candidate
    try {
      const candidateEmailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .agency-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button { display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Housing Agency Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${caseData.candidate.full_name}</strong>,</p>
            
            <div class="success-box">
              <h3 style="margin-top: 0; color: #059669;">Great news! Your housing agency has been confirmed.</h3>
              <p>You've successfully selected your relocation partner for finding accommodation in ${
                caseData.destination_country
              }.</p>
            </div>

            <div class="agency-box">
              <h3 style="margin-top: 0; color: #1e40af;">Your Selected Agency</h3>
              <p><strong>Name:</strong> ${agency.name}</p>
              ${
                agency.email
                  ? `<p><strong>Email:</strong> ${agency.email}</p>`
                  : ""
              }
            </div>

            <h3>What Happens Next:</h3>
            <ol style="margin: 15px 0; padding-left: 20px;">
              <li><strong>Agency Review:</strong> The agency has been notified and will review your case</li>
              <li><strong>Initial Contact:</strong> They will reach out to you within 2-3 business days</li>
              <li><strong>Discuss Needs:</strong> You'll discuss your housing preferences and budget</li>
              <li><strong>Property Search:</strong> They'll search for suitable accommodation options</li>
              <li><strong>Selection:</strong> You'll review options and make your final selection</li>
            </ol>

            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <strong>⏰ Timeline:</strong> Expect initial contact within 2-3 business days. The full housing search typically takes 1-2 weeks.
            </p>

            <div style="text-align: center;">
              <a href="${
                process.env.FRONTEND_URL
              }/candidate/dashboard/cases/${caseId}" class="button">
                View Case Details
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Need to change your agency? Visit your case dashboard.</p>
            <p>This is an automated confirmation from Hiralent.</p>
          </div>
        </div>
      </body>
    </html>
  `;

      await sendEmail({
        to: caseData.candidate.email,
        subject: `Housing Agency Confirmed - ${agency.name}`,
        html: candidateEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send candidate confirmation email:", emailError);
      // Don't fail the whole request if email fails
    }

    // Success response
    return res.status(201).json({
      success: true,
      message: `Housing agency assigned successfully: ${agency.name}`,
      data: {
        assignment_id: assignment.assignment_id,
        case_id: caseId,
        agency: assignment.agency,
        assigned_at: assignment.assigned_at,
        status: assignment.status,
      },
    });
  } catch (error) {
    console.error("Assign agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign agency",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

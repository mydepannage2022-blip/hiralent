import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

// ==================== SUBMIT CASE TO EMBASSY ====================
export const submitToEmbassy = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id: caseId } = req.params;
    const {
      embassy_name,
      embassy_location,
      submission_date,
      tracking_number,
      expected_response,
      receipt_url,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Verify case belongs to agency and all documents are approved
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
      },
      include: {
        documents: {
          where: {
            is_active: true,
          },
        },
        candidate: {
          select: {
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

    // Check if all active documents are approved
    const allApproved = caseData.documents.every(
      (doc) => doc.status === "approved"
    );

    if (!allApproved) {
      return res.status(400).json({
        success: false,
        message: "All documents must be approved before embassy submission",
      });
    }

    // Check if already submitted
    const existingSubmission = await prisma.embassySubmission.findUnique({
      where: { case_id: caseId },
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: "Case already submitted to embassy",
      });
    }

    // Create embassy submission
    const submission = await prisma.embassySubmission.create({
      data: {
        case_id: caseId,
        embassy_name,
        embassy_location,
        submission_date: new Date(submission_date),
        tracking_number: tracking_number || null,
        expected_response: expected_response
          ? new Date(expected_response)
          : null,
        receipt_url: receipt_url || null,
        status: "submitted",
      },
    });

    // Update case status
    await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: { status: "submitted_to_embassy" },
    });

    // Send email to candidate
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏛️ Embassy Submission Confirmed</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${caseData.candidate.full_name}</strong>,</p>
              <p>Great news! Your case <strong>${
                caseData.case_number
              }</strong> has been successfully submitted to the embassy.</p>
             
              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">Submission Details</h3>
                <p><strong>Embassy:</strong> ${embassy_name}</p>
                <p><strong>Location:</strong> ${embassy_location}</p>
                <p><strong>Submission Date:</strong> ${new Date(
                  submission_date
                ).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}</p>
                ${
                  tracking_number
                    ? `<p><strong>Tracking Number:</strong> ${tracking_number}</p>`
                    : ""
                }
                ${
                  expected_response
                    ? `<p><strong>Expected Response:</strong> ${new Date(
                        expected_response
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}</p>`
                    : ""
                }
              </div>


              <h3>What Happens Next?</h3>
              <ul>
                <li>The embassy will review your application</li>
                <li>You may be contacted for an interview</li>
                <li>We'll keep you updated on the progress</li>
                <li>Check your case dashboard for status updates</li>
              </ul>


              <a href="${
                process.env.FRONTEND_URL
              }/candidate/dashboard/cases/${caseId}" class="button">
                View Case Details
              </a>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: caseData.candidate.email,
      subject: `Embassy Submission Confirmed - Case ${caseData.case_number}`,
      html: emailHtml,
    });

    return res.status(201).json({
      success: true,
      message: "Case submitted to embassy successfully",
      data: submission,
    });
  } catch (error) {
    console.error("Submit to embassy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit to embassy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==================== UPDATE EMBASSY STATUS ====================
export const updateEmbassyStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id: caseId } = req.params;
    const { status, decision_date, decision_notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Verify case belongs to agency
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
      },
      include: {
        embassy_submission: true,
        candidate: {
          select: {
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

    if (!caseData.embassy_submission) {
      return res.status(400).json({
        success: false,
        message: "Case not submitted to embassy yet",
      });
    }

    // Validate status
    const validStatuses = [
      "submitted",
      "under_review",
      "interview_scheduled",
      "approved",
      "rejected",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Update embassy submission
    const updatedSubmission = await prisma.embassySubmission.update({
      where: { case_id: caseId },
      data: {
        status,
        decision_date: decision_date ? new Date(decision_date) : null,
        decision_notes: decision_notes || null,
      },
    });

    // Update case status based on embassy status
    let newCaseStatus = caseData.status;
    if (status === "under_review") {
      newCaseStatus = "embassy_under_review";
    } else if (status === "interview_scheduled") {
      newCaseStatus = "interview_scheduled";
    } else if (status === "approved") {
      newCaseStatus = "embassy_approved";
    } else if (status === "rejected") {
      newCaseStatus = "embassy_rejected";
    }

    await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: { status: newCaseStatus },
    });

    // Send email to candidate based on status
    if (status === "approved") {
      // SPECIAL EMAIL FOR VISA APPROVAL - Includes housing agency CTA
      const approvedEmailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .next-step-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button-primary { display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: bold; }
          .button-secondary { display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Visa Approved!</h1>
            <p style="font-size: 18px; margin-top: 10px;">Congratulations ${
              caseData.candidate.full_name
            }!</p>
          </div>
          <div class="content">
            <div class="success-box">
              <h2 style="margin-top: 0; color: #059669;">Your Visa Has Been Approved</h2>
              <p>Great news! The embassy has approved your visa application for <strong>${
                caseData.destination_country
              }</strong>.</p>
              <p><strong>Case Number:</strong> ${caseData.case_number}</p>
              <p><strong>Embassy:</strong> ${
                caseData.embassy_submission.embassy_name
              }</p>
              ${
                decision_notes
                  ? `<p><strong>Notes:</strong> ${decision_notes}</p>`
                  : ""
              }
            </div>

            <div class="next-step-box">
              <h2 style="margin-top: 0; color: #1e40af;">Next Step: Choose Your Housing Agency</h2>
              <p>Now that your visa is approved, it's time to find accommodation in ${
                caseData.destination_country
              }!</p>
              
              <p><strong>What happens next:</strong></p>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Browse approved housing agencies in ${
                  caseData.destination_country
                }</li>
                <li>Select an agency that fits your needs</li>
                <li>They will help you find accommodation</li>
                <li>Get settled before your arrival</li>
              </ul>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${
                  process.env.FRONTEND_URL
                }/candidate/dashboard/cases/${caseId}" class="button-primary">
                  Choose Housing Agency
                </a>
              </div>
            </div>

            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              <strong>Important:</strong> You need to select a housing agency to continue your relocation process. 
              Visit your case dashboard to browse available agencies.
            </p>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${
                process.env.FRONTEND_URL
              }/candidate/dashboard/cases/${caseId}" class="button-secondary">
                View Full Case Details
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Congratulations on your approved visa! 🎉</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

      await sendEmail({
        to: caseData.candidate.email,
        subject: `🎉 Visa Approved - Choose Your Housing Agency - Case ${caseData.case_number}`,
        html: approvedEmailHtml,
      });
    } else {
      // FOR OTHER STATUSES: Keep existing email
      const statusMessages: {
        [key: string]: { title: string; message: string; color: string };
      } = {
        under_review: {
          title: "Embassy is Reviewing Your Application",
          message:
            "Your application is currently under review by the embassy. We'll notify you of any updates.",
          color: "#3b82f6",
        },
        interview_scheduled: {
          title: "Interview Scheduled",
          message:
            "The embassy has scheduled an interview. Check your case details for more information.",
          color: "#f59e0b",
        },
        rejected: {
          title: "Embassy Decision",
          message:
            "Unfortunately, your application was not approved. Please contact your agency for next steps.",
          color: "#ef4444",
        },
      };

      const statusInfo = statusMessages[status] || statusMessages.under_review;

      const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${
            statusInfo.color
          }; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${
            statusInfo.color
          }; }
          .button { display: inline-block; padding: 12px 30px; background: ${
            statusInfo.color
          }; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.title}</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${caseData.candidate.full_name}</strong>,</p>
            <p>${statusInfo.message}</p>
           
            <div class="info-box">
              <h3 style="margin-top: 0; color: ${
                statusInfo.color
              };">Case Update</h3>
              <p><strong>Case Number:</strong> ${caseData.case_number}</p>
              <p><strong>Embassy:</strong> ${
                caseData.embassy_submission.embassy_name
              }</p>
              <p><strong>Status:</strong> ${status
                .replace("_", " ")
                .toUpperCase()}</p>
              ${
                decision_notes
                  ? `<p><strong>Notes:</strong> ${decision_notes}</p>`
                  : ""
              }
            </div>

            <a href="${
              process.env.FRONTEND_URL
            }/candidate/dashboard/cases/${caseId}" class="button">
              View Case Details
            </a>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

      await sendEmail({
        to: caseData.candidate.email,
        subject: `Embassy Status Update - Case ${caseData.case_number}`,
        html: emailHtml,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Embassy status updated successfully",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Update embassy status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update embassy status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==================== SCHEDULE INTERVIEW ====================
export const scheduleInterview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id: caseId } = req.params;
    const { interview_date, interview_location, interview_notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Verify case belongs to agency
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
      },
      include: {
        embassy_submission: true,
        candidate: {
          select: {
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

    if (!caseData.embassy_submission) {
      return res.status(400).json({
        success: false,
        message: "Case not submitted to embassy yet",
      });
    }

    // Update embassy submission with interview details
    const updatedSubmission = await prisma.embassySubmission.update({
      where: { case_id: caseId },
      data: {
        interview_date: new Date(interview_date),
        interview_location,
        interview_notes: interview_notes || null,
        status: "interview_scheduled",
      },
    });

    // Update case status
    await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: { status: "interview_scheduled" },
    });

    // Send email to candidate
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .warning-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Embassy Interview Scheduled</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${caseData.candidate.full_name}</strong>,</p>
              <p>Your embassy interview has been scheduled. Please review the details below and prepare accordingly.</p>
             
              <div class="info-box">
                <h3 style="margin-top: 0; color: #f59e0b;">Interview Details</h3>
                <p><strong>Date & Time:</strong> ${new Date(
                  interview_date
                ).toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</p>
                <p><strong>Location:</strong> ${interview_location}</p>
                <p><strong>Case Number:</strong> ${caseData.case_number}</p>
                <p><strong>Embassy:</strong> ${
                  caseData.embassy_submission.embassy_name
                }</p>
                ${
                  interview_notes
                    ? `<p><strong>Additional Notes:</strong> ${interview_notes}</p>`
                    : ""
                }
              </div>


              <div class="warning-box">
                <h4 style="margin-top: 0;">⚠️ Important Reminders</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Arrive at least 30 minutes early</li>
                  <li>Bring your passport and all original documents</li>
                  <li>Bring printed copies of all submitted documents</li>
                  <li>Dress formally and professionally</li>
                  <li>Mobile phones may not be allowed inside</li>
                </ul>
              </div>


              <h3>What to Bring:</h3>
              <ul>
                <li>Valid passport</li>
                <li>Interview appointment confirmation</li>
                <li>All original supporting documents</li>
                <li>Passport-sized photos (if required)</li>
                <li>Application fee receipt</li>
              </ul>


              <a href="${
                process.env.FRONTEND_URL
              }/candidate/dashboard/cases/${caseId}" class="button">
                View Case Details
              </a>
            </div>
            <div class="footer">
              <p>Good luck with your interview! This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: caseData.candidate.email,
      subject: `Embassy Interview Scheduled - Case ${caseData.case_number}`,
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      message: "Interview scheduled successfully",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Schedule interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to schedule interview",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==================== GET EMBASSY SUBMISSION ====================
export const getEmbassySubmission = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id: caseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Verify case belongs to agency
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        agency_id: user.agency_id,
      },
      include: {
        embassy_submission: true,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    if (!caseData.embassy_submission) {
      return res.status(404).json({
        success: false,
        message: "No embassy submission found for this case",
      });
    }

    return res.status(200).json({
      success: true,
      data: caseData.embassy_submission,
    });
  } catch (error) {
    console.error("Get embassy submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get embassy submission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

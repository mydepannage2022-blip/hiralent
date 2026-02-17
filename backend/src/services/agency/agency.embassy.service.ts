import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

export const getAgencyIdForUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { agency_id: true },
  });
  return user?.agency_id ?? null;
};

export const getCaseForEmbassySubmission = async (
  caseId: string,
  agencyId: string
) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      agency_id: agencyId,
    },
    include: {
      documents: {
        where: { is_active: true },
      },
      candidate: {
        select: {
          email: true,
          full_name: true,
        },
      },
    },
  });
};

export const getExistingEmbassySubmission = async (caseId: string) => {
  return prisma.embassySubmission.findUnique({
    where: { case_id: caseId },
  });
};

export const createEmbassySubmission = async (
  caseId: string,
  data: {
    embassy_name: string;
    embassy_location: string;
    submission_date: string;
    tracking_number?: string;
    expected_response?: string;
    receipt_url?: string;
  }
) => {
  return prisma.embassySubmission.create({
    data: {
      case_id: caseId,
      embassy_name: data.embassy_name,
      embassy_location: data.embassy_location,
      submission_date: new Date(data.submission_date),
      tracking_number: data.tracking_number || null,
      expected_response: data.expected_response
        ? new Date(data.expected_response)
        : null,
      receipt_url: data.receipt_url || null,
      status: "submitted",
    },
  });
};

export const updateCaseStatus = async (caseId: string, status: string) => {
  return prisma.relocationCase.update({
    where: { case_id: caseId },
    data: { status },
  });
};

export const getCaseWithEmbassySubmission = async (
  caseId: string,
  agencyId: string
) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      agency_id: agencyId,
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
};

export const updateEmbassySubmission = async (
  caseId: string,
  data: {
    status: string;
    decision_date?: string;
    decision_notes?: string;
  }
) => {
  return prisma.embassySubmission.update({
    where: { case_id: caseId },
    data: {
      status: data.status,
      decision_date: data.decision_date ? new Date(data.decision_date) : null,
      decision_notes: data.decision_notes || null,
    },
  });
};

export const mapEmbassyStatusToCaseStatus = (
  embassyStatus: string,
  currentCaseStatus: string
): string => {
  if (embassyStatus === "under_review") return "embassy_under_review";
  if (embassyStatus === "interview_scheduled") return "interview_scheduled";
  if (embassyStatus === "approved") return "embassy_approved";
  if (embassyStatus === "rejected") return "embassy_rejected";
  return currentCaseStatus;
};

export const scheduleEmbassyInterview = async (
  caseId: string,
  data: {
    interview_date: string;
    interview_location: string;
    interview_notes?: string;
  }
) => {
  return prisma.embassySubmission.update({
    where: { case_id: caseId },
    data: {
      interview_date: new Date(data.interview_date),
      interview_location: data.interview_location,
      interview_notes: data.interview_notes || null,
      status: "interview_scheduled",
    },
  });
};

export const getCaseEmbassySubmission = async (
  caseId: string,
  agencyId: string
) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      agency_id: agencyId,
    },
    include: {
      embassy_submission: true,
    },
  });
};

// ==================== EMAIL FUNCTIONS ====================

export const sendSubmissionConfirmationEmail = async (params: {
  candidateEmail: string;
  candidateName: string;
  caseNumber: string;
  caseId: string;
  embassy_name: string;
  embassy_location: string;
  submission_date: string;
  tracking_number?: string;
  expected_response?: string;
}) => {
  const {
    candidateEmail,
    candidateName,
    caseNumber,
    caseId,
    embassy_name,
    embassy_location,
    submission_date,
    tracking_number,
    expected_response,
  } = params;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

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
            <h1>Embassy Submission Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${candidateName}</strong>,</p>
            <p>Great news! Your case <strong>${caseNumber}</strong> has been successfully submitted to the embassy.</p>
            <div class="info-box">
              <h3 style="margin-top: 0; color: #667eea;">Submission Details</h3>
              <p><strong>Embassy:</strong> ${embassy_name}</p>
              <p><strong>Location:</strong> ${embassy_location}</p>
              <p><strong>Submission Date:</strong> ${new Date(submission_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              ${tracking_number ? `<p><strong>Tracking Number:</strong> ${tracking_number}</p>` : ""}
              ${expected_response ? `<p><strong>Expected Response:</strong> ${new Date(expected_response).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>` : ""}
            </div>
            <h3>What Happens Next?</h3>
            <ul>
              <li>The embassy will review your application</li>
              <li>You may be contacted for an interview</li>
              <li>We'll keep you updated on the progress</li>
              <li>Check your case dashboard for status updates</li>
            </ul>
            <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button">View Case Details</a>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: candidateEmail,
    subject: `Embassy Submission Confirmed - Case ${caseNumber}`,
    html: emailHtml,
  });
};

export const sendVisaApprovedEmail = async (params: {
  candidateEmail: string;
  candidateName: string;
  caseNumber: string;
  caseId: string;
  destinationCountry: string;
  embassyName: string;
  decisionNotes?: string;
}) => {
  const {
    candidateEmail,
    candidateName,
    caseNumber,
    caseId,
    destinationCountry,
    embassyName,
    decisionNotes,
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
          .next-step-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button-primary { display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: bold; }
          .button-secondary { display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Visa Approved!</h1>
            <p style="font-size: 18px; margin-top: 10px;">Congratulations ${candidateName}!</p>
          </div>
          <div class="content">
            <div class="success-box">
              <h2 style="margin-top: 0; color: #059669;">Your Visa Has Been Approved</h2>
              <p>Great news! The embassy has approved your visa application for <strong>${destinationCountry}</strong>.</p>
              <p><strong>Case Number:</strong> ${caseNumber}</p>
              <p><strong>Embassy:</strong> ${embassyName}</p>
              ${decisionNotes ? `<p><strong>Notes:</strong> ${decisionNotes}</p>` : ""}
            </div>
            <div class="next-step-box">
              <h2 style="margin-top: 0; color: #1e40af;">Next Step: Choose Your Housing Agency</h2>
              <p>Now that your visa is approved, it's time to find accommodation in ${destinationCountry}!</p>
              <p><strong>What happens next:</strong></p>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Browse approved housing agencies in ${destinationCountry}</li>
                <li>Select an agency that fits your needs</li>
                <li>They will help you find accommodation</li>
                <li>Get settled before your arrival</li>
              </ul>
              <div style="text-align: center; margin-top: 25px;">
                <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button-primary">Choose Housing Agency</a>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button-secondary">View Full Case Details</a>
            </div>
          </div>
          <div class="footer">
            <p>Congratulations on your approved visa!</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: candidateEmail,
    subject: `Visa Approved - Choose Your Housing Agency - Case ${caseNumber}`,
    html: emailHtml,
  });
};

export const sendEmbassyStatusUpdateEmail = async (params: {
  candidateEmail: string;
  candidateName: string;
  caseNumber: string;
  caseId: string;
  embassyName: string;
  status: string;
  decisionNotes?: string;
}) => {
  const { candidateEmail, candidateName, caseNumber, caseId, embassyName, status, decisionNotes } = params;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    under_review: {
      title: "Embassy is Reviewing Your Application",
      message: "Your application is currently under review by the embassy. We'll notify you of any updates.",
      color: "#3b82f6",
    },
    interview_scheduled: {
      title: "Interview Scheduled",
      message: "The embassy has scheduled an interview. Check your case details for more information.",
      color: "#f59e0b",
    },
    rejected: {
      title: "Embassy Decision",
      message: "Unfortunately, your application was not approved. Please contact your agency for next steps.",
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
          .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color}; }
          .button { display: inline-block; padding: 12px 30px; background: ${statusInfo.color}; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.title}</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${candidateName}</strong>,</p>
            <p>${statusInfo.message}</p>
            <div class="info-box">
              <h3 style="margin-top: 0; color: ${statusInfo.color};">Case Update</h3>
              <p><strong>Case Number:</strong> ${caseNumber}</p>
              <p><strong>Embassy:</strong> ${embassyName}</p>
              <p><strong>Status:</strong> ${status.replace("_", " ").toUpperCase()}</p>
              ${decisionNotes ? `<p><strong>Notes:</strong> ${decisionNotes}</p>` : ""}
            </div>
            <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button">View Case Details</a>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: candidateEmail,
    subject: `Embassy Status Update - Case ${caseNumber}`,
    html: emailHtml,
  });
};

export const sendInterviewScheduledEmail = async (params: {
  candidateEmail: string;
  candidateName: string;
  caseNumber: string;
  caseId: string;
  embassyName: string;
  interview_date: string;
  interview_location: string;
  interview_notes?: string;
}) => {
  const { candidateEmail, candidateName, caseNumber, caseId, embassyName, interview_date, interview_location, interview_notes } = params;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

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
            <h1>Embassy Interview Scheduled</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${candidateName}</strong>,</p>
            <p>Your embassy interview has been scheduled. Please review the details below and prepare accordingly.</p>
            <div class="info-box">
              <h3 style="margin-top: 0; color: #f59e0b;">Interview Details</h3>
              <p><strong>Date & Time:</strong> ${new Date(interview_date).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              <p><strong>Location:</strong> ${interview_location}</p>
              <p><strong>Case Number:</strong> ${caseNumber}</p>
              <p><strong>Embassy:</strong> ${embassyName}</p>
              ${interview_notes ? `<p><strong>Additional Notes:</strong> ${interview_notes}</p>` : ""}
            </div>
            <div class="warning-box">
              <h4 style="margin-top: 0;">Important Reminders</h4>
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
            <a href="${frontendUrl}/candidate/dashboard/cases/${caseId}" class="button">View Case Details</a>
          </div>
          <div class="footer">
            <p>Good luck with your interview! This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: candidateEmail,
    subject: `Embassy Interview Scheduled - Case ${caseNumber}`,
    html: emailHtml,
  });
};

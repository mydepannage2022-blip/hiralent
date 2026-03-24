import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";
import {
  formatEmailNote,
  renderEmailCallout,
  renderEmailKeyValueTable,
  renderTransactionalEmail,
} from "../emailTemplates.service";

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

  const caseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;
  const submittedOn = new Date(submission_date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const expectedOn = expected_response
    ? new Date(expected_response).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const detailsHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Embassy", value: embassy_name },
    { label: "Location", value: embassy_location },
    { label: "Submission date", value: submittedOn },
    { label: "Tracking number", value: tracking_number || null },
    { label: "Expected response", value: expectedOn },
  ]);

  const nextHtml = `
    <ul style="margin: 0; padding-left: 18px;">
      <li>The embassy will review your application</li>
      <li>You may be contacted for an interview</li>
      <li>We will notify you of any updates</li>
    </ul>`;

  const emailHtml = renderTransactionalEmail({
    title: "Embassy submission confirmed",
    previewText: `Your case ${caseNumber} was submitted to the embassy.`,
    greetingName: candidateName,
    introHtml: "Your case has been successfully submitted to the embassy.",
    sections: [
      { title: "Submission details", html: detailsHtml },
      { title: "What happens next", html: nextHtml },
    ],
    cta: { label: "View case details", href: caseUrl },
    tone: "info",
  });

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

  const caseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;

  const detailsHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Destination", value: destinationCountry },
    { label: "Embassy", value: embassyName },
  ]);

  const notesBlock = decisionNotes
    ? renderEmailCallout({
        tone: "success",
        title: "Notes",
        html: formatEmailNote(decisionNotes),
      })
    : "";

  const nextHtml = `
    <ul style="margin: 0; padding-left: 18px;">
      <li>Browse housing agencies and select one that fits your needs</li>
      <li>Your housing agency will help you find accommodation</li>
      <li>Track updates in your case dashboard</li>
    </ul>`;

  const emailHtml = renderTransactionalEmail({
    title: "Visa approved",
    previewText: `Your visa has been approved for ${destinationCountry}.`,
    greetingName: candidateName,
    introHtml: "The embassy has approved your visa application.",
    sections: [
      { title: "Details", html: detailsHtml },
      ...(notesBlock ? [{ title: "Decision notes", html: notesBlock }] : []),
      { title: "Next step", html: nextHtml },
    ],
    cta: { label: "Choose housing agency", href: caseUrl },
    tone: "success",
  });

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

  const tone = status === "rejected" ? "danger" : status === "interview_scheduled" ? "warning" : "info";
  const caseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;

  const detailsHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Embassy", value: embassyName },
    { label: "Status", value: status.replace(/_/g, " ") },
  ]);

  const notesBlock = decisionNotes
    ? renderEmailCallout({
        tone,
        title: "Notes",
        html: formatEmailNote(decisionNotes),
      })
    : "";

  const emailHtml = renderTransactionalEmail({
    title: "Embassy status update",
    previewText: statusInfo.title,
    greetingName: candidateName,
    introHtml: statusInfo.message,
    sections: [
      { title: "Update", html: detailsHtml },
      ...(notesBlock ? [{ title: "Additional notes", html: notesBlock }] : []),
    ],
    cta: { label: "View case details", href: caseUrl },
    tone,
  });

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

  const caseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;
  const interviewDateTime = new Date(interview_date).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const detailsHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Embassy", value: embassyName },
    { label: "Date & time", value: interviewDateTime },
    { label: "Location", value: interview_location },
  ]);

  const notesBlock = interview_notes
    ? renderEmailCallout({
        tone: "warning",
        title: "Additional notes",
        html: formatEmailNote(interview_notes),
      })
    : "";

  const remindersHtml = `
    <ul style="margin: 0; padding-left: 18px;">
      <li>Arrive at least 30 minutes early</li>
      <li>Bring your passport and original documents</li>
      <li>Dress professionally</li>
    </ul>`;

  const bringHtml = `
    <ul style="margin: 0; padding-left: 18px;">
      <li>Valid passport</li>
      <li>Interview appointment confirmation</li>
      <li>Supporting documents (originals where applicable)</li>
    </ul>`;

  const emailHtml = renderTransactionalEmail({
    title: "Embassy interview scheduled",
    previewText: `Interview scheduled for case ${caseNumber}.`,
    greetingName: candidateName,
    introHtml: "Your embassy interview has been scheduled. Please review the details and prepare accordingly.",
    sections: [
      { title: "Interview details", html: detailsHtml },
      ...(notesBlock ? [{ title: "Notes", html: notesBlock }] : []),
      { title: "Reminders", html: remindersHtml },
      { title: "What to bring", html: bringHtml },
    ],
    cta: { label: "View case details", href: caseUrl },
    tone: "warning",
  });

  await sendEmail({
    to: candidateEmail,
    subject: `Embassy Interview Scheduled - Case ${caseNumber}`,
    html: emailHtml,
  });
};

import prisma from '../../lib/prisma';
import { sendEmail } from "../../utils/email.util";
import {
  formatEmailNote,
  renderEmailCallout,
  renderEmailKeyValueTable,
  renderTransactionalEmail,
} from "../emailTemplates.service";
import { getFrontendUrl } from "../../config/appUrls";


export const getAgencyInfoForUser = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      agency_id: true,
      agency: {
        select: { name: true },
      },
    },
  });
};

export const getCaseForAgency = async (caseId: string, agencyId: string) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      agency_id: agencyId,
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
};

export const getDocumentForCase = async (
  documentId: string,
  caseId: string
) => {
  return prisma.caseDocument.findFirst({
    where: {
      document_id: documentId,
      case_id: caseId,
    },
  });
};

export const updateDocumentReview = async (
  documentId: string,
  status: string,
  notes: string | null,
  reviewedBy: string
) => {
  return prisma.caseDocument.update({
    where: { document_id: documentId },
    data: {
      status,
      review_feedback: notes,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
  });
};

export const getDocumentsForCase = async (caseId: string) => {
  return prisma.caseDocument.findMany({
    where: { case_id: caseId },
    orderBy: { created_at: "desc" },
  });
};

export const verifyCaseBelongsToAgency = async (
  caseId: string,
  agencyId: string
) => {
  return prisma.relocationCase.findFirst({
    where: {
      case_id: caseId,
      agency_id: agencyId,
    },
  });
};

export const sendDocumentReviewEmail = async (params: {
  candidateEmail: string;
  candidateName: string;
  agencyName: string;
  documentName: string;
  documentType: string;
  caseNumber: string;
  caseId: string;
  status: string;
  notes?: string | null;
}) => {
  const {
    candidateEmail,
    candidateName,
    agencyName,
    documentName,
    documentType,
    caseNumber,
    caseId,
    status,
    notes,
  } = params;

  const frontendUrl = getFrontendUrl();
  const formattedType = documentType.replace("_", " ");
  const reviewDate = new Date().toLocaleDateString();

  const configs: Record<
    string,
    {
      subject: string;
      title: string;
      bg: string;
      boxBg: string;
      boxBorder: string;
      textColor: string;
      message: string;
      buttonText: string;
      detail: string;
    }
  > = {
    approved: {
      subject: `Document Approved - ${caseNumber}`,
      title: "Document Approved",
      bg: "#10b981",
      boxBg: "#d1fae5",
      boxBorder: "#10b981",
      textColor: "#065f46",
      message: "Great news! Your document has been approved.",
      buttonText: "View Case Details",
      detail: `Your document has been reviewed and approved by <strong>${agencyName}</strong>.`,
    },
    rejected: {
      subject: `Document Rejected - ${caseNumber}`,
      title: "Document Rejected",
      bg: "#ef4444",
      boxBg: "#fee2e2",
      boxBorder: "#ef4444",
      textColor: "#991b1b",
      message: "Unfortunately, your document has been rejected.",
      buttonText: "Upload New Document",
      detail: `Your document was reviewed by <strong>${agencyName}</strong> and needs to be replaced. Please upload a new document that addresses the issues mentioned above.`,
    },
    needs_revision: {
      subject: `Document Needs Revision - ${caseNumber}`,
      title: "Document Needs Revision",
      bg: "#f59e0b",
      boxBg: "#fef3c7",
      boxBorder: "#f59e0b",
      textColor: "#92400e",
      message:
        "Your document has been reviewed and needs some changes.",
      buttonText: "Upload Revised Document",
      detail: `Your document was reviewed by <strong>${agencyName}</strong>. Please make the requested changes and upload a new version.`,
    },
  };

  const cfg = configs[status];
  if (!cfg) return;

  const tone = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";

  const detailsHtml = renderEmailKeyValueTable([
    { label: "Case number", value: caseNumber },
    { label: "Agency", value: agencyName },
    { label: "Document", value: documentName },
    { label: "Type", value: formattedType },
    { label: "Reviewed on", value: reviewDate },
  ]);

  const notesBlock = notes
    ? renderEmailCallout({
        tone,
        html: formatEmailNote(notes),
      })
    : "";

  const nextStepsText =
    status === "approved"
      ? "No action is required at this time."
      : status === "rejected"
        ? "Please upload a new version of the document that addresses the notes."
        : "Please revise the document and upload an updated version.";

  const emailHtml = renderTransactionalEmail({
    title: cfg.title,
    previewText: cfg.message,
    greetingName: candidateName,
    introHtml: cfg.message,
    sections: [
      { title: "Document details", html: detailsHtml },
      ...(notesBlock ? [{ title: "Notes", html: notesBlock }] : []),
      { title: "Next steps", html: `<p style="margin:0;">${nextStepsText}</p>` },
    ],
    cta: { label: cfg.buttonText, href: `${frontendUrl}/candidate/cases/${caseId}` },
    tone,
    footerNote: `Reviewed on ${reviewDate}. This is an automated notification from Hiralent.`,
  });

  await sendEmail({
    to: candidateEmail,
    subject: cfg.subject,
    html: emailHtml,
  });
};
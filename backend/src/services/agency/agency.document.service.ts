import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

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

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const formattedType = documentType.replace("_", " ");
  const reviewDate = new Date().toLocaleDateString();

  const notesHtml = notes
    ? `<p><strong>${status === "rejected" ? "Reason for Rejection" : status === "needs_revision" ? "Required Changes" : "Reviewer Notes"}:</strong> ${notes}</p>`
    : "";

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

  const icon =
    status === "approved" ? "✅" : status === "rejected" ? "❌" : "📝";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${cfg.bg}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-box { background: ${cfg.boxBg}; padding: 15px; border-left: 4px solid ${cfg.boxBorder}; margin: 20px 0; border-radius: 6px; }
        .document-info { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button { display: inline-block; background: ${cfg.bg}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${icon} ${cfg.title}</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${candidateName}</strong>,</p>
          <div class="status-box">
            <p style="margin: 0; color: ${cfg.textColor}; font-weight: bold;">${cfg.message}</p>
          </div>
          <div class="document-info">
            <p><strong>Document:</strong> ${documentName}</p>
            <p><strong>Type:</strong> ${formattedType}</p>
            <p><strong>Case Number:</strong> ${caseNumber}</p>
            ${notesHtml}
          </div>
          <p>${cfg.detail}</p>
          <a href="${frontendUrl}/candidate/cases/${caseId}" class="button">${cfg.buttonText}</a>
          <div class="footer">
            <p>This is an automated notification from Hiralent.</p>
            <p>Reviewed on ${reviewDate}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: candidateEmail,
    subject: cfg.subject,
    html: emailHtml,
  });
};
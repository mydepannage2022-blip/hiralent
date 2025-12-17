import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../../utils/email.util";

const prisma = new PrismaClient();

// PUT /api/v1/agency/cases/:caseId/documents/:documentId/review
export const reviewDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id: caseId, documentId } = req.params;
    const { status, notes } = req.body;

    console.log("=== DOCUMENT REVIEW ===");
    console.log("Agency User ID:", userId);
    console.log("Case ID:", caseId);
    console.log("Document ID:", documentId);
    console.log("New Status:", status);
    console.log("Review Notes:", notes);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Validate status
    const validStatuses = ["approved", "rejected", "needs_revision"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Get agency info
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        agency_id: true,
        agency: {
          select: {
            name: true,
          },
        },
      },
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

    // Verify document belongs to case
    const document = await prisma.caseDocument.findFirst({
      where: {
        document_id: documentId,
        case_id: caseId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Update document status
    const updatedDocument = await prisma.caseDocument.update({
      where: { document_id: documentId },
      data: {
        status: status,
        review_feedback: notes || null, 
        reviewed_by: userId,
        reviewed_at: new Date(),
      },
    });

    console.log("✅ Document status updated:", status);

    // ============================
    // 📧 EMAIL NOTIFICATION
    // ============================

    const agencyName = user.agency?.name || "Your Agency";
    const candidateName = caseData.candidate.full_name || "Candidate";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
      let emailSubject = "";
      let emailHtml = "";

      if (status === "approved") {
        emailSubject = `Document Approved - ${caseData.case_number}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .success-box { background: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 6px; }
              .document-info { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Document Approved</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${candidateName}</strong>,</p>
                
                <div class="success-box">
                  <p style="margin: 0; color: #065f46; font-weight: bold;">Great news! Your document has been approved.</p>
                </div>
                
                <div class="document-info">
                  <p><strong>Document:</strong> ${document.file_name}</p>
                  <p><strong>Type:</strong> ${document.document_type.replace(
                    "_",
                    " "
                  )}</p>
                  <p><strong>Case Number:</strong> ${caseData.case_number}</p>
                  ${
                    notes
                      ? `<p><strong>Reviewer Notes:</strong> ${notes}</p>`
                      : ""
                  }
                </div>
                
                <p>Your document has been reviewed and approved by <strong>${agencyName}</strong>.</p>
                
                <a href="${frontendUrl}/candidate/cases/${caseId}" class="button">View Case Details</a>
                
                <div class="footer">
                  <p>This is an automated notification from Hiralent.</p>
                  <p>Reviewed on ${new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
      } else if (status === "rejected") {
        emailSubject = `Document Rejected - ${caseData.case_number}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .warning-box { background: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 6px; }
              .document-info { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>❌ Document Rejected</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${candidateName}</strong>,</p>
                
                <div class="warning-box">
                  <p style="margin: 0; color: #991b1b; font-weight: bold;">Unfortunately, your document has been rejected.</p>
                </div>
                
                <div class="document-info">
                  <p><strong>Document:</strong> ${document.file_name}</p>
                  <p><strong>Type:</strong> ${document.document_type.replace(
                    "_",
                    " "
                  )}</p>
                  <p><strong>Case Number:</strong> ${caseData.case_number}</p>
                  ${
                    notes
                      ? `<p><strong>Reason for Rejection:</strong> ${notes}</p>`
                      : ""
                  }
                </div>
                
                <p>Your document was reviewed by <strong>${agencyName}</strong> and needs to be replaced.</p>
                <p>Please upload a new document that addresses the issues mentioned above.</p>
                
                <a href="${frontendUrl}/candidate/cases/${caseId}" class="button">Upload New Document</a>
                
                <div class="footer">
                  <p>This is an automated notification from Hiralent.</p>
                  <p>Reviewed on ${new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
      } else if (status === "needs_revision") {
        emailSubject = `Document Needs Revision - ${caseData.case_number}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .info-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 6px; }
              .document-info { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📝 Document Needs Revision</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${candidateName}</strong>,</p>
                
                <div class="info-box">
                  <p style="margin: 0; color: #92400e; font-weight: bold;">Your document has been reviewed and needs some changes.</p>
                </div>
                
                <div class="document-info">
                  <p><strong>Document:</strong> ${document.file_name}</p>
                  <p><strong>Type:</strong> ${document.document_type.replace(
                    "_",
                    " "
                  )}</p>
                  <p><strong>Case Number:</strong> ${caseData.case_number}</p>
                  ${
                    notes
                      ? `<p><strong>Required Changes:</strong> ${notes}</p>`
                      : ""
                  }
                </div>
                
                <p>Your document was reviewed by <strong>${agencyName}</strong>. Please make the requested changes and upload a new version.</p>
                
                <a href="${frontendUrl}/candidate/cases/${caseId}" class="button">Upload Revised Document</a>
                
                <div class="footer">
                  <p>This is an automated notification from Hiralent.</p>
                  <p>Reviewed on ${new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      await sendEmail({
        to: caseData.candidate.email,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`✅ Email sent to: ${caseData.candidate.email}`);
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Document reviewed successfully",
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Review document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to review document",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// GET /api/v1/agency/cases/:caseId/documents - List all documents for a case
export const getCaseDocuments = async (req: Request, res: Response) => {
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
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const documents = await prisma.caseDocument.findMany({
      where: { case_id: caseId },
      orderBy: { created_at: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
    });
  }
};

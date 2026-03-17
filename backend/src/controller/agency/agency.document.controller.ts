import { Request, Response } from "express";
import {
  getAgencyInfoForUser,
  getCaseForAgency,
  getDocumentForCase,
  updateDocumentReview,
  getDocumentsForCase,
  verifyCaseBelongsToAgency,
  sendDocumentReviewEmail,
} from "../../services/agency/agency.document.service";

// PUT /api/v1/agency/cases/:caseId/documents/:documentId/review
export const reviewDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.id as string;
    const documentId = req.params.documentId as string;
    const { status, notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const validStatuses = ["approved", "rejected", "needs_revision"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const user = await getAgencyInfoForUser(userId);

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const caseData = await getCaseForAgency(caseId, user.agency_id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const document = await getDocumentForCase(documentId, caseId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const updatedDocument = await updateDocumentReview(
      documentId,
      status,
      notes || null,
      userId
    );

    console.log("✅ Document status updated:", status);

    try {
      await sendDocumentReviewEmail({
        candidateEmail: caseData.candidate.email,
        candidateName: caseData.candidate.full_name || "Candidate",
        agencyName: user.agency?.name || "Your Agency",
        documentName: document.file_name,
        documentType: document.document_type,
        caseNumber: caseData.case_number,
        caseId,
        status,
        notes,
      });
      console.log(`✅ Email sent to: ${caseData.candidate.email}`);
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
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
    const caseId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getAgencyInfoForUser(userId);

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const caseData = await verifyCaseBelongsToAgency(caseId, user.agency_id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const documents = await getDocumentsForCase(caseId);

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

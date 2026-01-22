/**
 * Webhook handler for document validation results.
 *
 * The Python document-validator-service calls this endpoint
 * when deep validation completes.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

interface ValidationWebhookPayload {
  validation_job_id: string;
  document_id: string;
  status: "completed" | "failed";
  overall_confidence?: number;
  overall_status?: "valid" | "invalid" | "needs_review";
  extracted_data?: Record<string, any>;
  validation_signals?: Array<{
    signal_type: string;
    passed: boolean;
    score: number;
    details: string;
  }>;
  issues?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  processing_time_ms?: number;
  error_message?: string;
}

/**
 * POST /api/v1/webhooks/document-validation
 *
 * Receives validation results from the document-validator-service.
 */
router.post("/document-validation", async (req: Request, res: Response) => {
  try {
    const payload: ValidationWebhookPayload = req.body;

    console.log(
      `[Webhook] Received validation result for document: ${payload.document_id}`,
      `| Job: ${payload.validation_job_id}`,
      `| Status: ${payload.status}`,
      `| Result: ${payload.overall_status || "N/A"}`
    );

    // Validate required fields
    if (!payload.validation_job_id || !payload.document_id) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: validation_job_id, document_id",
      });
    }

    // Check if CaseDocument exists
    const document = await prisma.caseDocument.findUnique({
      where: { document_id: payload.document_id },
    });

    if (!document) {
      console.warn(`[Webhook] Document not found: ${payload.document_id}`);
      // Still return 200 to acknowledge receipt
      return res.json({
        ok: true,
        message: "Webhook received, but document not found in database",
      });
    }

    // Get the relocation case for notifications
    const relocationCase = await prisma.relocationCase.findUnique({
      where: { case_id: document.case_id },
      include: {
        candidate: true,
        agency: true,
      },
    });

    // Determine new document status based on validation result
    let newStatus: string;
    if (payload.status === "failed") {
      newStatus = "validation_failed";
    } else if (payload.overall_status === "valid" && (payload.overall_confidence || 0) >= 0.9) {
      newStatus = "approved"; // Auto-approve high confidence
    } else if (payload.overall_status === "invalid") {
      newStatus = "rejected";
    } else {
      newStatus = "pending_review"; // needs_review or low confidence
    }

    // Update CaseDocument with validation results
    await prisma.caseDocument.update({
      where: { document_id: payload.document_id },
      data: {
        status: newStatus,
        ai_validation_status: payload.overall_status || null,
        ai_validation_job_id: payload.validation_job_id,
        ai_confidence_score: payload.overall_confidence || null,
        ai_extracted_data: payload.extracted_data || undefined,
        ai_validation_signals: payload.validation_signals || undefined,
        ai_validation_issues: payload.issues || undefined,
        ai_validated_at: new Date(),
      },
    });

    console.log(
      `[Webhook] Updated document ${payload.document_id} status to: ${newStatus}`
    );

    // Create notification if needs review
    if (newStatus === "pending_review" && relocationCase?.agency) {
      const agencyOwnerId = relocationCase.agency.owner_user_id;

      if (agencyOwnerId) {
        await prisma.notification.create({
          data: {
            user_id: agencyOwnerId,
            type: "document_needs_review",
            message: `Document "${document.document_type}" requires manual review. Confidence: ${((payload.overall_confidence || 0) * 100).toFixed(0)}%`,
            sent_via: "push",
            is_read: false,
          },
        });

        console.log(`[Webhook] Created notification for agency owner: ${agencyOwnerId}`);
      }
    }

    // Create notification if rejected
    if (newStatus === "rejected" && relocationCase?.candidate) {
      const candidateUserId = relocationCase.candidate.user_id;

      if (candidateUserId) {
        // Get the issues as a readable message
        const issueMessages = payload.issues?.map((i) => i.message).join(", ") || "Document did not pass validation";

        await prisma.notification.create({
          data: {
            user_id: candidateUserId,
            type: "document_rejected",
            message: `Your "${document.document_type}" was rejected: ${issueMessages}`,
            sent_via: "push",
            is_read: false,
          },
        });

        console.log(`[Webhook] Created rejection notification for candidate: ${candidateUserId}`);
      }
    }

    return res.json({
      ok: true,
      message: "Validation result processed",
      data: {
        document_id: payload.document_id,
        new_status: newStatus,
      },
    });
  } catch (error: any) {
    console.error("[Webhook] Error processing validation result:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to process validation result",
    });
  }
});

/**
 * GET /api/v1/webhooks/document-validation/health
 *
 * Health check for the webhook endpoint.
 */
router.get("/document-validation/health", (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    message: "Document validation webhook is ready",
  });
});

export default router;

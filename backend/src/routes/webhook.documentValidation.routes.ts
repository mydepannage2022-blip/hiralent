/**
 * Webhook handler for document validation results.
 *
 * The Python document-validator-service calls this endpoint
 * when deep validation completes.
 */

import { Router, Request, Response } from "express";
import prisma from '../lib/prisma';
import { internalAuth } from "../middlewares/internalAuth.middleware";

const router = Router();

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
// Authenticated with the shared BACKEND_INTERNAL_TOKEN (constant-time compare via
// internalAuth). Only the document-validator-service, which holds the token, may
// post validation results — otherwise anyone could spoof KYC document statuses.
router.post("/document-validation", internalAuth, async (req: Request, res: Response) => {
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
    // Per spec: Agency always reviews - AI only flags issues
    let newStatus: string = "pending";

    // Only mark as validation_failed if the AI service itself failed (technical error)
    if (payload.status === "failed") {
      newStatus = "validation_failed";
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

    // Create high-priority notification if AI found issues
    // This flags the document for agency attention
    const hasIssues = payload.overall_status === "invalid" ||
                      (payload.issues && payload.issues.length > 0) ||
                      (payload.overall_confidence && payload.overall_confidence < 0.7);

    if (hasIssues && relocationCase?.agency) {
      const agencyOwnerId = relocationCase.agency.owner_user_id;

      if (agencyOwnerId) {
        const issueDescription = payload.issues?.map((i) => i.message).join(", ")
                               || "Low confidence validation";

        await prisma.notification.create({
          data: {
            recipient_id: agencyOwnerId,
            audience: "AGENCY",
            type: "GENERIC",
            title: "AI Document Review Required",
            message: `Document "${document.document_type}" flagged by AI: ${issueDescription}. Confidence: ${((payload.overall_confidence || 0) * 100).toFixed(0)}%`,
            sent_via: "push",
          },
        });

        console.log(`[Webhook] Created flagged document notification for agency owner: ${agencyOwnerId}`);
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

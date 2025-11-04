import { Request, Response } from "express";
import { handleUpload } from "../services/upload/upload.service";
import { signedUrl } from "../services/upload/storage.service";
import { ocrAndParse } from "../services/ocr/ocrAndParse";
import { saveDocOCRSignal } from "../services/verification/signals";
import { loadExpectedFromRun } from "../services/verification/loadExpected";
import { s3GetObject } from "../lib/s3";
import prisma from "../lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

/**
 * Upload company document to MinIO
 */
export async function uploadCompanyDoc(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const { companyId } = req.params;
    const { 
      document_type = "company_registration",
      perform_ocr,
      force_type,
      run_id 
    } = req.body;

    const userId = (req as any).user?.user_id;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: "User not authenticated",
      });
    }

    // 1. Upload file to MinIO using existing handleUpload
    const { documentId } = await handleUpload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      uploadedBy: userId,
      subjectType: "COMPANY",
      subjectId: companyId,
      documentType: document_type,
    });

    // 2. Get uploaded document
    const document = await prisma.uploadedDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      return res.status(500).json({
        ok: false,
        error: "Document uploaded but not found in database",
      });
    }

    // 3. Generate signed URL
    const documentSignedUrl = await signedUrl(document.storage_key);

    // 4. Generate preview URL if available
    let previewUrl: string | undefined;
    if (document.preview_key && document.preview_ready) {
      previewUrl = await signedUrl(document.preview_key);
    }

    // 5. Perform OCR if requested
    let ocrResult: any = null;

    if (perform_ocr === "true" || perform_ocr === "1") {
      try {
        // Create temp file for OCR
        const tempFilePath = path.join(
          os.tmpdir(),
          `ocr-${Date.now()}-${document.file_name}`
        );
        await fs.writeFile(tempFilePath, req.file.buffer);

        // Run OCR + classification + parsing
        const { type, ocrText, parsed } = await ocrAndParse(
          tempFilePath,
          document.mime_type,
          force_type as "cv" | "company_doc" | undefined
        );

        ocrResult = { type, ocrText, parsed };

        // For company documents with runId, create verification signal
        if (run_id && type === "company_doc") {
          let expected: any;
          try {
            expected = await loadExpectedFromRun(run_id);
          } catch (error) {
            console.warn("Could not load expected data:", error);
          }

          const signal = await saveDocOCRSignal({
            prisma,
            runId: run_id,
            ocrText,
            parsed,
            expected,
          });

          ocrResult.signal = signal;
        }

        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});
      } catch (error: any) {
        console.error("OCR processing failed:", error);
        ocrResult = { error: error.message };
      }
    }

    return res.status(201).json({
      ok: true,
      message: "Company document uploaded successfully",
      data: {
        document_id: document.document_id,
        file_name: document.file_name,
        storage_key: document.storage_key,
        mime_type: document.mime_type,
        file_size: document.file_size,
        sha256: document.sha256,
        document_type: document.document_type,
        status: document.status,
        preview_ready: document.preview_ready,
        created_at: document.created_at,
        signedUrl: documentSignedUrl,
        previewUrl,
        ocr: ocrResult,
      },
    });
  } catch (error: any) {
    console.error("[uploadCompanyDoc] error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to upload company document",
    });
  }
}

/**
 * Upload agency document to MinIO
 */
export async function uploadAgencyDoc(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const { agencyId } = req.params;
    const { 
      document_type = "agency_license",
      perform_ocr,
      force_type,
      run_id 
    } = req.body;

    const userId = (req as any).user?.user_id;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: "User not authenticated",
      });
    }

    // 1. Upload file to MinIO
    const { documentId } = await handleUpload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      uploadedBy: userId,
      subjectType: "AGENCY",
      subjectId: agencyId,
      documentType: document_type,
    });

    // 2. Get uploaded document
    const document = await prisma.uploadedDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      return res.status(500).json({
        ok: false,
        error: "Document uploaded but not found in database",
      });
    }

    // 3. Generate signed URL
    const documentSignedUrl = await signedUrl(document.storage_key);

    // 4. Generate preview URL if available
    let previewUrl: string | undefined;
    if (document.preview_key && document.preview_ready) {
      previewUrl = await signedUrl(document.preview_key);
    }

    // 5. Perform OCR if requested
    let ocrResult: any = null;

    if (perform_ocr === "true" || perform_ocr === "1") {
      try {
        const tempFilePath = path.join(
          os.tmpdir(),
          `ocr-${Date.now()}-${document.file_name}`
        );
        await fs.writeFile(tempFilePath, req.file.buffer);

        const { type, ocrText, parsed } = await ocrAndParse(
          tempFilePath,
          document.mime_type,
          force_type as "cv" | "company_doc" | undefined
        );

        ocrResult = { type, ocrText, parsed };

        if (run_id && type === "company_doc") {
          let expected: any;
          try {
            expected = await loadExpectedFromRun(run_id);
          } catch (error) {
            console.warn("Could not load expected data:", error);
          }

          const signal = await saveDocOCRSignal({
            prisma,
            runId: run_id,
            ocrText,
            parsed,
            expected,
          });

          ocrResult.signal = signal;
        }

        await fs.unlink(tempFilePath).catch(() => {});
      } catch (error: any) {
        console.error("OCR processing failed:", error);
        ocrResult = { error: error.message };
      }
    }

    return res.status(201).json({
      ok: true,
      message: "Agency document uploaded successfully",
      data: {
        document_id: document.document_id,
        file_name: document.file_name,
        storage_key: document.storage_key,
        mime_type: document.mime_type,
        file_size: document.file_size,
        sha256: document.sha256,
        document_type: document.document_type,
        status: document.status,
        preview_ready: document.preview_ready,
        created_at: document.created_at,
        signedUrl: documentSignedUrl,
        previewUrl,
        ocr: ocrResult,
      },
    });
  } catch (error: any) {
    console.error("[uploadAgencyDoc] error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to upload agency document",
    });
  }
}

/**
 * Get signed URL for document
 */
export async function getSignedUrl(req: Request, res: Response) {
  try {
    const { documentId } = req.params;

    const document = await prisma.uploadedDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      return res.status(404).json({
        ok: false,
        error: "Document not found",
      });
    }

    const url = await signedUrl(document.storage_key);

    return res.json({
      ok: true,
      data: {
        documentId: document.document_id,
        signedUrl: url,
        expiresIn: 600, // seconds
      },
    });
  } catch (error: any) {
    console.error("[getSignedUrl] error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to generate signed URL",
    });
  }
}

/**
 * Get signed URL for document preview
 */
export async function getPreviewUrl(req: Request, res: Response) {
  try {
    const { documentId } = req.params;

    const document = await prisma.uploadedDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      return res.status(404).json({
        ok: false,
        error: "Document not found",
      });
    }

    if (!document.preview_key || !document.preview_ready) {
      return res.status(404).json({
        ok: false,
        error: "Preview not available for this document",
      });
    }

    const url = await signedUrl(document.preview_key);

    return res.json({
      ok: true,
      data: {
        documentId: document.document_id,
        previewUrl: url,
        expiresIn: 600, // seconds
      },
    });
  } catch (error: any) {
    console.error("[getPreviewUrl] error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to generate preview URL",
    });
  }
}

/**
 * Perform OCR on existing document
 */
export async function performOCR(req: Request, res: Response) {
  try {
    const { documentId } = req.params;
    const { force_type, run_id } = req.body;

    // Get document from database
    const document = await prisma.uploadedDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      return res.status(404).json({
        ok: false,
        error: "Document not found",
      });
    }

    // Only perform OCR on images and PDFs
    if (
      !document.mime_type.startsWith("image/") &&
      document.mime_type !== "application/pdf"
    ) {
      return res.status(400).json({
        ok: false,
        error: "OCR only supports images and PDFs",
      });
    }

    // Download file from MinIO
    const fileBuffer = await s3GetObject(document.storage_key);

    // Create temporary file for OCR
    const tempFilePath = path.join(
      os.tmpdir(),
      `ocr-${Date.now()}-${document.file_name}`
    );
    await fs.writeFile(tempFilePath, fileBuffer);

    try {
      // Run OCR
      const { type, ocrText, parsed } = await ocrAndParse(
        tempFilePath,
        document.mime_type,
        force_type as "cv" | "company_doc" | undefined
      );

      // For company documents with runId, create verification signal
      let signal: any = null;
      if (run_id && type === "company_doc") {
        let expected: any;
        try {
          expected = await loadExpectedFromRun(run_id);
        } catch (error) {
          console.warn("Could not load expected data:", error);
        }

        signal = await saveDocOCRSignal({
          prisma,
          runId: run_id,
          ocrText,
          parsed,
          expected,
        });
      }

      // Clean up temp file
      await fs.unlink(tempFilePath);

      return res.json({
        ok: true,
        data: {
          type,
          ocrText,
          parsed,
          signal,
        },
      });
    } catch (error: any) {
      // Clean up temp file on error
      await fs.unlink(tempFilePath).catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error("[performOCR] error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "OCR processing failed",
    });
  }
}

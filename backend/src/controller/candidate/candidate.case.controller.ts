import { Request, Response } from "express";
import prisma from '../../lib/prisma';
import { parsePagination, setPaginationHeaders } from '../../utils/pagination.util';
import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  validateDocumentQuick,
  validateDocumentDeep,
  DocumentType,
} from "../../clients/document-validator.client";
// Reuse the shared, env-configured S3/MinIO client instead of a second client that
// carried a hardcoded endpoint and hardcoded default credentials.
import { s3, s3Bucket } from "../../lib/s3";
import { requireEnv } from "../../config/requireEnv";


const uploadToMinIO = async (
  file: Express.Multer.File,
  caseId: string,
  documentType: string
): Promise<{ url: string; key: string }> => {
  const key = `case-documents/${caseId}/${documentType}_${Date.now()}_${
    file.originalname
  }`;

  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  // Same `{endpoint}/{bucket}/{key}` shape the delete paths parse back out below.
  const url = `${requireEnv("S3_ENDPOINT").replace(/\/+$/, "")}/${s3Bucket}/${key}`;
  return { url, key };
};

// Map internal document types to validator types
function mapToValidatorType(docType: string): DocumentType {
  const mapping: Record<string, DocumentType> = {
    passport: "passport_copy",
    visa_application: "visa_application_form",
    bank_statement: "bank_statement",
    employment_letter: "employment_letter",
    proof_of_accommodation: "accommodation_proof",
  };
  return mapping[docType] || "passport_copy";
}

export const getCandidateCases = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Show-all: a candidate's own cases (usually few); default page size == cap bounds the tail.
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, max: 100 });
    const where = { candidate_id: userId };
    const [cases, total] = await Promise.all([
      prisma.relocationCase.findMany({
        where,
        include: {
          agency: {
            select: {
              agency_id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          documents: {
            select: {
              document_id: true,
              document_type: true,
              file_name: true,
              status: true,
              created_at: true,
            },
            orderBy: { created_at: "desc" },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.relocationCase.count({ where }),
    ]);

    setPaginationHeaders(res, { total, page, limit });
    return res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error("Get cases error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cases",
    });
  }
};

export const getCaseById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: userId,
      },
      include: {
        agency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        documents: {
          orderBy: { created_at: "desc" },
        },
        updates: {
          orderBy: { created_at: "desc" },
          take: 10,
        },
        embassy_submission: true,
        integrationServices: {
          orderBy: {
            created_at: "asc",
          },
        },
        integrationAgency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        // Include housing data
        housing_details: true,
        housingAgency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true,
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

    // FLATTEN THE RESPONSE - Merge housing fields to top level
    return res.status(200).json({
      success: true,
      data: {
        ...caseData,
        // Merge housing fields to top level
        housing_type: caseData.housing_details?.housing_type,
        housing_address: caseData.housing_details?.housing_address,
        monthly_rent_mad: caseData.housing_details?.monthly_rent_mad,
        agency_fee_amount: caseData.housing_details?.agency_fee_amount,
        lease_start_date: caseData.housing_details?.lease_start_date,
        lease_end_date: caseData.housing_details?.lease_end_date,
        housing_contract_url: caseData.housing_details?.housing_contract_url,
        utility_water: caseData.housing_details?.utility_water,
        utility_electricity: caseData.housing_details?.utility_electricity,
        utility_internet: caseData.housing_details?.utility_internet,
        arrival_date: caseData.housing_details?.arrival_date,
        flight_number: caseData.housing_details?.flight_number,
        airport_pickup_required:
          caseData.housing_details?.airport_pickup_required,
        arrival_notes: caseData.housing_details?.arrival_notes,
        // Remove nested object
        housing_details: undefined,
      },
    });
  } catch (error) {
    console.error("Get case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch case",
    });
  }
};

export const uploadCaseDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;
    const { document_type, notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify case belongs to candidate
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: userId,
      },
      include: {
        candidate: {
          select: {
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

    // Check for existing approved document of same type
    const existingApproved = await prisma.caseDocument.findFirst({
      where: {
        case_id: caseId,
        document_type: document_type,
        status: "approved",
        is_active: true,
      },
      select: {
        document_id: true,
        file_name: true,
        status: true,
      },
    });

    // If no file provided, this is a duplicate check request
    if (!req.file) {
      if (existingApproved) {
        return res.status(200).json({
          success: true,
          warning: true,
          existingDocument: existingApproved,
          message: "An approved document of this type already exists",
        });
      }
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Upload to MinIO
    console.log("✅ Uploading to MinIO...");
    const { url, key } = await uploadToMinIO(req.file, caseId, document_type);

    // Create document record
    const document = await prisma.caseDocument.create({
      data: {
        case_id: caseId,
        file_name: req.file.originalname,
        file_path: url,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        document_type: document_type,
        uploaded_by: userId,
        status: "pending",
        notes: notes || null,
        is_active: true,
        replaces_document_id: null, // Will be set if confirmed
      },
    });

    console.log("✅ Upload successful!");

    // Run AI validation (non-blocking - fallback to manual review if it fails)
    try {
      console.log("🤖 Running AI validation...");

      // Step 1: Quick validation (synchronous - format, size, pages)
      const quickResult = await validateDocumentQuick({
        document_id: document.document_id,
        storage_key: key,
        document_type: mapToValidatorType(document_type),
        mime_type: req.file.mimetype,
        expected_data: { full_name: caseData.candidate?.full_name || "" },
      });

      if (!quickResult.ok || !quickResult.data?.can_proceed_to_deep_validation) {
        // Quick validation failed - update document status
        await prisma.caseDocument.update({
          where: { document_id: document.document_id },
          data: { status: "validation_failed" },
        });

        console.log("❌ Quick validation failed");
        return res.status(400).json({
          success: false,
          message: "Document validation failed",
          checks: quickResult.data?.checks || [],
        });
      }

      console.log("✅ Quick validation passed");

      // Step 2: Queue deep validation (asynchronous - OCR + NLP)
      const deepResult = await validateDocumentDeep({
        document_id: document.document_id,
        case_id: caseId,
        storage_key: key,
        document_type: mapToValidatorType(document_type),
        mime_type: req.file.mimetype,
        expected_data: { full_name: caseData.candidate?.full_name || "" },
      });

      if (deepResult.ok && deepResult.data?.validation_job_id) {
        // Store validation job ID
        await prisma.caseDocument.update({
          where: { document_id: document.document_id },
          data: { ai_validation_job_id: deepResult.data.validation_job_id },
        });
        console.log(
          `✅ Deep validation queued (job: ${deepResult.data.validation_job_id})`
        );
      }
    } catch (validationError) {
      // Don't fail the upload if validation service is down
      console.error("[Validation] Service unavailable:", validationError);
      console.log("⚠️  Validation skipped - document will require manual review");
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
      requiresConfirmation: !!existingApproved,
      existingDocument: existingApproved || null,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCaseDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: userId,
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

export const deleteCaseDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;
    const documentId = req.params.documentId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const document = await prisma.caseDocument.findFirst({
      where: {
        document_id: documentId,
        case_id: caseId,
        uploaded_by: userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete approved documents",
      });
    }

    // Extract key from URL
    const url = new URL(document.file_path);
    const key = url.pathname.split("/").slice(2).join("/");

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: s3Bucket,
          Key: key,
        })
      );
      console.log("✅ Deleted from MinIO");
    } catch (err) {
      console.error("MinIO delete error:", err);
    }

    await prisma.caseDocument.delete({
      where: { document_id: documentId },
    });

    return res.status(200).json({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete",
    });
  }
};

// Confirm document replacement
export const confirmDocumentReplacement = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;
    const { oldDocumentId, newDocumentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify case belongs to candidate
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: userId,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Verify both documents exist and belong to this case
    const oldDoc = await prisma.caseDocument.findFirst({
      where: {
        document_id: oldDocumentId,
        case_id: caseId,
      },
    });

    const newDoc = await prisma.caseDocument.findFirst({
      where: {
        document_id: newDocumentId,
        case_id: caseId,
      },
    });

    if (!oldDoc || !newDoc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Mark old document as inactive
    await prisma.caseDocument.update({
      where: { document_id: oldDocumentId },
      data: { is_active: false },
    });

    // Update new document to link to old one
    const updatedDocument = await prisma.caseDocument.update({
      where: { document_id: newDocumentId },
      data: {
        is_active: true,
        replaces_document_id: oldDocumentId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Document replacement confirmed",
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Confirm replacement error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm replacement",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Cancel document replacement (delete new doc, keep old)
export const cancelDocumentReplacement = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;
    const documentId = req.params.documentId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify case belongs to candidate
    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: userId,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Get document to delete
    const document = await prisma.caseDocument.findFirst({
      where: {
        document_id: documentId,
        case_id: caseId,
        uploaded_by: userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Extract key from URL and delete from MinIO
    const url = new URL(document.file_path);
    const key = url.pathname.split("/").slice(2).join("/");

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: s3Bucket,
          Key: key,
        })
      );
      console.log("✅ Deleted from MinIO");
    } catch (err) {
      console.error("MinIO delete error:", err);
      // Continue even if MinIO delete fails
    }

    // Delete from database
    await prisma.caseDocument.delete({
      where: { document_id: documentId },
    });

    return res.status(200).json({
      success: true,
      message: "Upload cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel replacement error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel upload",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

const s3Client = new S3Client({
  endpoint: "http://127.0.0.1:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
  },
  forcePathStyle: true,
});

const uploadToMinIO = async (
  file: Express.Multer.File,
  caseId: string,
  documentType: string
): Promise<{ url: string; key: string }> => {
  const key = `case-documents/${caseId}/${documentType}_${Date.now()}_${
    file.originalname
  }`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: "hiralent-uploads",
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const url = `http://127.0.0.1:9000/hiralent-uploads/${key}`;
  return { url, key };
};

export const getCandidateCases = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cases = await prisma.relocationCase.findMany({
      where: { candidate_id: userId },
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
    });

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
    const { caseId } = req.params;

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
            created_at: 'asc'
          }
        },
        integrationAgency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: caseData,
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
    const { caseId } = req.params;
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
    const { url } = await uploadToMinIO(req.file, caseId, document_type);

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
    const { caseId } = req.params;

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
    const { caseId, documentId } = req.params;

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
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: "hiralent-uploads",
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
export const confirmDocumentReplacement = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId } = req.params;
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
export const cancelDocumentReplacement = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { caseId, documentId } = req.params;

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
    const key = url.pathname.split('/').slice(2).join('/');

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: "hiralent-uploads",
        Key: key,
      }));
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
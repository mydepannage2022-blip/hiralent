import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
  const key = `case-documents/${caseId}/${documentType}_${Date.now()}_${file.originalname}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: "hiralent-uploads",
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

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

    if (!userId || !req.file || !document_type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
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

    console.log("✅ Uploading to MinIO...");
    const { url } = await uploadToMinIO(req.file, caseId, document_type);

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
      },
    });

    console.log("✅ Upload successful!");

    return res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
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
    const key = url.pathname.split('/').slice(2).join('/');

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: "hiralent-uploads",
        Key: key,
      }));
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
import { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../lib/prisma";
import { handleUpload } from "../services/upload/upload.service";
import { signedUrl } from "../services/upload/storage.service";

// ✅ import the validators
import {
  parseUploadRequest,
  CompanyUploadParamsSchema,
  AgencyUploadParamsSchema,
} from "../validation/upload.schema";

function zodToHttp(err: ZodError) {
  return {
    error: "ValidationError",
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}

export const uploadCompanyDoc = async (req: Request, res: Response) => {
  try {
    // validate route params and multipart (body + file)
    const { companyId } = CompanyUploadParamsSchema.parse(req.params);
    const { body, file } = parseUploadRequest(req);

    const userId = (req as any).user.user_id; // from checkAuth

    // TODO: check user is member/admin of this company

    const result = await handleUpload({
      buffer: file.buffer,
      originalName: file.originalname,
      uploadedBy: userId,
      subjectType: "COMPANY",
      subjectId: companyId,
      documentType: body.document_type, // validated enum
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(zodToHttp(err));
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const uploadAgencyDoc = async (req: Request, res: Response) => {
  try {
    // validate route params and multipart (body + file)
    const { agencyId } = AgencyUploadParamsSchema.parse(req.params);
    const { body, file } = parseUploadRequest(req);

    const userId = (req as any).user.user_id;

    // TODO: check user is member/admin of this agency

    const result = await handleUpload({
      buffer: file.buffer,
      originalName: file.originalname,
      uploadedBy: userId,
      subjectType: "AGENCY",
      subjectId: agencyId,
      documentType: body.document_type, // validated enum
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(zodToHttp(err));
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSignedUrl = async (req: Request, res: Response) => {
  const id = req.params.documentId;
  const doc = await prisma.uploadedDocument.findUnique({ where: { document_id: id } });
  if (!doc) return res.status(404).json({ error: "Not found" });

  // TODO: only uploader / subject owner / admins
  const url = await signedUrl(doc.storage_key);
  res.json({ url, expiresIn: Number(process.env.SIGNED_URL_TTL_SECONDS || 600) });
};

export const getPreviewUrl = async (req: Request, res: Response) => {
  const id = req.params.documentId;
  const doc = await prisma.uploadedDocument.findUnique({ where: { document_id: id } });
  if (!doc || !doc.preview_key) return res.status(404).json({ error: "Preview not ready" });

  // TODO: only uploader / subject owner / admins
  const url = await signedUrl(doc.preview_key);
  res.json({ url, expiresIn: Number(process.env.SIGNED_URL_TTL_SECONDS || 600) });
};

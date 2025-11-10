import crypto from "crypto";
import path from "path";
import prisma from "../../lib/prisma";
import { s3PutObject } from "../../lib/s3";

type UploadInput = {
  buffer: Buffer;
  originalName: string;
  uploadedBy: string;         // user_id
  subjectType: "COMPANY" | "AGENCY" | "USER";
  subjectId: string;          // companyId | agencyId | userId
  documentType: string;       // e.g., registration_cert
  mimeType?: string;          // optional override
};

export async function handleUpload(input: UploadInput): Promise<{ documentId: string }> {
  const { buffer, originalName, uploadedBy, subjectType, subjectId, documentType, mimeType } = input;

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(originalName) || "";
  const nowIso = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const key = `${subjectType.toLowerCase()}/${subjectId}/${nowIso}/${sha256}${ext}`;

  // 1) push to MinIO
  await s3PutObject(key, buffer, mimeType);

  // 2) create DB row
  const doc = await prisma.uploadedDocument.create({
    data: {
      storage_key: key,
      file_name: originalName,
      uploaded_by: uploadedBy,
      subject_type: subjectType,
      subject_id: subjectId,
      document_type: documentType,
      file_size: buffer.length,
      sha256,
      mime_type: mimeType || guessMime(originalName),
      status: "UPLOADED",
      preview_ready: false,
    },
    select: { document_id: true },
  });

  return { documentId: doc.document_id };
}

function guessMime(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

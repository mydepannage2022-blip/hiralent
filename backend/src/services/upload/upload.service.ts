import prisma from "../../lib/prisma";
import { sha256 } from "../../lib/hashing";
import { sniffMime, sniffExt } from "../../lib/mime";

import { scanBuffer } from "./antivirus.service";
import { storeFile } from "./storage.service";
import { generateImagePreview } from "./preview.service";

const ALLOWED = (process.env.ALLOWED_MIME || "image/png,image/jpeg,application/pdf")
  .split(",")
  .map((s) => s.trim().toLowerCase())   // <- ensure lowercase comparison
  .filter(Boolean);

type SubjectType = "COMPANY" | "AGENCY";

export async function handleUpload(params: {
  buffer: Buffer;
  originalName: string;
  uploadedBy: string;
  subjectType: SubjectType;
  subjectId: string;
  documentType: string;
}) {
  const { buffer, originalName, uploadedBy, subjectType, subjectId, documentType } = params;

  // 1) Detect real MIME/extension (don’t trust filename)
  const mime = (await sniffMime(buffer, "application/octet-stream")).toLowerCase();
  if (!ALLOWED.includes(mime)) {
    throw new Error("Unsupported file type");
  }
  const ext = (await sniffExt(buffer)) || (originalName.split(".").pop() || "").toLowerCase();

  // 2) Hash for dedupe/audit
  const hash = sha256(buffer);

  // 3) Antivirus (fail closed unless DISABLE_AV=1)
  await scanBuffer(buffer);

  // 4) Build storage key
  const today = new Date().toISOString().slice(0, 10);
  const key = [
    "verification",
    subjectType.toLowerCase(),
    subjectId,
    today,
    `${hash}.${ext || "bin"}`,
  ].join("/");

  // 5) Upload original to object storage
  await storeFile(key, buffer, mime);

  // 6) Create DB record (preview pending)
  const doc = await prisma.uploadedDocument.create({
    data: {
      uploaded_by: uploadedBy,
      subject_type: subjectType,
      subject_id: subjectId,
      file_name: originalName,
      storage_key: key,
      mime_type: mime,
      file_ext: ext || null,
      file_size: buffer.byteLength,
      sha256: hash,
      document_type: documentType,
      status: "pending",
    },
  });

  // 7) If image → generate inline preview; PDFs can be queued later
  if (mime.startsWith("image/")) {
    const previewBuf = await generateImagePreview(buffer);
    const previewKey = key.replace(/\.[^.]+$/, "") + ".preview.jpg";
    await storeFile(previewKey, previewBuf, "image/jpeg");

    await prisma.uploadedDocument.update({
      where: { document_id: doc.document_id },
      data: { preview_key: previewKey, preview_ready: true },
    });
  }

  return { documentId: doc.document_id };
}

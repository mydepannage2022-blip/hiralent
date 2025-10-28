// backend/src/services/verification/helpers/file.ts
import crypto from "crypto";
import fs from "fs/promises";
// if using S3, import AWS S3 client; else read local

export async function getFileBufferFromS3OrLocal(storage_key: string): Promise<Buffer> {
  // If you’re on local dev:
  if (storage_key.startsWith("uploads/") || storage_key.startsWith("/")) {
    return fs.readFile(storage_key);
  }
  // TODO: fetch from S3 with storage_key
  throw new Error("S3 fetch not implemented in this snippet");
}

export async function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

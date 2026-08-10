// backend/src/services/verification/helpers/file.ts
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { s3GetObject } from "../../../lib/s3";

// Local uploads root that on-disk reads are confined to. Overridable for deployments that
// store files outside <cwd>/uploads. Every local read must resolve to a path UNDER this
// root — no "uploads/../../etc/passwd" traversal, no absolute-path escape (Wave 4 review).
const LOCAL_ROOT = path.resolve(
  process.env.VERIFICATION_LOCAL_ROOT || path.join(process.cwd(), "uploads")
);

/**
 * Resolve a local-looking storage key to an absolute path, but ONLY if it stays inside
 * LOCAL_ROOT. Returns null when the key escapes the root (traversal / absolute outside root),
 * so the caller can fail closed instead of reading an arbitrary host file.
 */
function resolveContainedLocalPath(storage_key: string): string | null {
  const abs = path.isAbsolute(storage_key)
    ? path.resolve(storage_key)
    : path.resolve(process.cwd(), storage_key);
  const rel = path.relative(LOCAL_ROOT, abs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return abs;
}

export async function getFileBufferFromS3OrLocal(storage_key: string): Promise<Buffer> {
  // A relative uploads/ path or an absolute filesystem path is a LOCAL file; everything else
  // is an object key in the S3/MinIO bucket. Local reads are confined to LOCAL_ROOT and fail
  // closed on any attempt to escape it — a storage_key is derived from user-influenced data
  // (e.g. original filename extension), so it must never be trusted as a raw filesystem path.
  if (storage_key.startsWith("uploads/") || path.isAbsolute(storage_key)) {
    const local = resolveContainedLocalPath(storage_key);
    if (!local) {
      throw new Error("Refusing to read local file outside the uploads root");
    }
    return fs.readFile(local);
  }
  // Real object storage: reuse the shared, already-proven S3 client (lib/s3.ts).
  return s3GetObject(storage_key);
}

export async function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

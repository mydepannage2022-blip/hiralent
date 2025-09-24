import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const forcePathStyle =
  String(process.env.S3_FORCE_PATH_STYLE ?? "true").toLowerCase() === "true";

export const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT, // http://127.0.0.1:9000  (or http://minio:9000 in docker)
  forcePathStyle,                    // MinIO needs this
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

const Bucket = process.env.S3_BUCKET!;

export async function s3PutObject(
  Key: string,
  Body: Buffer,
  ContentType: string
) {
  await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
  return Key;
}

export function s3SignedGetUrl(
  Key: string,
  expiresIn = Number(process.env.SIGNED_URL_TTL_SECONDS || 600)
) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn });
}

// Handy for debugging keys (optional)
export function s3HeadObject(Key: string) {
  return s3.send(new HeadObjectCommand({ Bucket, Key }));
}

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT!;
const region = process.env.S3_REGION || "us-east-1";

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

export const s3Bucket = process.env.S3_BUCKET!;

export async function s3PutObject(key: string, body: Buffer, contentType?: string) {
  await s3.send(new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return key;
}

export async function s3GetObject(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: key }));
  // @ts-ignore
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function s3SignedUrl(key: string, seconds?: number) {
  const ttl = Number(process.env.SIGNED_URL_TTL_SECONDS || seconds || 600);
  const cmd = new GetObjectCommand({ Bucket: s3Bucket, Key: key });
  return awsGetSignedUrl(s3, cmd, { expiresIn: ttl });
}

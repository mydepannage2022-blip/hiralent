import {
  s3PutObject as putObject,
  s3SignedGetUrl as getSignedGetUrl,
} from "../../lib/s3";

const DEFAULT_TTL = Number(process.env.SIGNED_URL_TTL_SECONDS || 600);

export async function storeFile(key: string, buf: Buffer, mime: string) {
  await putObject(key, buf, mime);
  return key;
}

export async function signedUrl(key: string, ttlSec = DEFAULT_TTL) {
  return getSignedGetUrl(key, ttlSec);
}

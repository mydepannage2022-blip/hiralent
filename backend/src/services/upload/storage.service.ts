import { s3SignedUrl } from "../../lib/s3";

export async function signedUrl(storageKey: string) {
  return s3SignedUrl(storageKey);
}

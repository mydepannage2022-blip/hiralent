import sharp from "sharp";

/**
 * Downscale any image to ~900px width as a lightweight JPEG
 */
export async function generateImagePreview(buf: Buffer): Promise<Buffer> {
  return sharp(buf).resize({ width: 900 }).jpeg({ quality: 65 }).toBuffer();
}

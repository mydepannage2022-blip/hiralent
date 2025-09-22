import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import pdfParse from 'pdf-parse';
import { fileTypeFromBuffer } from 'file-type';

async function preprocessImage(inputPath: string): Promise<string> {
  const outPath = `${inputPath}-clean.png`;
  await sharp(inputPath)
    .rotate()       // auto-orient via EXIF
    .grayscale()
    .sharpen()
    .normalize()
    .toFile(outPath);
  return outPath;
}

async function ocrImage(filePath: string, lang = (process.env.OCR_LANGS || 'eng')): Promise<string> {
  const cleaned = await preprocessImage(filePath);
  const { data } = await Tesseract.recognize(cleaned, lang, {
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
  } as any);
  return data.text || '';
}

async function ocrPdf(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  // 1) Try embedded text first
  const parsed = await pdfParse(buf);
  if (parsed.text && parsed.text.trim().length > 20) return parsed.text;

  // 2) Fallback (scanned PDF): quick OCR directly.
  const { data } = await Tesseract.recognize(filePath, 'eng', {
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
  } as any);
  return data.text || '';
}

/** Decide PDF vs image and run appropriate OCR path */
export async function ocrFromFile(filePath: string, declaredMime?: string): Promise<string> {
  const buf = await fs.readFile(filePath);

  let mime = declaredMime || '';
  try {
    const { fileTypeFromBuffer } = await import('file-type');  // <— dynamic import
    const detected = await fileTypeFromBuffer(buf);
    if (detected?.mime) mime = detected.mime;
  } catch {
    // ignore detection errors, fallback to declared mimetype
  }

  if (mime === 'application/pdf' || mime.endsWith('/pdf')) {
    return ocrPdf(filePath);
  }
  return ocrImage(filePath);
}


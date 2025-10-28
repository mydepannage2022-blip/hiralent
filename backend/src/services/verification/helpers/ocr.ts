// backend/src/services/verification/helpers/ocr.ts
import pdf from "pdf-parse";
import Tesseract from "tesseract.js";

export async function ocrExtract(buf: Buffer, mime: string) {
  if (mime.includes("pdf")) {
    const res = await pdf(buf);
    if (res.text && res.text.trim().length > 20) {
      return { text: res.text, engine: "pdf-parse" };
    }
    // scanned PDF fallback (render pages to images first if you want better results)
  }
  // generic OCR fallback (works for image/* too)
  const { data } = await Tesseract.recognize(buf, "eng");
  return { text: data?.text || "", engine: "tesseract" };
}

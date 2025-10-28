import { ocrFromFile } from "./engine";
import { classifyDocType, DocType } from "./classify";
import { parseCompanyDoc, ParsedCompany } from "./parseCompany";
import { parseCV, ParsedCV } from "./parseCV";

export type ParsedAny = {
  type: DocType;
  ocrText: string;
  parsed: ParsedCompany | ParsedCV | null;
};

/**
 * Run OCR, classify document type, and parse accordingly.
 * 
 * @param filePath - path to PDF/image
 * @param declaredMime - mimetype if known
 * @param forceType - override classifier (for testing: "cv" | "company_doc")
 */
export async function ocrAndParse(
  filePath: string,
  declaredMime?: string,
  forceType?: DocType
): Promise<ParsedAny> {
  // 1) OCR extraction (multi-language if OCR_LANGS=eng+fra)
  const ocrText = await ocrFromFile(filePath, declaredMime);

  // 2) Detect doc type (unless forced)
  const type: DocType = forceType ?? classifyDocType(ocrText);

  // 3) Parse depending on detected type
  let parsed: ParsedCompany | ParsedCV | null = null;
  if (type === "company_doc") {
    parsed = parseCompanyDoc(ocrText);
  } else if (type === "cv") {
    parsed = parseCV(ocrText);
  }

  return { type, ocrText, parsed };
}

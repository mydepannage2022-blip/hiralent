// backend/src/services/verification/helpers/pdfMeta.ts
import pdfParse from "pdf-parse";

/**
 * Light PDF metadata/structure checks.
 * - Works for PDFs; for images or unknown mime, we skip but don't fail.
 * - Returns a normalized shape used by your pipeline.
 */
export async function checkPdfMetadata(
  buf: Buffer,
  mime?: string
): Promise<{
  passed: boolean;
  score: number;            // 0..1 heuristic
  explanation: string;
  raw: Record<string, any>; // raw details for debugging
}> {
  // Non-PDF files: skip gracefully
  if (!mime || !mime.toLowerCase().includes("pdf")) {
    return {
      passed: true,
      score: 0.5,
      explanation: "Non-PDF file — metadata checks skipped.",
      raw: { mime },
    };
  }

  try {
    const parsed = await pdfParse(buf);

    // Heuristics
    const hasCreator =
      !!(parsed?.info as any)?.Creator || !!(parsed?.metadata as any);
    const pageCount = (parsed?.numpages as number) || 0;
    const hasPages = pageCount > 0;

    const passed = hasPages; // minimal structural check
    const score = Math.min(
      1,
      (hasPages ? 0.6 : 0) + (hasCreator ? 0.2 : 0.1) + 0.2
    );

    return {
      passed,
      score,
      explanation: `PDF parsed: pages=${pageCount}, creator=${hasCreator ? "yes" : "no"}.`,
      raw: {
        info: parsed?.info,
        metadata: parsed?.metadata,
        version: parsed?.version,
        numpages: parsed?.numpages,
      },
    };
  } catch (e: any) {
    return {
      passed: false,
      score: 0,
      explanation: `PDF parse failed: ${e?.message || "unknown error"}`,
      raw: { error: String(e) },
    };
  }
}

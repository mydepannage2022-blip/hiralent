// backend/src/services/verification/docPipeline.ts
import type { PrismaClient } from "@prisma/client";
import { getFileBufferFromS3OrLocal, sha256 } from "./helpers/file";
// import { antivirusScan } from "../upload/antivirus.service"; // optional
import { ocrExtract } from "./helpers/ocr";
import { checkPdfMetadata } from "./helpers/pdfMeta";
import { parseCompanyDoc } from "../ocr/parseCompany";
import { loadExpectedFromRun } from "../verification/loadExpected";
import { saveSignal, finalizeRunDecision } from "./helpers/signals";
import { runFraudHeuristics } from "./helpers/fraud";
import { validateWithRegistry } from "./helpers/registry";

function normalizeCompanyParsed(parsed: any) {
  if (!parsed) return {};
  return {
    company_name:
      parsed.company_name ??
      parsed.companyName ??
      parsed.name ??
      null,
    registration_number:
      parsed.registration_number ??
      parsed.registrationNumber ??
      parsed.rc ??
      parsed.ice ??
      null,
    address:
      parsed.address ??
      parsed.headquarters ??
      parsed.location ??
      null,
  };
}

export async function runDocVerification({
  prisma, runId, document_id
}: { prisma: PrismaClient; runId: string; document_id: string }) {

  // 0) Load doc + expected profile
  const doc = await prisma.uploadedDocument.findUnique({ where: { document_id }});
  if (!doc) throw new Error("UploadedDocument not found");
  const expected = await loadExpectedFromRun(runId); // may be undefined

  // 1) fetch file, hash, (optional AV)
  const buf = await getFileBufferFromS3OrLocal(doc.storage_key);
  const digest = await sha256(buf);
  // const av = await antivirusScan(buf); // optional

  // 2) OCR
  const { text: ocrText, engine: ocrEngine } = await ocrExtract(buf, doc.mime_type);
  await saveSignal(prisma, runId, {
    type: "doc_ocr_text",
    passed: !!ocrText && ocrText.length > 30,
    score: Math.min(1, (ocrText?.length || 0) / 2000),
    raw_payload: { ocrEngine, bytes: buf.length, sha256: digest }
  });

  // 3) PDF metadata
  const meta = await checkPdfMetadata(buf, doc.mime_type);
  await saveSignal(prisma, runId, {
    type: "pdf_metadata_check",
    passed: meta.passed,
    score: meta.score,
    explanation: meta.explanation,
    raw_payload: meta.raw
  });

  // 4) Parse + compare with expected
  const rawParsed = parseCompanyDoc(ocrText || "");
  const parsed = normalizeCompanyParsed(rawParsed);

  let contentScore = 0.5, contentPassed = false, contentExplain = "No expected profile to compare";
  if (expected) {
    const hits = [
      softEq(parsed.company_name, expected.company_name),
      softEq(parsed.registration_number, expected.registration_number),
      softEq(parsed.address, expected.address)
    ];
    const m = hits.filter(Boolean).length;
    contentScore = m / 3;
    contentPassed = contentScore >= 0.6;
    contentExplain = `Matched ${m}/3 fields.`;
  }

  await saveSignal(prisma, runId, {
    type: "doc_content_consistency",
    passed: contentPassed,
    score: contentScore,
    explanation: contentExplain,
    raw_payload: { parsed, expected }
  });

  // 5) Fraud heuristics
  const fraud = runFraudHeuristics({ meta, parsed, digest });
  await saveSignal(prisma, runId, {
    type: "fraud_heuristics",
    passed: fraud.passed,
    score: fraud.score,
    explanation: fraud.explanation,
    raw_payload: fraud.raw
  });

  // 6) Registry validation
  const reg = await validateWithRegistry({ parsed, expected });
  await saveSignal(prisma, runId, {
    type: "registry_lookup",
    passed: reg.passed,
    score: reg.score,
    explanation: reg.explanation,
    raw_payload: reg.raw
  });

  // 7) Final decision
  const { decision, risk_score } = await finalizeRunDecision(prisma, runId);

  return {
    runId,
    signals: { meta, content: parsed, fraud, reg },
    decision,
    risk_score
  };
}

function softEq(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

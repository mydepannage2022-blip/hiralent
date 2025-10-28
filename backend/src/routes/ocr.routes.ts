// backend/src/routes/ocr.routes.ts
import { Router } from "express";
import multer from "multer";
import prisma from "../lib/prisma";
import { ocrAndParse } from "../services/ocr/ocrAndParse"; // ✅ new wrapper (OCR + classify + parse)
import { saveDocOCRSignal } from "../services/verification/signals";
import { loadExpectedFromRun } from "../services/verification/loadExpected";

const upload = multer({ dest: "uploads/" });
const router = Router();

router.post("/", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file" });
    }

    // Optional override of classifier: ?forceType=cv | company_doc
    const forceType =
      (req.body.forceType as "cv" | "company_doc" | undefined) ??
      (req.query.forceType as "cv" | "company_doc" | undefined);

    // 1) OCR + classify + parse (eng+fra handled in engine via OCR_LANGS)
    const { type, ocrText, parsed } = await ocrAndParse(
      req.file.path,
      req.file.mimetype,
      forceType
    );

    // 2) Resolve runId (from multipart body or query)
    const runId =
      (req.body.runId as string | undefined) ??
      (req.query.runId as string | undefined);

    // 3) Build expected profile (only meaningful for company docs)
    let expected:
      | { company_name?: string; registration_number?: string; address?: string }
      | undefined;

    if (type === "company_doc") {
      // 3.a Try DB (via runId)
      if (runId) {
        try {
          expected = await loadExpectedFromRun(runId);
        } catch {
          // ignore DB errors; we might still get ad-hoc expected below
        }
      }

      // 3.b Fallback to ad-hoc expected_* provided by client
      if (!expected) {
        const company_name =
          (req.body.expected_company_name as string | undefined) ??
          (req.query.expected_company_name as string | undefined);
        const registration_number =
          (req.body.expected_registration_number as string | undefined) ??
          (req.query.expected_registration_number as string | undefined);
        const address =
          (req.body.expected_address as string | undefined) ??
          (req.query.expected_address as string | undefined);

        if (company_name || registration_number || address) {
          expected = { company_name, registration_number, address };
        }
      }
    }

    // 4) Persist a VerificationSignal ONLY for company docs (doc_ocr_match)
    //    (Your current saver is designed for company payloads.)
    let signal: any = null;
    if (runId && type === "company_doc") {
      signal = await saveDocOCRSignal({
        prisma,
        runId,
        ocrText,
        parsed,   // ParsedCompany
        expected, // may be undefined; saver handles it
      });
    }

    // 5) Response
    return res.json({
      ok: true,
      type,     // "cv" | "company_doc"
      ocrText,
      parsed,   // ParsedCV or ParsedCompany
      signal,   // null unless runId + company_doc
    });
  } catch (e: any) {
    console.error("[/api/ocr] error:", e);
    return res.status(500).json({ ok: false, error: e.message || "OCR failed" });
  }
});

export default router;

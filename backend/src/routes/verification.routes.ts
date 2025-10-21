// backend/src/routes/verification.docs.routes.ts
import { Router } from "express";
import prisma from "../lib/prisma";
import { runDocVerification } from "../services/verification/docPipeline";

const router = Router();

router.post("/verify", async (req, res) => {
  try {
    const runId = String(req.body.runId || "");
    const document_id = String(req.body.document_id || "");
    if (!runId || !document_id) {
      return res.status(400).json({ ok:false, error:"runId and document_id are required" });
    }

    const out = await runDocVerification({ prisma, runId, document_id });
    return res.json({ ok:true, ...out });
  } catch (e:any) {
    console.error("[verify-docs] error:", e);
    return res.status(500).json({ ok:false, error:e.message || "verification failed" });
  }
});

export default router;

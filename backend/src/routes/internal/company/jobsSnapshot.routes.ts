import { Router, Request, Response } from "express";
import { internalAuth } from "../../../middlewares/internalAuth.middleware";
import { getJobSnapshot } from "../../../services/company/internal/jobSnapshot.service";

const router = Router();

router.get(
  "/jobs/:jobId/snapshot",
  internalAuth,
  async (req: Request, res: Response) => {
    try {
      // ✅ Normalize jobId to a real string
      const raw = (req.params as any).jobId as string | string[] | undefined;
      const jobId = Array.isArray(raw) ? raw[0] : raw;

      if (!jobId || typeof jobId !== "string") {
        return res.status(400).json({ error: "Missing or invalid jobId" });
      }

      const snap = await getJobSnapshot(jobId);

      if (!snap) {
        return res.status(404).json({ error: `Job ${jobId} not found` });
      }

      return res.json({
        entity_type: "JOB",
        entity_id: jobId,
        snapshot: snap,
      });
    } catch (e: any) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  }
);

export default router;

import { Router } from "express";
import { internalAuth } from "../../../middlewares/internalAuth.middleware";
import { getJobSnapshot } from "../../../services/company/internal/jobSnapshot.service";

const router = Router();


router.get(
  "/jobs/:jobId/snapshot",
  internalAuth,
  async (req, res) => {
    try {
      const { jobId } = req.params;

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

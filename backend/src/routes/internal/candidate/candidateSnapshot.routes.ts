import { Router } from "express";
import { internalAuth } from "../../../middlewares/internalAuth.middleware";
import { getCandidateSnapshot } from "../../../services/candidate/internal/candidateSnapshot.service";

const router = Router();


router.get(
  "/candidates/:candidateId/snapshot",
  internalAuth,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      const snap = await getCandidateSnapshot(candidateId);
      if (!snap) {
        return res
          .status(404)
          .json({ error: `Candidate ${candidateId} not found` });
      }

      return res.json({
        entity_type: "CANDIDATE",
        entity_id: candidateId,
        snapshot: snap,
      });
    } catch (e: any) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  }
);

export default router;

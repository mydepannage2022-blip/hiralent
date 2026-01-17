import { PrismaClient } from "@prisma/client";
import { MatchingRecommendationsService } from "../../../services/matching/internal/recommendations.service";

const prisma = new PrismaClient();
const service = new MatchingRecommendationsService(prisma);

export async function upsertJobRecommendations(req: any, res: any) {
  try {
    const { candidate_id, items } = req.body;
    if (!candidate_id) return res.status(400).json({ error: "candidate_id is required" });
    if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array" });

    // validate mandatory fields
    for (const it of items) {
      if (!it.job_id) return res.status(400).json({ error: "each item must have job_id" });
      if (typeof it.match_score !== "number") return res.status(400).json({ error: "each item must have match_score:number" });
      if (it.skill_match === undefined) return res.status(400).json({ error: "each item must have skill_match (Json)" });
    }

    const result = await service.upsertRecommendations({ candidate_id, items });
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}

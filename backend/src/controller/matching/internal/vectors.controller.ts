import { PrismaClient, VectorIndexStatus } from "@prisma/client";
import { MatchingVectorsService } from "../../../services/matching/internal/vectors.service";

const prisma = new PrismaClient();
const service = new MatchingVectorsService(prisma);

export async function upsertCandidateVector(req: any, res: any) {
  try {
    const { candidate_id, qdrant_point_id, embedding_hash, provider, status, error } = req.body;
    if (!candidate_id) return res.status(400).json({ error: "candidate_id is required" });

    const row = await service.upsertCandidateVector({
      candidate_id,
      qdrant_point_id,
      embedding_hash,
      provider,
      status: status as VectorIndexStatus,
      error,
    });

    return res.json({ ok: true, vector: row });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}

export async function upsertJobVector(req: any, res: any) {
  try {
    const { job_id, qdrant_point_id, embedding_hash, provider, status, error } = req.body;
    if (!job_id) return res.status(400).json({ error: "job_id is required" });

    const row = await service.upsertJobVector({
      job_id,
      qdrant_point_id,
      embedding_hash,
      provider,
      status: status as VectorIndexStatus,
      error,
    });

    return res.json({ ok: true, vector: row });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}

// src/controller/matching/internal/recommendations.controller.ts
import { PrismaClient, Prisma } from "@prisma/client";
import { MatchingRecommendationsService } from "../../../services/matching/internal/recommendations.service";

const prisma = new PrismaClient();
const service = new MatchingRecommendationsService(prisma);

export async function upsertJobRecommendations(req: any, res: any) {
  try {
    const { candidate_id, items } = req.body ?? {};

    // ✅ LOG THE INCOMING REQUEST
    console.log("📥 ==========================================================");
    console.log("📥 UPSERT JOB RECOMMENDATIONS REQUEST");
    console.log("📥 Candidate ID:", candidate_id);
    console.log("📥 Items count:", items?.length);
    console.log("📥 First item:", JSON.stringify(items?.[0], null, 2));
    console.log("📥 ==========================================================");

    if (!candidate_id) {
      return res.status(400).json({ success: false, error: "candidate_id is required" });
    }
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: "items must be an array" });
    }

    // validate mandatory fields
    for (const it of items) {
      if (!it?.job_id) {
        console.error("❌ Missing job_id in item:", it);
        return res.status(400).json({ success: false, error: "each item must have job_id" });
      }

      const ms = typeof it.match_score === "string" ? Number(it.match_score) : it.match_score;
      if (typeof ms !== "number" || Number.isNaN(ms)) {
        console.error("❌ Invalid match_score in item:", it);
        return res
          .status(400)
          .json({ success: false, error: "each item must have match_score:number" });
      }
      it.match_score = ms;

      if (it.skill_match === undefined || it.skill_match === null) {
        console.error("❌ Missing skill_match in item:", it);
        return res
          .status(400)
          .json({ success: false, error: "each item must have skill_match (Json)" });
      }
    }

    console.log("✅ Validation passed, calling service...");
    const result = await service.upsertRecommendations({ candidate_id, items });
    console.log("✅ Service returned:", result);

    return res.json({ success: true, data: result });
  } catch (e: any) {
    console.error("🔥 ========================================================");
    console.error("🔥 ERROR IN UPSERT JOB RECOMMENDATIONS");
    console.error("🔥 Request body:", JSON.stringify(req.body, null, 2).slice(0, 3000));
    console.error("🔥 Error:", e);
    console.error("🔥 Error message:", e.message);
    console.error("🔥 Error stack:", e.stack);
    console.error("🔥 ========================================================");

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("🔥 Prisma Error Code:", e.code);
      console.error("🔥 Prisma Meta:", JSON.stringify(e.meta, null, 2));
      
      return res.status(500).json({
        success: false,
        error: e.message,
        prisma: { code: e.code, meta: e.meta },
      });
    }

    if (e instanceof Prisma.PrismaClientValidationError) {
      console.error("🔥 Prisma Validation Error");
      return res.status(500).json({
        success: false,
        error: e.message,
        prisma: { type: "PrismaClientValidationError" },
      });
    }

    return res.status(500).json({
      success: false,
      error: String(e?.message ?? e),
    });
  }
}
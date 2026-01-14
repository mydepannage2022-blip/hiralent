// src/routes/questions/patternQuestions.routes.ts (or wherever you mounted it)
import { Router } from "express";
import { PatternQuestionPipeline } from "../../services/question/pattern-question.pipeline";
import { requireScrapingAccess } from "../../middlewares/scrapingAuth.middleware";

const router = Router();
const pipeline = new PatternQuestionPipeline();

/**
 * POST /api/questions/generate-from-patterns
 * body: { source?: string, limit?: number, difficulties?: ["easy"|"medium"|"hard"] , concurrency?: number, fast?: boolean }
 */
router.post("/generate-from-patterns", requireScrapingAccess, async (req, res) => {
  try {
    const { source, limit, difficulties, concurrency, fast } = req.body ?? {};
    const result = await pipeline.generateFromPatterns({
      source,
      limit,
      difficulties,
      concurrency,
      fast,
    });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Failed" });
  }
});

export default router;

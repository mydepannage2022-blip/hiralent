// src/services/scraping/orchestrator.ts

import { AIServiceClient } from "../ai/ai-service.client";
import { PatternService } from "../patterns/pattern.service";
import { ScrapingLogService } from "./scrapinglog.service";
import type { JobResult, JobOptions } from "./types";

export class ScrapingOrchestrator {
  private aiClient: AIServiceClient;
  private patternService: PatternService;
  private logService: ScrapingLogService;

  constructor() {
    this.aiClient = new AIServiceClient();
    this.patternService = new PatternService();
    this.logService = new ScrapingLogService();
  }

  async executeJob(options: JobOptions): Promise<JobResult> {
    const startTime = Date.now();

    // ✅ allow new optional params (keep backward compatible)
    const {
      source,
      maxItems,
      maxPages,                 // new: pages per track (hackerrank/so/github)
      auto = false,              // new: let AI-service loop until it stops finding new
      hardCap = 5000,           // new: safety
      stopAfterEmptyPages = 3,  // new: stop condition
    } = options as any;

    console.log(
      `🚀 [ORCHESTRATOR] Starting job: ${source} (max_items=${maxItems}, auto=${auto}, max_pages=${maxPages ?? "default"})`
    );

    try {
      console.log(`📡 [ORCHESTRATOR] Calling AI service for ${source}...`);

      // ✅ send extra knobs to AI-service (it can ignore if not supported)
      const scrapeResult = await this.aiClient.scrapeViaSourceEndpoint({
        source,
        max_items: maxItems,
        max_pages: maxPages, // important for hackerrank / stackoverflow / github
        auto,
        hard_cap: hardCap,
        stop_after_empty_pages: stopAfterEmptyPages,
      });

      if (!scrapeResult.success) {
        const error = scrapeResult.error || "Unknown scraping error";
        console.error(`❌ [ORCHESTRATOR] Scraping failed for ${source}:`, error);

        await this.logService.createLog({
          source,
          status: "failed",
          count: 0,
          durationMs: Date.now() - startTime,
          error,
        });

        return {
          success: false,
          source,
          patternsScraped: 0,
          patternsSaved: 0,
          durationMs: Date.now() - startTime,
          error,
          executedAt: new Date(),
        };
      }

      // ✅ Normalize patterns safely
      const patterns = Array.isArray(scrapeResult.patterns) ? scrapeResult.patterns : [];
      const patternsScraped =
        typeof scrapeResult.count === "number" ? scrapeResult.count : patterns.length;

      console.log(`✅ [ORCHESTRATOR] Scraped ${patternsScraped} patterns from ${source}`);
      console.log(`💾 [ORCHESTRATOR] Saving patterns to database...`);

      let patternsSaved = 0;
      if (patterns.length > 0) {
        const saveResult = await this.patternService.upsertMany(patterns);
        patternsSaved = saveResult.upserted;
        console.log(`✅ [ORCHESTRATOR] Saved ${patternsSaved} patterns to database`);
      } else {
        console.warn(`⚠️ [ORCHESTRATOR] No patterns returned from AI-service for ${source}`);
      }
      //  OPTIONAL: generate library questions from the patterns we just stored
      if (process.env.GENERATE_LIBRARY_QUESTIONS === "true" && patternsSaved > 0) {
        try {
          const { PatternQuestionPipeline } = await import("../question/pattern-question.pipeline");
          const pipeline = new PatternQuestionPipeline();

          // You can tune limit here: generate from the latest patterns of this source
          await pipeline.generateFromPatterns({
            source,
            limit: Math.min(patternsSaved, 10),
          });

          console.log(`📚 [ORCHESTRATOR] Library question generation done for ${source}`);
        } catch (e: any) {
          console.warn(`⚠️ [ORCHESTRATOR] Library question generation failed:`, e?.message || e);
        }
      }


      const durationMs = Date.now() - startTime;

      //  IMPORTANT: 0 saved is not necessarily a failure (it can mean "no new")
      const status = "success";
      const errorMsg = null;

      await this.logService.createLog({
        source,
        status,
        count: patternsSaved,
        durationMs,
        error: errorMsg,
      });

      console.log(`🎉 [ORCHESTRATOR] Job completed: ${source} (${durationMs}ms)`);

      return {
        success: true,
        source,
        patternsScraped,
        patternsSaved,
        durationMs,
        executedAt: new Date(),
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error?.message || "Unknown error";

      console.error(`❌ [ORCHESTRATOR] Job failed for ${source}:`, errorMessage);

      await this.logService.createLog({
        source,
        status: "failed",
        count: 0,
        durationMs,
        error: errorMessage,
      });

      return {
        success: false,
        source,
        patternsScraped: 0,
        patternsSaved: 0,
        durationMs,
        error: errorMessage,
        executedAt: new Date(),
      };
    }
  }
}

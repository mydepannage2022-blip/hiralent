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
    const { source, maxItems } = options;

    console.log(`🚀 [ORCHESTRATOR] Starting job: ${source} (max_items=${maxItems})`);

    try {
      // ✅ Use the correct endpoint that returns patterns[]
      console.log(`📡 [ORCHESTRATOR] Calling AI service for ${source}...`);
      const scrapeResult = await this.aiClient.scrapeViaSourceEndpoint({
        source,
        max_items: maxItems,
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

      // ✅ Normalize patterns safely (prevents "undefined")
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
        console.warn(`⚠️ [ORCHESTRATOR] No patterns to save for ${source}`);
      }

      const durationMs = Date.now() - startTime;

      await this.logService.createLog({
        source,
        status: patternsSaved > 0 ? "success" : "failed", // ✅ optional but recommended
        count: patternsSaved,
        durationMs,
        error: patternsSaved > 0 ? null : "No patterns returned from AI-service",
      });

      console.log(`🎉 [ORCHESTRATOR] Job completed: ${source} (${durationMs}ms)`);

      return {
        success: patternsSaved > 0,
        source,
        patternsScraped,
        patternsSaved,
        durationMs,
        executedAt: new Date(),
        ...(patternsSaved > 0 ? {} : { error: "No patterns returned from AI-service" }),
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

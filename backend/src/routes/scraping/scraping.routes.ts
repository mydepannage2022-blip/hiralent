// src/routes/scraping/scheduler.routes.ts

import { Router } from "express";
import { getScheduler } from "../../services/scraping/scraping-scheduler";
import type { Source } from "../../services/ai/ai-service.client";
import { requireScrapingAccess } from "../../middlewares/scrapingAuth.middleware";

const router = Router();

const validSources: Source[] = ["leetcode", "github", "stackoverflow", "hackerrank"];

/**
 * GET /api/v1/scraping/scheduler/status
 * Get scheduler status
 */
router.get("/status", requireScrapingAccess, (req, res) => {
  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();

    return res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to get scheduler status",
    });
  }
});

/**
 * POST /api/v1/scraping/scheduler/trigger/:source
 * Manually trigger a scraping job
 */
router.post("/trigger/:source", requireScrapingAccess, async (req, res) => {
  try {
    const source = req.params.source as Source;

    if (!validSources.includes(source)) {
      return res.status(400).json({
        success: false,
        error: `Invalid source. Must be one of: ${validSources.join(", ")}`,
      });
    }

    const scheduler = getScheduler();

    // Trigger job (runs async, don't wait for full completion)
    scheduler.trigger(source).catch((error) => {
      console.error(`❌ Manual trigger failed for ${source}:`, error);
    });

    return res.json({
      success: true,
      message: `${source} scraping job triggered`,
      source,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to trigger job",
    });
  }
});

/**
 * POST /api/v1/scraping/scheduler/start
 * Start the scheduler (if stopped)
 */
router.post("/start", requireScrapingAccess, (req, res) => {
  try {
    const scheduler = getScheduler();
    scheduler.start();

    return res.json({
      success: true,
      message: "Scheduler started",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to start scheduler",
    });
  }
});

/**
 * POST /api/v1/scraping/scheduler/stop
 * Stop the scheduler
 */
router.post("/stop", requireScrapingAccess, (req, res) => {
  try {
    const scheduler = getScheduler();
    scheduler.stop();

    return res.json({
      success: true,
      message: "Scheduler stopped",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to stop scheduler",
    });
  }
});

export default router;

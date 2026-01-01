// src/services/scraping/scraping-scheduler.ts

import cron from "node-cron";
import { ScrapingOrchestrator } from "./orchestrator";
import { getSchedulerConfig } from "./config";
import type { Source } from "../ai/ai-service.client";
import type { SchedulerStatus } from "./types";

/**
 * ScrapingScheduler
 * 
 * Manages Node-Cron scheduled jobs for automated scraping.
 * Each source (LeetCode, GitHub, etc.) runs on its own schedule.
 */
export class ScrapingScheduler {
  private orchestrator: ScrapingOrchestrator;
  private config: ReturnType<typeof getSchedulerConfig>;
  private jobs: Map<Source, cron.ScheduledTask>;
  private isRunning: Map<Source, boolean>;
  private lastRun: Map<Source, Date>;

  constructor() {
    this.orchestrator = new ScrapingOrchestrator();
    this.config = getSchedulerConfig();
    this.jobs = new Map();
    this.isRunning = new Map();
    this.lastRun = new Map();

    console.log("🔧 [SCHEDULER] ScrapingScheduler initialized");
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (!this.config.enabled) {
      console.log("⏸️  [SCHEDULER] Scheduler is disabled (SCRAPING_SCHEDULER_ENABLED=false)");
      return;
    }

    console.log("🚀 [SCHEDULER] Starting all scheduled jobs...");

    // Schedule each source
    this.scheduleLeetCode();
    this.scheduleGitHub();
    this.scheduleStackOverflow();
    this.scheduleHackerRank();

    console.log(`✅ [SCHEDULER] Started ${this.jobs.size} scheduled jobs`);
    this.printSchedule();
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log("🛑 [SCHEDULER] Stopping all scheduled jobs...");

    this.jobs.forEach((job, source) => {
      job.stop();
      console.log(`   ✓ Stopped: ${source}`);
    });

    this.jobs.clear();
    console.log("✅ [SCHEDULER] All jobs stopped");
  }

  /**
   * Manually trigger a job (for testing or admin control)
   */
  async trigger(source: Source): Promise<void> {
    console.log(`🔧 [SCHEDULER] Manual trigger: ${source}`);

    const sourceConfig = this.config.sources[source];
    if (!sourceConfig) {
      throw new Error(`Unknown source: ${source}`);
    }

    await this.executeJob(source, sourceConfig.maxItems, sourceConfig.maxPages);
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    const activeJobs = Array.from(this.jobs.entries()).map(([source, task]) => {
      const sourceConfig = this.config.sources[source];
      return {
        source,
        schedule: sourceConfig.schedule,
        enabled: sourceConfig.enabled,
        lastRun: this.lastRun.get(source),
      };
    });

    return {
      isRunning: this.jobs.size > 0,
      activeJobs,
      stats: {
        totalJobs: this.jobs.size,
        successfulJobs: 0, // TODO: Track from logs
        failedJobs: 0, // TODO: Track from logs
      },
    };
  }

  // =========================================================================
  // PRIVATE METHODS - Job Schedulers
  // =========================================================================

  private scheduleLeetCode(): void {
    const config = this.config.sources.leetcode;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] LeetCode job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("leetcode", config.maxItems, config.maxPages);
    });

    this.jobs.set("leetcode", job);
    console.log(`📅 [SCHEDULER] LeetCode scheduled: ${config.schedule} (${config.maxItems} items)`);
  }

  private scheduleGitHub(): void {
    const config = this.config.sources.github;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] GitHub job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("github", config.maxItems, config.maxPages);
    });

    this.jobs.set("github", job);
    console.log(`📅 [SCHEDULER] GitHub scheduled: ${config.schedule} (${config.maxItems} items)`);
  }

  private scheduleStackOverflow(): void {
    const config = this.config.sources.stackoverflow;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] StackOverflow job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("stackoverflow", config.maxItems, config.maxPages);
    });

    this.jobs.set("stackoverflow", job);
    console.log(`📅 [SCHEDULER] StackOverflow scheduled: ${config.schedule} (${config.maxItems} items)`);
  }

  private scheduleHackerRank(): void {
    const config = this.config.sources.hackerrank;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] HackerRank job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("hackerrank", config.maxItems, config.maxPages);
    });

    this.jobs.set("hackerrank", job);
    console.log(`📅 [SCHEDULER] HackerRank scheduled: ${config.schedule} (${config.maxItems} items)`);
  }

  // =========================================================================
  // PRIVATE METHODS - Job Execution
  // =========================================================================

  private async executeJob(
    source: Source,
    maxItems: number,
    maxPages?: number
  ): Promise<void> {
    // Prevent concurrent execution
    if (this.isRunning.get(source)) {
      console.log(`⚠️  [SCHEDULER] ${source} job already running, skipping...`);
      return;
    }

    this.isRunning.set(source, true);
    this.lastRun.set(source, new Date());

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting ${source.toUpperCase()} Scheduled Job
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    try {
      const result = await this.orchestrator.executeJob({
        source,
        maxItems,
        maxPages,
      });

      if (result.success) {
        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ${source.toUpperCase()} Job Completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 Patterns Scraped: ${result.patternsScraped}
💾 Patterns Saved: ${result.patternsSaved}
⏱️  Duration: ${(result.durationMs / 1000).toFixed(2)}s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      } else {
        console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ${source.toUpperCase()} Job Failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: ${result.error}
⏱️  Duration: ${(result.durationMs / 1000).toFixed(2)}s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      }
    } catch (error: any) {
      console.error(`❌ [SCHEDULER] Unexpected error in ${source} job:`, error);
    } finally {
      this.isRunning.set(source, false);
    }
  }

  /**
   * Print current schedule
   */
  private printSchedule(): void {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Active Schedules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    if (this.config.sources.leetcode.enabled) {
      console.log(`  🔹 LeetCode: ${this.config.sources.leetcode.schedule} (${this.config.sources.leetcode.maxItems} items)`);
    }
    if (this.config.sources.github.enabled) {
      console.log(`  🔹 GitHub: ${this.config.sources.github.schedule} (${this.config.sources.github.maxItems} items)`);
    }
    if (this.config.sources.stackoverflow.enabled) {
      console.log(`  🔹 StackOverflow: ${this.config.sources.stackoverflow.schedule} (${this.config.sources.stackoverflow.maxItems} items)`);
    }
    if (this.config.sources.hackerrank.enabled) {
      console.log(`  🔹 HackerRank: ${this.config.sources.hackerrank.schedule} (${this.config.sources.hackerrank.maxItems} items)`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

// =========================================================================
// SINGLETON INSTANCE
// =========================================================================

let schedulerInstance: ScrapingScheduler | null = null;

export function getScheduler(): ScrapingScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new ScrapingScheduler();
  }
  return schedulerInstance;
}
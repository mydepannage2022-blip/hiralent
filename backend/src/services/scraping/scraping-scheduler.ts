// src/services/scraping/scraping-scheduler.ts

import cron, { type ScheduledTask } from "node-cron";
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
  private jobs: Map<Source, ScheduledTask>;
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

    await this.executeJob(source, sourceConfig);
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
      await this.executeJob("leetcode", config);
    });

    this.jobs.set("leetcode", job);
    console.log(`📅 [SCHEDULER] LeetCode scheduled: ${config.schedule} (${config.maxItems} items, auto=${config.auto})`);
  }

  private scheduleGitHub(): void {
    const config = this.config.sources.github;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] GitHub job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("github", config);
    });

    this.jobs.set("github", job);
    console.log(`📅 [SCHEDULER] GitHub scheduled: ${config.schedule} (${config.maxItems} items, auto=${config.auto})`);
  }

  private scheduleStackOverflow(): void {
    const config = this.config.sources.stackoverflow;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] StackOverflow job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("stackoverflow", config);
    });

    this.jobs.set("stackoverflow", job);
    console.log(`📅 [SCHEDULER] StackOverflow scheduled: ${config.schedule} (${config.maxItems} items, auto=${config.auto})`);
  }

  private scheduleHackerRank(): void {
    const config = this.config.sources.hackerrank;
    if (!config.enabled) {
      console.log("⏭️  [SCHEDULER] HackerRank job disabled, skipping");
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      await this.executeJob("hackerrank", config);
    });

    this.jobs.set("hackerrank", job);
    console.log(`📅 [SCHEDULER] HackerRank scheduled: ${config.schedule} (${config.maxItems} items, auto=${config.auto})`);
  }

  // =========================================================================
  // PRIVATE METHODS - Job Execution
  // =========================================================================

  private async executeJob(
    source: Source,
    config: any
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
      // ✅ PASS ALL CONFIG PARAMS to orchestrator
      const result = await this.orchestrator.executeJob({
        source,
        maxItems: config.maxItems,
        maxPages: config.maxPages,
        auto: config.auto,           // ✅ Critical: pass auto param
        hardCap: config.hardCap,     // ✅ Optional: pass hardCap
        stopAfterEmptyPages: config.stopAfterEmptyPages, // ✅ Optional
      });

      if (result.success) {
        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ${source.toUpperCase()} Job Completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 Patterns Scraped: ${result.patternsScraped}
💾 Patterns Saved: ${result.patternsSaved}
⏱️  Duration: ${(result.durationMs / 1000).toFixed(2)}s
${config.auto ? "🔁 Auto Mode: Yes" : "🔁 Auto Mode: No"}
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

    const sources = [
      { key: "leetcode", name: "LeetCode" },
      { key: "github", name: "GitHub" },
      { key: "stackoverflow", name: "StackOverflow" },
      { key: "hackerrank", name: "HackerRank" },
    ] as const;

    sources.forEach(({ key, name }) => {
      const config = this.config.sources[key];
      if (config.enabled) {
        console.log(`  🔹 ${name}: ${config.schedule}`);
        console.log(`     Items: ${config.maxItems}, Auto: ${config.auto}, Pages: ${config.maxPages || 'N/A'}`);
      }
    });

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
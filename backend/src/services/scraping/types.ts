// src/services/scraping/types.ts

import type { Source } from "../ai/ai-service.client";

/**
 * Job execution result from workflow
 */
export interface JobResult {
  success: boolean;
  source: Source;
  patternsScraped: number;
  patternsSaved: number;
  durationMs: number;
  error?: string;
  executedAt: Date;
}

/**
 * Source configuration for scheduling
 */
export interface SourceConfig {
  enabled: boolean;
  schedule: string;        // Cron expression

  /**
   * Chunk size for AI-service call.
   * In auto mode, AI-service may loop internally until it stops finding new items,
   * but it will request in chunks of maxItems.
   */
  maxItems: number;

  /**
   * For GitHub / StackOverflow / HackerRank pagination (pages per track / pages per query)
   */
  maxPages?: number;

  /**
   * Enable AI-service "auto" mode: scrape until no new items (with safety caps).
   */
  auto?: boolean;

  /**
   * Safety cap to prevent infinite scraping loops on AI-service side.
   */
  hardCap?: number;

  /**
   * Stop auto mode after N consecutive empty batches/pages.
   */
  stopAfterEmptyPages?: number;

  rateLimit: number;       // Seconds between requests (scheduler-side pacing)
}

/**
 * Complete scheduler configuration
 */
export interface SchedulerConfig {
  enabled: boolean;
  sources: {
    leetcode: SourceConfig;
    github: SourceConfig;
    stackoverflow: SourceConfig;
    hackerrank: SourceConfig;
  };
}

/**
 * Job execution options (what executeJob receives)
 */
export interface JobOptions {
  source: Source;
  maxItems: number;

  // optional knobs
  maxPages?: number;
  auto?: boolean;
  hardCap?: number;
  stopAfterEmptyPages?: number;
}

/**
 * Scheduler status
 */
export interface SchedulerStatus {
  isRunning: boolean;
  activeJobs: Array<{
    source: Source;
    schedule: string;
    enabled: boolean;
    lastRun?: Date;
  }>;
  stats: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
  };
}

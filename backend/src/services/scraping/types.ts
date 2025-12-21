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
  maxItems: number;        // Max patterns to scrape
  maxPages?: number;       // For GitHub/HackerRank
  rateLimit: number;       // Seconds between requests
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
 * Job execution options
 */
export interface JobOptions {
  source: Source;
  maxItems: number;
  maxPages?: number;
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
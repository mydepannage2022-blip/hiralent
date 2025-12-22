// src/services/scraping/config.ts
import type { SchedulerConfig } from "./types";

// Helper: parse numbers safely
const num = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Helper: parse booleans safely
const bool = (v: any, fallback: boolean) => {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase().trim();
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return fallback;
};

export const defaultSchedulerConfig: SchedulerConfig = {
  enabled: process.env.SCRAPING_SCHEDULER_ENABLED === "true",

  sources: {
    leetcode: {
      enabled: true,
      schedule: process.env.CRON_LEETCODE || "0 2 * * *",

      // chunk size (not total)
      maxItems: num(process.env.LEETCODE_MAX_PROBLEMS, 50),

      // ✅ auto scrape until exhausted
      auto: bool(process.env.LEETCODE_AUTO, true),
      hardCap: num(process.env.LEETCODE_HARD_CAP, 5000),
      stopAfterEmptyPages: num(process.env.LEETCODE_STOP_AFTER_EMPTY, 3),

      rateLimit: 2,
    },

    github: {
      enabled: true,
      schedule: process.env.CRON_GITHUB || "0 3 * * 0",

      // chunk size (not total)
      maxItems: num(process.env.GITHUB_MAX_PROBLEMS, 100),

      // For github, we reuse maxPages as "max_repos"
      maxPages: num(process.env.GITHUB_MAX_PAGES, 5),

      // ✅ auto scrape until exhausted
      auto: bool(process.env.GITHUB_AUTO, true),
      hardCap: num(process.env.GITHUB_HARD_CAP, 5000),
      stopAfterEmptyPages: num(process.env.GITHUB_STOP_AFTER_EMPTY, 3),

      rateLimit: 1,
    },

    stackoverflow: {
      enabled: true,
      schedule: process.env.CRON_STACKOVERFLOW || "0 4 * * *",

      maxItems: num(process.env.STACKOVERFLOW_MAX_PROBLEMS, 30),
      maxPages: num(process.env.STACKOVERFLOW_MAX_PAGES, 2),

      auto: bool(process.env.STACKOVERFLOW_AUTO, true),
      hardCap: num(process.env.STACKOVERFLOW_HARD_CAP, 5000),
      stopAfterEmptyPages: num(process.env.STACKOVERFLOW_STOP_AFTER_EMPTY, 3),

      rateLimit: 3,
    },

    hackerrank: {
      enabled: true,
      schedule: process.env.CRON_HACKERRANK || "0 5 * * 1",

      maxItems: num(process.env.HACKERRANK_MAX_PROBLEMS, 50),
      maxPages: num(process.env.HACKERRANK_MAX_PAGES, 10), // pages per track

      auto: bool(process.env.HACKERRANK_AUTO, true),
      hardCap: num(process.env.HACKERRANK_HARD_CAP, 5000),
      stopAfterEmptyPages: num(process.env.HACKERRANK_STOP_AFTER_EMPTY, 3),

      rateLimit: 2,
    },
  },
};

export function getSchedulerConfig(): SchedulerConfig {
  return {
    ...defaultSchedulerConfig,
    enabled: process.env.SCRAPING_SCHEDULER_ENABLED === "true",
  };
}

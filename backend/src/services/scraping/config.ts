// src/services/scraping/config.ts
import type { SchedulerConfig } from "./types";

// Helper: parse numbers safely
const num = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const defaultSchedulerConfig: SchedulerConfig = {
  enabled: process.env.SCRAPING_SCHEDULER_ENABLED === "true",

  sources: {
    leetcode: {
      enabled: true,
      schedule: process.env.CRON_LEETCODE || "0 2 * * *",
      maxItems: num(process.env.LEETCODE_MAX_PROBLEMS, 50),
      rateLimit: 2,
    },

    github: {
      enabled: true,
      schedule: process.env.CRON_GITHUB || "0 3 * * 0",
      maxItems: num(process.env.GITHUB_MAX_PROBLEMS, 100),
      maxPages: 3,
      rateLimit: 1,
    },

    stackoverflow: {
      enabled: true,
      schedule: process.env.CRON_STACKOVERFLOW || "0 4 * * *",
      maxItems: num(process.env.STACKOVERFLOW_MAX_PROBLEMS, 30),
      maxPages: 2,
      rateLimit: 3,
    },

    hackerrank: {
      enabled: true,
      schedule: process.env.CRON_HACKERRANK || "0 5 * * 1",
      maxItems: num(process.env.HACKERRANK_MAX_PROBLEMS, 50),
      maxPages: 3,
      rateLimit: 2,
    },
  },
};

export function getSchedulerConfig(): SchedulerConfig {
  // returning a fresh object ensures env changes apply on restart
  return {
    ...defaultSchedulerConfig,
    enabled: process.env.SCRAPING_SCHEDULER_ENABLED === "true",
  };
}

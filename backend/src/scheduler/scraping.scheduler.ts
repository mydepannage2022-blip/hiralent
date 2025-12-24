import cron from "node-cron";
import axios from "axios";

type Source = "leetcode" | "stackoverflow" | "github" | "hackerrank";

export type PatternDTO = {
  source: string;
  source_id: string;
  source_url: string;
  pattern: string;
  domain: string;
  difficulty: string;
  tags?: string[];
  constraints?: any;
  input_structure?: any;
  extracted_at?: number; // unix seconds
};

type ScrapeResponse = {
  success: boolean;
  patterns?: PatternDTO[];   // ✅ array
  count?: number;
  error?: string;
};

type SchedulerConfig = {
  aiServiceUrl: string;
  cron: Record<Source, string>;
  maxProblems: Record<Source, number>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callScrapeEndpoint(
  aiServiceUrl: string,
  source: Source,
  maxItems: number
): Promise<ScrapeResponse> {
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 180000);

  // ✅ Match your FastAPI route style:
  // POST /scraping/{source}/run?max_items=5
  const url = `${aiServiceUrl}/scraping/${source}/run?max_items=${maxItems}`;

  const res = await axios.post(url, null, {
    timeout: timeoutMs,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });

  if (res.status >= 200 && res.status < 300) {
    return res.data as ScrapeResponse;
  }

  return {
    success: false,
    error: typeof res.data === "string" ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500),
  };
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  backoffMs = 10_000
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) await sleep(backoffMs * (i + 1));
    }
  }
  throw lastErr;
}

export class ScrapingScheduler {
  private config: SchedulerConfig;

  constructor(config: SchedulerConfig) {
    this.config = config;
  }

  start() {
    cron.schedule(this.config.cron.leetcode, async () => this.executeJob("leetcode"));
    cron.schedule(this.config.cron.stackoverflow, async () => this.executeJob("stackoverflow"));
    cron.schedule(this.config.cron.github, async () => this.executeJob("github"));
    cron.schedule(this.config.cron.hackerrank, async () => this.executeJob("hackerrank"));

    console.log("✅ ScrapingScheduler started with node-cron.");
    console.log("⏰ Cron schedules:", this.config.cron);
  }

  async executeJob(source: Source) {
    const maxItems = this.config.maxProblems[source];
    console.log(`🚀 [Scheduler] Running ${source} job (max_items=${maxItems})...`);

    const startedAt = Date.now();

    const result = await runWithRetry(
      () => callScrapeEndpoint(this.config.aiServiceUrl, source, maxItems),
      2,
      10_000
    );

    const durationMs = Date.now() - startedAt;

    const patterns = Array.isArray(result.patterns) ? result.patterns : [];
    const count = typeof result.count === "number" ? result.count : patterns.length;

    if (result.success && patterns.length > 0) {
      console.log(`✅ [Scheduler] ${source} OK | patterns=${count} | duration_ms=${durationMs}`);
    } else {
      console.error(`❌ [Scheduler] ${source} FAILED/EMPTY | duration_ms=${durationMs}`, result.error ?? result);
    }

    return { result, durationMs };
  }
}

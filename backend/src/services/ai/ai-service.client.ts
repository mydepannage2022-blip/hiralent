import axios from "axios";

export type Source = "leetcode" | "stackoverflow" | "github" | "hackerrank";

export type PatternDTO = {
  source: string;
  source_id: string;
  source_url: string;
  difficulty: string;
  tags: string[];
  pattern: string;
  domain: string;
  input_structure: any;
  constraints: any;
  extracted_at: number; // unix seconds
};

export type ScrapeResponseDTO = {
  success: boolean;
  source?: string;
  patterns?: PatternDTO[];
  count?: number;
  duration_ms?: number;
  errors?: any[];
  error?: string;

  // sometimes your API returns job_log
  job_log?: any;
  metadata?: any;
};

type ClientConfig = {
  baseUrl?: string;     // e.g. http://localhost:8000
  timeoutMs?: number;   // default 60s
};

export class AIServiceClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.AI_SERVICE_URL || "http://localhost:8000";
    this.timeoutMs = config.timeoutMs ?? Number(process.env.AI_SERVICE_TIMEOUT_MS || 60_000);
  }

  /**
   * Generic endpoint (matches your scheduler current code):
   * POST {AI_SERVICE_URL}/scrape with { source, max_problems, max_pages? }
   */
  async scrapeViaGenericEndpoint(params: {
    source: Source;
    max_problems: number;
    max_pages?: number;
  }): Promise<ScrapeResponseDTO> {
    const url = `${this.baseUrl}/scrape`;
    const payload: any = {
      source: params.source,
      max_problems: params.max_problems,
    };
    if (params.max_pages) payload.max_pages = params.max_pages;

    const res = await axios.post(url, payload, {
      timeout: this.timeoutMs,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });

    if (res.status >= 200 && res.status < 300) {
      return res.data as ScrapeResponseDTO;
    }

    return {
      success: false,
      source: params.source,
      patterns: [],
      count: 0,
      error: `AI-service HTTP ${res.status}`,
      metadata: { response: typeof res.data === "string" ? res.data.slice(0, 1000) : res.data },
    };
  }

  /**
   * Per-source endpoint:
   * POST {AI_SERVICE_URL}/scraping/{source}/run?max_items=...
   */
  async scrapeViaSourceEndpoint(params: {
    source: Source;
    max_items: number;
  }): Promise<ScrapeResponseDTO> {
    const url = `${this.baseUrl}/scraping/${params.source}/run?max_items=${params.max_items}`;

    const res = await axios.post(url, null, {
      timeout: this.timeoutMs,
      validateStatus: () => true,
    });

    if (res.status >= 200 && res.status < 300) {
      return res.data as ScrapeResponseDTO;
    }

    return {
      success: false,
      source: params.source,
      patterns: [],
      count: 0,
      error: `AI-service HTTP ${res.status}`,
      metadata: { response: typeof res.data === "string" ? res.data.slice(0, 1000) : res.data },
    };
  }
}

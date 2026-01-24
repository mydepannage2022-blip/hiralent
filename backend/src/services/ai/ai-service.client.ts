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
export type PatternToQuestionRequestDTO = {
  source: string;
  sourceId: string;
  difficulty: "easy" | "medium" | "hard";
  pattern: string;
  domain: string;
  tags: string[];
  constraints: any;
  inputStructure: any;

  // optional speed knob (AI-service supports it)
  fast?: boolean;
};

export type PatternToQuestionResponseDTO = {
  success: boolean;
  question?: any;
  error?: string;
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
 * Per-source endpoint with ALL parameters:
 * POST {AI_SERVICE_URL}/scraping/{source}/run with full parameters
 */
async scrapeViaSourceEndpoint(params: {
  source: Source;
  max_items: number;
  max_pages?: number;
  auto?: boolean;           //  Add this
  hard_cap?: number;        //  Add this
  stop_after_empty_pages?: number;  //  Add this
}): Promise<ScrapeResponseDTO> {
  //  FIX: Use POST with body instead of query params
  const url = `${this.baseUrl}/scraping/${params.source}/run`;
  
  // Build the request body with all parameters
  const requestBody = {
    max_items: params.max_items,
    max_pages: params.max_pages,
    auto: params.auto,                    //  Pass auto parameter
    hard_cap: params.hard_cap,            //  Pass hard_cap
    stop_after_empty_pages: params.stop_after_empty_pages, //  Pass stop_after_empty_pages
    max_repos: params.max_pages,          // For GitHub specifically
  };

  const res = await axios.post(url, requestBody, {
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
    error: `AI-service HTTP ${res.status}: ${res.statusText}`,
    metadata: { response: typeof res.data === "string" ? res.data.slice(0, 1000) : res.data },
  };
  
}

async generateQuestionFromPattern(
  payload: PatternToQuestionRequestDTO
): Promise<PatternToQuestionResponseDTO> {
  const url = `${this.baseUrl}/questions/from-pattern`;

  const res = await axios.post(url, payload, {
    timeout: this.timeoutMs,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });

  if (res.status >= 200 && res.status < 300) {
    return res.data as PatternToQuestionResponseDTO;
  }

  return {
    success: false,
    error: `AI-service HTTP ${res.status}: ${res.statusText}`,
  };
  }
}

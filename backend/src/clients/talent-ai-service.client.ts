import axios, { AxiosInstance } from "axios";
import { internalTokenHeader } from "../config/internalServiceAuth";

/**
 * Client HTTP vers le Talent AI Service (job-creation-ai)
 * Ce client est utilisé UNIQUEMENT côté backend
 */
class TalentAIServiceClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.TALENT_AI_BASE_URL || "http://localhost:8003";

    this.client = axios.create({
      baseURL,
      timeout: 20_000,
      headers: { "Content-Type": "application/json" },
    });

    // Attach the internal service token (X-API-Token) per request — read at call time so
    // it works regardless of import/dotenv ordering.
    this.client.interceptors.request.use((cfg) => {
      Object.assign(cfg.headers, internalTokenHeader());
      return cfg;
    });
  }

  /**
   * STEP 1 – Basics suggestions
   */
  async step1Suggest(payload: {
    jobTitle?: string;
    location?: string;
    department?: string;
  }) {
    const { data } = await this.client.post(
      "/api/v1/job-ai/step1/suggest",
      payload
    );
    return data;
  }

  /**
   * STEP 2 – Generate job description
   */
  async step2Generate(payload: {
    jobTitle: string;
    location: string;
    department: string;
    jobType: string;
    salaryRange: string;
    tone: "formal" | "friendly" | "concise";
    language: "en" | "fr";
  }) {
    const { data } = await this.client.post(
      "/api/v1/job-ai/step2/generate",
      payload
    );
    return data;
  }

  /**
   * Improve / Rewrite job description
   */
  async improveDescription(payload: {
    text: string;
    instruction: string;
    tone: "formal" | "friendly" | "concise";
    language: "en" | "fr";
  }) {
    const { data } = await this.client.post(
      "/api/v1/job-ai/description/improve",
      payload
    );
    return data;
  }
}

export const talentAIServiceClient = new TalentAIServiceClient();

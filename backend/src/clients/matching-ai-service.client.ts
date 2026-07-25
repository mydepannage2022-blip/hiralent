// src/clients/matching-ai-service.client.ts
import axios, { AxiosInstance } from "axios";
import { requireEnv } from "../config/requireEnv";

export class MatchingAIServiceClient {
  private client: AxiosInstance;

  constructor(baseURL: string, serviceKey: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": serviceKey,
      },
    });
  }

  async triggerMatching(payload: {
    event_id: string;
    event_type: "JOB_UPDATED" | "CANDIDATE_UPDATED";
    entity_type: "JOB" | "CANDIDATE";
    entity_id: string;
    payload?: any;
    dedupe_key?: string;
  }) {
    const { data } = await this.client.post("/internal/matching/events", payload);
    return data;
  }
}

export function createMatchingAIServiceClient() {
  const baseURL = process.env.MATCHING_AI_BASE_URL || "http://localhost:8011";
  // No empty-string fallback: an unauthenticated client would fail at the AI service
  // anyway, so surface the misconfiguration here instead of silently sending no key.
  const key = requireEnv("INTERNAL_SERVICE_KEY");
  return new MatchingAIServiceClient(baseURL, key);
}

// src/services/question/vetting.service.ts
// Uses the Node built-in global `fetch` (Node 18+; project runs Node 24) — no `node-fetch`
// dependency needed. All usage here is standard Fetch API (res.ok/status/json/text).

import { internalTokenHeader } from '../../config/internalServiceAuth';

const VETTING_SERVICE_URL =
  process.env.AI_VETTING_URL || 'http://localhost:8000'; // adapte à ton FastAPI

export interface VettingQuestionPayload {
  id: string;
  problem_statement: string;
  canonical_solution: string;
  language: string;
  test_cases: Array<{ input: string; expected_output: string; is_hidden?: boolean }>;
}

export class VettingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = VETTING_SERVICE_URL;
    console.log(`🧪 VettingService initialized with baseUrl=${this.baseUrl}`);
  }

  async healthCheck() {
    const res = await fetch(`${this.baseUrl}/vetting/health`, { headers: { ...internalTokenHeader() } });
    if (!res.ok) throw new Error(`Vetting health failed: ${res.status}`);
    return res.json() as Promise<any>; // dynamic JSON from the Python vetting FastAPI
  }

  async vetSingleQuestion(question: VettingQuestionPayload) {
    const res = await fetch(`${this.baseUrl}/vetting/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalTokenHeader() },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Vetting failed: ${res.status} - ${txt}`);
    }

    return res.json() as Promise<any>; // dynamic JSON from the Python vetting FastAPI // { success, result }
  }

  async vetBatch(questions: VettingQuestionPayload[]) {
    const res = await fetch(`${this.baseUrl}/vetting/batch-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalTokenHeader() },
      body: JSON.stringify({ questions }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Batch vetting failed: ${res.status} - ${txt}`);
    }

    return res.json() as Promise<any>; // dynamic JSON from the Python vetting FastAPI // { success, results, stats }
  }

  async stats() {
    const res = await fetch(`${this.baseUrl}/vetting/stats`, { headers: { ...internalTokenHeader() } });
    if (!res.ok) throw new Error(`Vetting stats failed: ${res.status}`);
    return res.json() as Promise<any>; // dynamic JSON from the Python vetting FastAPI
  }
}

export const vettingService = new VettingService();

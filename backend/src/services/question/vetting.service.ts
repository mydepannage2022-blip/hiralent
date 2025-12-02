// src/services/question/vetting.service.ts
import fetch from 'node-fetch';

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
    const res = await fetch(`${this.baseUrl}/vetting/health`);
    if (!res.ok) throw new Error(`Vetting health failed: ${res.status}`);
    return res.json();
  }

  async vetSingleQuestion(question: VettingQuestionPayload) {
    const res = await fetch(`${this.baseUrl}/vetting/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Vetting failed: ${res.status} - ${txt}`);
    }

    return res.json(); // { success, result }
  }

  async vetBatch(questions: VettingQuestionPayload[]) {
    const res = await fetch(`${this.baseUrl}/vetting/batch-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Batch vetting failed: ${res.status} - ${txt}`);
    }

    return res.json(); // { success, results, stats }
  }

  async stats() {
    const res = await fetch(`${this.baseUrl}/vetting/stats`);
    if (!res.ok) throw new Error(`Vetting stats failed: ${res.status}`);
    return res.json();
  }
}

export const vettingService = new VettingService();

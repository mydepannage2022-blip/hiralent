// backend/src/services/externalClients.ts
import dotenv from "dotenv";
import axios from "axios";
import prisma from "../lib/prisma";

dotenv.config();

// ✅ mock mode ONLY when explicitly enabled
const MOCK_MODE =
  (process.env.EXTERNALS_MOCK || "").toLowerCase() === "1" ||
  (process.env.EXTERNALS_MOCK || "").toLowerCase() === "true";

const WAFAA_BASE = process.env.WAFAA_BASE_URL || "";
const WAFAA_KEY = process.env.WAFAA_API_KEY || "";
const IHSN_BASE = process.env.IHSSANE_BASE_URL || "";
const IHSN_KEY = process.env.IHSSANE_API_KEY || "";

export type QuestionTestCase = {
  input: string;
  expected_output?: string | null;
  output?: string | null;
};

function toStr(v: any): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function normalizeSuite(raw: any): QuestionTestCase[] {
  if (!raw) return [];

  // DB shape: [{ input, output }]
  if (Array.isArray(raw)) {
    return raw.map((tc: any) => ({
      input: toStr(tc?.input ?? tc?.stdin ?? tc?.in ?? tc?.args ?? ""),
      output: tc?.output ?? tc?.out ?? tc?.expected ?? tc?.expected_output ?? null,
      expected_output: tc?.expected_output ?? tc?.expected ?? tc?.output ?? tc?.out ?? null,
    }));
  }

  // Shape: { inputs: [], outputs: [] }
  if (Array.isArray(raw?.inputs) && Array.isArray(raw?.outputs)) {
    const n = Math.min(raw.inputs.length, raw.outputs.length);
    return Array.from({ length: n }).map((_, i) => ({
      input: toStr(raw.inputs[i]),
      expected_output: raw.outputs[i] ?? null,
      output: raw.outputs[i] ?? null,
    }));
  }

  // Shape: { testCases: [...] } or { cases: [...] }
  if (Array.isArray(raw?.testCases)) return normalizeSuite(raw.testCases);
  if (Array.isArray(raw?.cases)) return normalizeSuite(raw.cases);

  return [];
}

async function getFromDb(questionId: string): Promise<QuestionTestCase[]> {
  // Try normal Prisma model name
  try {
    const q = await (prisma as any).question.findUnique({
      where: { id: questionId },
      select: { testCases: true },
    });
    const suite = normalizeSuite(q?.testCases);
    if (suite.length > 0) return suite;
  } catch {}

  // Fallback: some projects may have `questions`
  try {
    const q = await (prisma as any).questions.findUnique({
      where: { id: questionId },
      select: { testCases: true },
    });
    const suite = normalizeSuite(q?.testCases);
    if (suite.length > 0) return suite;
  } catch {}

  return [];
}

export async function get_question_test_cases(questionId: string): Promise<QuestionTestCase[]> {
  // 0) Mock mode
  if (MOCK_MODE) {
    return [
      { input: "1 2", expected_output: "3" },
      { input: "4 5", expected_output: "9" },
    ];
  }

  // 1) ✅ DB first (your source of truth)
  if (questionId) {
    const suite = await getFromDb(questionId);
    if (suite.length > 0) {
      // Ensure expected_output always populated (your runner needs it)
      return suite.map((tc) => ({
        ...tc,
        expected_output: tc.expected_output ?? tc.output ?? null,
      }));
    }
  }

  // 2) Fallback WAFAA
  if (!WAFAA_BASE) return [];

  const url = `${WAFAA_BASE.replace(/\/$/, "")}/questions/${encodeURIComponent(questionId)}`;
  const res = await axios.get(url, {
    headers: WAFAA_KEY ? { Authorization: `Bearer ${WAFAA_KEY}` } : undefined,
    timeout: 5000,
  });

  const raw =
    res.data?.test_cases ??
    res.data?.testCases ??
    res.data?.cases ??
    null;

  const suite = normalizeSuite(raw);

  return suite.map((tc) => ({
    ...tc,
    expected_output: tc.expected_output ?? tc.output ?? null,
  }));
}

export async function generate_embedding(text: string): Promise<number[]> {
  if (MOCK_MODE || !WAFAA_BASE) {
    const v: number[] = new Array(8).fill(0);
    for (let i = 0; i < text.length; i++) {
      v[i % v.length] += text.charCodeAt(i) % 13;
    }
    return v.map((n) => n / 13);
  }

  const url = `${WAFAA_BASE.replace(/\/$/, "")}/embeddings`;
  const res = await axios.post(
    url,
    { text },
    { headers: WAFAA_KEY ? { Authorization: `Bearer ${WAFAA_KEY}` } : undefined, timeout: 8000 }
  );
  return res.data.embedding;
}

export type VectorSearchResult = { id: string; score: number; snippet: string };

export async function search_vector_db(embedding: number[], topK = 10): Promise<VectorSearchResult[]> {
  if (MOCK_MODE || !WAFAA_BASE) {
    return [
      { id: "web-1", score: 0.92, snippet: "for i in range..." },
      { id: "web-2", score: 0.42, snippet: "def solve():" },
    ].slice(0, topK);
  }

  const url = `${WAFAA_BASE.replace(/\/$/, "")}/vector_search`;
  const res = await axios.post(
    url,
    { embedding, top_k: topK },
    { headers: WAFAA_KEY ? { Authorization: `Bearer ${WAFAA_KEY}` } : undefined, timeout: 8000 }
  );
  return res.data.results || [];
}

export async function update_skill_radar(submission: { userId: string; id: string; code: string }) {
  if (MOCK_MODE || !IHSN_BASE) {
    return { ok: true };
  }

  const url = `${IHSN_BASE.replace(/\/$/, "")}/update_skill_radar`;
  const res = await axios.post(url, submission, {
    headers: IHSN_KEY ? { Authorization: `Bearer ${IHSN_KEY}` } : undefined,
    timeout: 5000,
  });
  return res.data;
}

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const MOCK_MODE = process.env.EXTERNALS_MOCK === '1' || process.env.NODE_ENV !== 'production';

const WAFAA_BASE = process.env.WAFAA_BASE_URL || '';
const WAFAA_KEY = process.env.WAFAA_API_KEY || '';
const IHSN_BASE = process.env.IHSSANE_BASE_URL || '';
const IHSN_KEY = process.env.IHSSANE_API_KEY || '';

export type QuestionTestCase = { input: string; expected_output: string };

export async function get_question_test_cases(questionId: string): Promise<QuestionTestCase[]> {
  if (MOCK_MODE || !WAFAA_BASE) {
    return [
      { input: '1 2', expected_output: '3' },
      { input: '4 5', expected_output: '9' },
    ];
  }

  const url = `${WAFAA_BASE.replace(/\/$/, '')}/questions/${encodeURIComponent(questionId)}`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${WAFAA_KEY}` }, timeout: 5000 });
  // Expect res.data.test_cases = [{ input, expected_output }, ...]
  return res.data.test_cases || [];
}

export async function generate_embedding(text: string): Promise<number[]> {
  if (MOCK_MODE || !WAFAA_BASE) {
    const v: number[] = new Array(8).fill(0);
    for (let i = 0; i < text.length; i++) {
      v[i % v.length] += text.charCodeAt(i) % 13;
    }
    return v.map((n) => n / 13);
  }

  const url = `${WAFAA_BASE.replace(/\/$/, '')}/embeddings`;
  const res = await axios.post(url, { text }, { headers: { Authorization: `Bearer ${WAFAA_KEY}` }, timeout: 8000 });
  return res.data.embedding;
}

export type VectorSearchResult = { id: string; score: number; snippet: string };

export async function search_vector_db(embedding: number[], topK = 10): Promise<VectorSearchResult[]> {
  if (MOCK_MODE || !WAFAA_BASE) {
    return [
      { id: 'web-1', score: 0.92, snippet: 'for i in range...' },
      { id: 'web-2', score: 0.42, snippet: 'def solve():' },
    ].slice(0, topK);
  }

  const url = `${WAFAA_BASE.replace(/\/$/, '')}/vector_search`;
  const res = await axios.post(url, { embedding, top_k: topK }, { headers: { Authorization: `Bearer ${WAFAA_KEY}` }, timeout: 8000 });
  return res.data.results || [];
}

export async function update_skill_radar(submission: { userId: string; id: string; code: string }) {
  if (MOCK_MODE || !IHSN_BASE) {
    return { ok: true };
  }

  const url = `${IHSN_BASE.replace(/\/$/, '')}/update_skill_radar`;
  const res = await axios.post(url, submission, { headers: { Authorization: `Bearer ${IHSN_KEY}` }, timeout: 5000 });
  return res.data;
}


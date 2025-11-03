import { generate_embedding, search_vector_db } from './externalClients';

export type PlagiarismEvidence = {
  sourceId: string;
  score: number;
  snippet: string;
};

export async function check_web_plagiarism(code: string, topK = 10): Promise<{ score: number; evidences: PlagiarismEvidence[] }> {
  const emb = await generate_embedding(code);
  const similar = await search_vector_db(emb, topK);

  // Simple aggregated score: max similarity
  const score = similar.length ? Math.max(...similar.map((s) => s.score)) : 0;

  const evidences: PlagiarismEvidence[] = similar.map((s) => ({ sourceId: s.id, score: s.score, snippet: s.snippet }));
  return { score, evidences };
}

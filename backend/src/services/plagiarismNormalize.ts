// R-34 (Wave 4 S2): plagiarism detection is de-scoped — there is no real detector.
// This dependency-free helper turns a raw runner response into an HONEST result: an
// explicit not_computed (null scores) whenever nothing real was computed, so a consumer
// can never mistake an un-run check for a "clean" 0. If a real detector is wired later
// (numeric finalScore/risk/score and status !== 'not_computed'), its numbers pass
// through. Kept in its own module so it can be unit-tested without the grade pipeline.

export type PlagiarismResult = {
  status: 'computed' | 'not_computed';
  reason?: string;
  staticScore: number | null;
  dynamicScore: number | null;
  webScore: number | null;
  finalScore: number | null;
  evidence: any[];
};

export function normalizePlagiarism(raw: any): PlagiarismResult {
  const notComputed = (): PlagiarismResult => ({
    status: 'not_computed',
    reason: 'plagiarism-detection-descoped',
    staticScore: null,
    dynamicScore: null,
    webScore: null,
    finalScore: null,
    evidence: [],
  });

  if (!raw || typeof raw !== 'object') return notComputed();

  // An explicit not_computed (or a null risk with no numeric score) STAYS
  // not_computed — it is never turned into 0.
  const hasRealScore =
    raw.status !== 'not_computed' &&
    (typeof raw.finalScore === 'number' ||
      typeof raw.risk === 'number' ||
      typeof raw.score === 'number');
  if (!hasRealScore) return notComputed();

  const evidenceRaw = Array.isArray(raw.evidence)
    ? raw.evidence
    : (Array.isArray(raw.hits) ? raw.hits : (Array.isArray(raw.evidences) ? raw.evidences : []));

  const evidence = evidenceRaw.map((e: any) => ({
    source: e.source || e.sourceId || e.origin || 'unknown',
    similarity:
      typeof e.similarity === 'number'
        ? e.similarity
        : (typeof e.similarityScore === 'number'
            ? e.similarityScore
            : (typeof e.score === 'number' ? e.score : 0)),
    snippet: e.snippet || e.context || '',
    url: e.url || null,
  }));

  const finalScore =
    typeof raw.finalScore === 'number'
      ? raw.finalScore
      : (typeof raw.risk === 'number' ? raw.risk : (typeof raw.score === 'number' ? raw.score : 0));

  return {
    status: 'computed',
    staticScore: typeof raw.staticScore === 'number' ? raw.staticScore : finalScore,
    dynamicScore: typeof raw.dynamicScore === 'number' ? raw.dynamicScore : finalScore,
    webScore: typeof raw.webScore === 'number' ? raw.webScore : finalScore,
    finalScore,
    evidence,
  };
}

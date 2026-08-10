// backend/src/utils/assessment-scoring-core.ts
//
// Canonical per-question assessment scoring core (Wave 4 / Session 5, R-37).
//
// This is a PURE module — no Prisma / DB imports. It is the single source of truth
// for the MCQ/coding scoring math that previously lived (triplicated) inside:
//   • services/company/internal/assessmentScoring.service.ts      (reference behaviour)
//   • services/candidate/simpleTest.service.ts
//   • services/company/internal/skillRadarFromAssessment.service.ts
//
// It mirrors the clean split already used for profile scoring
// (utils/scoring-algorithms.ts = pure ↔ profile/scoring.service.ts = DB wrapper):
// the services keep all DB fetch/persist + their own Prisma-typed JSON helpers and
// call into here for the actual scoring. Behaviour is a literal lift of the reference
// service, so Flow B (the authoritative CandidateAssessmentSession.total_score) is
// byte-identical after consolidation.
//
// JSON coming from Prisma is passed in as `unknown`/`any` (this module never touches
// Prisma types); callers narrow their own DB rows before/after.

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Coerce to a number, treat non-finite as 0, round, clamp to 0..100. */
export function clampScore(x: unknown): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** normalize ids: trim + uppercase (so "a " === "A"). */
export function normId(x: unknown): string {
  return String(x ?? "").trim().toUpperCase();
}

/** Accept `{ options: [...] }`, a bare array, or nothing → always an array. */
export function normalizeOptions(options: unknown): any[] {
  if (!options) return [];
  if (Array.isArray((options as any)?.options)) return (options as any).options;
  if (Array.isArray(options)) return options;
  return [];
}

/** Order-independent set equality after id normalization. */
export function sameSet(a: string[], b: string[]): boolean {
  const A = new Set(a.map(normId));
  const B = new Set(b.map(normId));
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

/** Shared %-primitive: passed/total → 0..100 (guarded, clamped). */
export function percent(passed: number, total: number): number {
  return total > 0 ? clampScore((passed / total) * 100) : 0;
}

// ---------------------------------------------------------------------------
// MCQ
// ---------------------------------------------------------------------------

export interface McqQuestionLike {
  correctAnswer: string | null;
  options: unknown;
}

/**
 * Resolve the set of correct MCQ option ids from a question.
 * Prefers `correctAnswer` (JSON-array string, "A,B"/"A|B", or single value);
 * falls back to options flagged `isCorrect`/`correct`.
 */
export function getCorrectMcqOptionIds(question: McqQuestionLike): string[] {
  const raw = question.correctAnswer;

  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();

    // allow JSON array in string: '["A","B"]'
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.map((x) => normId(x)).filter(Boolean);
      } catch {
        /* fall through to delimiter parsing */
      }
    }

    // handle "A,B" or "A, B" or "A|B"
    if (t.includes(",") || t.includes("|")) {
      return t.split(/[,|]/g).map((s) => normId(s)).filter(Boolean);
    }

    // single value: "A"
    return [normId(t)];
  }

  const opts = normalizeOptions(question.options);
  return opts
    .filter((o: any) => o?.isCorrect === true || o?.correct === true)
    .map((o: any) => normId(o.id ?? o.option_id ?? o.value ?? o.key))
    .filter(Boolean);
}

/**
 * Parse the candidate's selected option ids from a stored answer.
 * Supports both `selectedOptionIds: string[]` and scalar `selectedOptionId`.
 */
export function readSelectedOptionIds(answer: unknown): string[] {
  const a = answer as any;
  if (Array.isArray(a?.selectedOptionIds)) {
    return a.selectedOptionIds.map((x: any) => normId(x));
  }
  if (a?.selectedOptionId) return [normId(a.selectedOptionId)];
  return [];
}

export interface McqScore {
  score: 0 | 100;
  isCorrect: boolean;
  selected: string[];
  correct: string[];
}

/** Score a single MCQ: 100 iff the selected set exactly matches a non-empty correct set. */
export function scoreMcq(answer: unknown, question: McqQuestionLike): McqScore {
  const selected = readSelectedOptionIds(answer);
  const correct = getCorrectMcqOptionIds(question);
  const isCorrect = correct.length > 0 && sameSet(selected, correct);
  return { score: isCorrect ? 100 : 0, isCorrect, selected, correct };
}

// ---------------------------------------------------------------------------
// Coding
// ---------------------------------------------------------------------------

/**
 * Extract a 0..100 coding score from a runner result across ALL known shapes.
 * ORDER IS SIGNIFICANT — a top-level `score` wins over runner counts, so e.g.
 * `{ score: 80, runner: { passed: 5, total: 5 } }` → 80 (not 100).
 *
 * Shapes handled (in order):
 *   1. result stored as a JSON string  → parse (unparseable → 0)
 *   2. top-level `score` (number or numeric-string) in 0..100
 *   3. runner.passed / runner.total            (assessment runner)
 *   4. runner.totalPassed / runner.totalTests  (simpleTest runner)
 *   5. legacy top-level passedCount/testsPassed/passed over total/testsTotal/totalTests
 *   6. else 0
 */
export function extractCodingScore(result: unknown): number {
  if (!result) return 0;

  let r: any = result;
  if (typeof r === "string") {
    try { r = JSON.parse(r); } catch { return 0; }
  }

  // 2) top-level score — accept both number and numeric string
  const rawScore = r?.score;
  if (rawScore !== null && rawScore !== undefined) {
    const n = typeof rawScore === "number" ? rawScore : Number(rawScore);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return clampScore(n);
  }

  // 3) runner.passed / runner.total (assessment runner shape)
  const passed1 = r?.runner?.passed;
  const total1 = r?.runner?.total;
  if (typeof passed1 === "number" && typeof total1 === "number" && total1 > 0) {
    return percent(passed1, total1);
  }

  // 4) runner.totalPassed / runner.totalTests (simpleTest runner shape)
  const passed2 = r?.runner?.totalPassed;
  const total2 = r?.runner?.totalTests;
  if (typeof passed2 === "number" && typeof total2 === "number" && total2 > 0) {
    return percent(passed2, total2);
  }

  // 5) legacy top-level shapes
  const pc = r?.passedCount ?? r?.testsPassed ?? r?.passed;
  const tt = r?.total ?? r?.testsTotal ?? r?.totalTests;
  if (typeof pc === "number" && typeof tt === "number" && tt > 0) {
    return percent(pc, tt);
  }

  return 0;
}

/** Best-effort count of tests passed across runner shapes (0 if unknown). */
export function extractTestsPassed(result: unknown): number {
  if (!result) return 0;
  let r: any = result;
  if (typeof r === "string") { try { r = JSON.parse(r); } catch { return 0; } }
  return (
    r?.runner?.passed ??       // assessment runner
    r?.runner?.totalPassed ??  // simpleTest runner
    r?.passedCount ??
    r?.testsPassed ??
    0
  );
}

/** Best-effort count of total tests across runner shapes (0 if unknown). */
export function extractTestsTotal(result: unknown): number {
  if (!result) return 0;
  let r: any = result;
  if (typeof r === "string") { try { r = JSON.parse(r); } catch { return 0; } }
  return (
    r?.runner?.total ??        // assessment runner
    r?.runner?.totalTests ??   // simpleTest runner
    r?.total ??
    r?.testsTotal ??
    0
  );
}

export type CodingScoreUsed = "codeSubmission.score" | "result.score/runner" | "none";

export interface ResolvedCodingScore {
  score: number;
  used: CodingScoreUsed;
}

/**
 * Resolve a coding question's score, preferring the persisted `codeSubmission.score`
 * column (number or numeric-string) over the score derived from the result JSON.
 * `used` records which source won (metadata for the breakdown).
 */
export function resolveCodingScore(input: { dbScore?: unknown; result?: unknown }): ResolvedCodingScore {
  const { dbScore, result } = input;

  const fromDbScore =
    typeof dbScore === "number" && Number.isFinite(dbScore)
      ? clampScore(dbScore)
      : dbScore !== null && dbScore !== undefined
      ? (Number.isFinite(Number(dbScore)) ? clampScore(Number(dbScore)) : null)
      : null;

  const fromResultScore = result != null ? extractCodingScore(result) : 0;

  const score = fromDbScore !== null ? fromDbScore : fromResultScore;
  const used: CodingScoreUsed =
    fromDbScore !== null ? "codeSubmission.score" : fromResultScore > 0 ? "result.score/runner" : "none";

  return { score, used };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Weighted average of per-question scores by `points`, returned as a clamped 0..100.
 * Rows with `score: 0` still contribute their `points` to the denominator (so an
 * unanswered/unknown question drags the total down exactly like the reference did).
 */
export function weightedTotal(items: { score: number; points: number }[]): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const it of items) {
    const points = it.points ?? 1;
    weightedSum += (it.score / 100) * points;
    weightTotal += points;
  }
  return weightTotal > 0 ? clampScore((weightedSum / weightTotal) * 100) : 0;
}

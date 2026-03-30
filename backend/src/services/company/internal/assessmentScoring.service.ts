// backend/src/services/company/internal/assessmentScoring.service.ts
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CODING_SUBMISSION_MODE: "BEST" | "LAST" = "LAST";

function clamp0_100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeOptions(options: any): any[] {
  if (!options) return [];
  if (Array.isArray(options?.options)) return options.options;
  if (Array.isArray(options)) return options;
  return [];
}

function asPlainObject(v: unknown): Record<string, any> {
  if (!v || typeof v !== "object") return {};
  if (Array.isArray(v)) return {};
  return v as Record<string, any>;
}

function isJsonObject(v: unknown): v is Prisma.JsonObject {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function getJsonStringField(v: Prisma.JsonValue | null | undefined, key: string): string | null {
  if (!isJsonObject(v)) return null;
  const val = (v as Prisma.JsonObject)[key];
  return typeof val === "string" ? val : null;
}

function normId(x: unknown) {
  return String(x ?? "").trim().toUpperCase();
}

function getCorrectMcqOptionIds(question: { correctAnswer: string | null; options: any }): string[] {
  const raw = question.correctAnswer;

  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.map((x) => normId(x)).filter(Boolean);
      } catch {}
    }
    if (t.includes(",") || t.includes("|")) {
      return t.split(/[,|]/g).map((s) => normId(s)).filter(Boolean);
    }
    return [normId(t)];
  }

  const opts = normalizeOptions(question.options);
  return opts
    .filter((o: any) => o?.isCorrect === true || o?.correct === true)
    .map((o: any) => normId(o.id ?? o.option_id ?? o.value ?? o.key))
    .filter(Boolean);
}

function sameSet(a: string[], b: string[]) {
  const A = new Set(a.map(normId));
  const B = new Set(b.map(normId));
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

/**
 * ✅ FIXED: supports ALL runner shapes:
 *
 * Shape 1 (your assessment runner):
 *   { score: 100, runner: { passed: 5, total: 5 } }
 *
 * Shape 2 (simpleTest runner):
 *   { score: 100, runner: { totalPassed: 5, totalTests: 5 } }
 *
 * Also handles score stored as string "100" instead of number 100
 */
function extractCodingScore(result: any): number {
  if (!result) return 0;

  // ✅ FIX 1: parse result if stored as JSON string
  if (typeof result === "string") {
    try { result = JSON.parse(result); } catch { return 0; }
  }

  // ✅ FIX 2: top-level result.score — accept both number and numeric string
  const rawScore = result?.score;
  if (rawScore !== null && rawScore !== undefined) {
    const n = typeof rawScore === "number" ? rawScore : Number(rawScore);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return clamp0_100(n);
  }

  // ✅ FIX 3: runner.passed / runner.total  (YOUR assessment runner shape)
  const passed1 = result?.runner?.passed;
  const total1 = result?.runner?.total;
  if (typeof passed1 === "number" && typeof total1 === "number" && total1 > 0) {
    return clamp0_100((passed1 / total1) * 100);
  }

  // ✅ FIX 4: runner.totalPassed / runner.totalTests  (simpleTest runner shape)
  const passed2 = result?.runner?.totalPassed;
  const total2 = result?.runner?.totalTests;
  if (typeof passed2 === "number" && typeof total2 === "number" && total2 > 0) {
    return clamp0_100((passed2 / total2) * 100);
  }

  // ✅ FIX 5: legacy top-level shapes
  const pc = result?.passedCount ?? result?.testsPassed ?? result?.passed;
  const tt = result?.total ?? result?.testsTotal ?? result?.totalTests;
  if (typeof pc === "number" && typeof tt === "number" && tt > 0) {
    return clamp0_100((pc / tt) * 100);
  }

  return 0;
}

function extractTestsPassed(result: any): number {
  if (!result) return 0;
  if (typeof result === "string") { try { result = JSON.parse(result); } catch { return 0; } }
  return (
    result?.runner?.passed ??        // ✅ your assessment runner
    result?.runner?.totalPassed ??   // simpleTest runner
    result?.passedCount ??
    result?.testsPassed ??
    0
  );
}

function extractTestsTotal(result: any): number {
  if (!result) return 0;
  if (typeof result === "string") { try { result = JSON.parse(result); } catch { return 0; } }
  return (
    result?.runner?.total ??         // ✅ your assessment runner
    result?.runner?.totalTests ??    // simpleTest runner
    result?.total ??
    result?.testsTotal ??
    0
  );
}

type BreakdownItem =
  | {
      questionId: string;
      type: "mcq";
      points: number;
      score: number;
      isCorrect: boolean;
      selected: string[];
      correct: string[];
      timeSpentSec: number | null;
      attempts: number | null;
    }
  | {
      questionId: string;
      type: "coding";
      points: number;
      score: number;
      testsPassed: number | null;
      testsTotal: number | null;
      runtimeMs: number | null;
      compileError: boolean | null;
      attempts: number | null;
      submissionId: string | null;
      error: string | null;
      used: "codeSubmission.score" | "result.score/runner" | "none";
    };

export class AssessmentScoringService {
  static async computeAndStore(sessionId: string) {
    const session = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        status: true,
        assessment_id: true,
        candidate_id: true,
        submitted_at: true,
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "SUBMITTED") return { ok: true, skipped: true };

    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: session.assessment_id },
      select: { assessment_id: true, passing_score: true, title: true },
    });
    if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");

    const aq = await prisma.assessmentQuestion.findMany({
      where: { assessment_id: session.assessment_id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: {
        question_id: true,
        points: true,
        section: true,
        question: {
          select: {
            id: true,
            type: true,
            difficulty: true,
            skillTags: true,
            correctAnswer: true,
            options: true,
          },
        },
      },
    });

    const questionIds = aq.map((x) => x.question_id);

    const answers = await prisma.candidateAssessmentAnswer.findMany({
      where: { session_id: sessionId },
      select: {
        question_id: true,
        answer: true,
        time_spent_sec: true,
        attempts: true,
        latest_submission_id: true,
      },
    });
    const ansByQ = new Map(answers.map((a) => [a.question_id, a]));

    // ✅ FIX: filter by session_id via evidence to avoid cross-session pollution
    const submissions = await prisma.codeSubmission.findMany({
      where: {
        assessment_id: session.assessment_id,
        candidate_id: session.candidate_id,
        question_id: { in: questionIds },
        // only submissions before or at submit time
        ...(session.submitted_at ? { created_at: { lte: session.submitted_at } } : {}),
      },
      orderBy: [{ created_at: "desc" }],
      take: 500,
      select: {
        submission_id: true,
        question_id: true,
        score: true,
        runtime_ms: true,
        result: true,
        error: true,
        created_at: true,
        evidence: true,
      },
    });

    // ✅ group by question_id — only keep submissions that belong to THIS session
    const subsByQ = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const qid = s.question_id;
      if (!qid || !questionIds.includes(qid)) continue;

      // ✅ filter: only submissions from this session (via evidence.session_id)
      const evSessionId = getJsonStringField(s.evidence as any, "session_id");
      if (evSessionId && evSessionId !== sessionId) continue; // skip other sessions

      const arr = subsByQ.get(qid) ?? [];
      arr.push(s);
      subsByQ.set(qid, arr);
    }

    const breakdown: BreakdownItem[] = [];
    let weightedSum = 0;
    let weightTotal = 0;

    for (const row of aq) {
      const q = row.question;
      const points = row.points ?? 1;
      const typeLower = String(q.type || "").toLowerCase();
      const isCoding = typeLower.includes("coding");
      const isMcq = typeLower.includes("mcq");

      const ans = ansByQ.get(row.question_id);
      const timeSpentSec = ans?.time_spent_sec ?? null;
      const attempts = ans?.attempts ?? null;

      // ── MCQ ──────────────────────────────────────────────
      if (isMcq) {
        const selected = Array.isArray((ans?.answer as any)?.selectedOptionIds)
          ? (ans?.answer as any).selectedOptionIds.map((x: any) => normId(x))
          : (ans?.answer as any)?.selectedOptionId
          ? [normId((ans?.answer as any).selectedOptionId)]
          : [];

        const correct = getCorrectMcqOptionIds({
          correctAnswer: q.correctAnswer ?? null,
          options: q.options,
        });

        const isCorrect = correct.length > 0 && sameSet(selected, correct);
        const score = isCorrect ? 100 : 0;

        breakdown.push({
          questionId: row.question_id,
          type: "mcq",
          points,
          score,
          isCorrect,
          selected,
          correct,
          timeSpentSec,
          attempts,
        });

        weightedSum += (score / 100) * points;
        weightTotal += points;
        continue;
      }

      // ── CODING ───────────────────────────────────────────
      if (isCoding) {
        const subs = subsByQ.get(row.question_id) ?? [];

        let chosen = subs[0] ?? null; // LAST by default (most recent, ordered DESC)

        if (CODING_SUBMISSION_MODE === "BEST" && subs.length > 0) {
          let best = subs[0];
          let bestVal = -1;
          for (const s of subs) {
            const val = extractCodingScore(s.result as any);
            if (val > bestVal) { bestVal = val; best = s; }
          }
          chosen = best;
        }

        // ✅ FIX: prefer DB score column first, then result JSON
        const fromDbScore =
          typeof chosen?.score === "number" && Number.isFinite(chosen.score)
            ? clamp0_100(chosen.score)
            : chosen?.score !== null && chosen?.score !== undefined
            ? (Number.isFinite(Number(chosen.score)) ? clamp0_100(Number(chosen.score)) : null)
            : null;

        const fromResultScore = chosen ? extractCodingScore(chosen.result as any) : 0;

        const score = fromDbScore !== null ? fromDbScore : fromResultScore;
        const tp = chosen ? extractTestsPassed(chosen.result as any) : null;
        const tt = chosen ? extractTestsTotal(chosen.result as any) : null;

        const compileError = chosen?.error
          ? String(chosen.error).toLowerCase().includes("compile")
          : false;

        breakdown.push({
          questionId: row.question_id,
          type: "coding",
          points,
          score,
          testsPassed: tp,
          testsTotal: tt,
          runtimeMs: chosen?.runtime_ms ?? null,
          compileError: chosen ? compileError : null,
          attempts,
          submissionId: chosen?.submission_id ?? null,
          error: chosen?.error ?? null,
          used: fromDbScore !== null ? "codeSubmission.score" : fromResultScore > 0 ? "result.score/runner" : "none",
        });

        weightedSum += (score / 100) * points;
        weightTotal += points;
        continue;
      }

      // ── Unknown → 0 ──────────────────────────────────────
      breakdown.push({
        questionId: row.question_id,
        type: "mcq",
        points,
        score: 0,
        isCorrect: false,
        selected: [],
        correct: [],
        timeSpentSec,
        attempts,
      });
      weightTotal += points;
    }

    const totalScore = weightTotal > 0 ? clamp0_100((weightedSum / weightTotal) * 100) : 0;
    const passing = typeof assessment.passing_score === "number" ? assessment.passing_score : 70;
    const passed = totalScore >= passing;

    const prev = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: { result_summary: true },
    });

    const prevObj = asPlainObject(prev?.result_summary);

    await prisma.candidateAssessmentSession.update({
      where: { session_id: sessionId },
      data: {
        total_score: totalScore,
        passed,
        result_summary: {
          ...prevObj,
          assessmentId: session.assessment_id,
          generatedAt: new Date().toISOString(),
          totalScore,
          passed,
          questions: breakdown,
        } as any,
      },
    });

    return { ok: true, totalScore, passed, breakdownCount: breakdown.length };
  }
}
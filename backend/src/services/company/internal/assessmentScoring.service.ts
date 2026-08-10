// backend/src/services/company/internal/assessmentScoring.service.ts
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
// Canonical per-question scoring math lives in the pure core (Wave 4 / S5, R-37).
// This service keeps only the DB fetch/persist + BEST/LAST selection + evidence filtering.
import {
  scoreMcq,
  resolveCodingScore,
  extractCodingScore,
  extractTestsPassed,
  extractTestsTotal,
  weightedTotal,
} from "../../../utils/assessment-scoring-core";

const CODING_SUBMISSION_MODE: "BEST" | "LAST" = "LAST";

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
        const { score, isCorrect, selected, correct } = scoreMcq(ans?.answer, {
          correctAnswer: q.correctAnswer ?? null,
          options: q.options,
        });

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

        // prefer the persisted DB score column, then the result JSON (core semantics)
        const { score, used } = resolveCodingScore({ dbScore: chosen?.score, result: chosen?.result });
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
          used,
        });

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
    }

    const totalScore = weightedTotal(breakdown);
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
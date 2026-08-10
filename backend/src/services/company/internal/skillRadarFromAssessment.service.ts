// backend/src/services/company/internal/skillRadarFromAssessment.service.ts
import prisma from '../../../lib/prisma';
// Per-question scoring delegated to the pure core (Wave 4 / S5, R-37) so the radar's
// per-tag averages are computed from the SAME MCQ/coding math as the authoritative
// total_score. Only the skillTags grouping/averaging below is radar-specific.
import { scoreMcq, resolveCodingScore } from '../../../utils/assessment-scoring-core';

// ✅ Fix for TS2698: only spread real objects
function asPlainObject(v: unknown): Record<string, any> {
  if (!v || typeof v !== "object") return {};
  if (Array.isArray(v)) return {};
  return v as Record<string, any>;
}

export class SkillRadarFromAssessmentService {
  static async buildAndPush(sessionId: string) {
    const session = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        assessment_id: true,
        candidate_id: true,
        status: true,
        submitted_at: true,
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "SUBMITTED") return { ok: true, skipped: true };

    const answers = await prisma.candidateAssessmentAnswer.findMany({
      where: { session_id: sessionId },
      select: {
        question_id: true,
        answer: true,
        state: true,
      },
    });

    const qIds = answers.map((a) => a.question_id);

    if (qIds.length === 0) {
      // No answer rows (e.g. timeout / auto-submit). The scoring worker has ALREADY written
      // `questions` / `totalScore` / `passed` into result_summary via computeAndStore; we
      // must MERGE the empty radar over that object, never replace it — a bare write here
      // silently wiped the authoritative breakdown the employer results page reads
      // (Wave 4 review, data-loss fix).
      const prevEmpty = await prisma.candidateAssessmentSession.findUnique({
        where: { session_id: sessionId },
        select: { result_summary: true },
      });
      await prisma.candidateAssessmentSession.update({
        where: { session_id: sessionId },
        data: {
          result_summary: {
            ...asPlainObject(prevEmpty?.result_summary),
            radar_tag: [],
            assessmentId: session.assessment_id,
            generatedAt: new Date().toISOString(),
          } as any,
        },
      });
      return { ok: true, radarCount: 0, radar_tag: [] };
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: qIds } },
      select: { id: true, type: true, skillTags: true, correctAnswer: true, options: true },
    });

    const qById = new Map(questions.map((q) => [q.id, q]));

    // Parity with AssessmentScoringService.computeAndStore (the authoritative total): the
    // radar MUST score the SAME code submission the total does, or per-tag scores diverge
    // from total_score (Wave 4 review, parity fix). That means (a) cap at submitted_at so a
    // later retake isn't picked up, and (b) keep only submissions belonging to THIS session
    // via evidence.session_id.
    const subs = await prisma.codeSubmission.findMany({
      where: {
        candidate_id: session.candidate_id,
        assessment_id: session.assessment_id,
        question_id: { in: qIds },
        ...(session.submitted_at ? { created_at: { lte: session.submitted_at } } : {}),
      },
      orderBy: { created_at: "desc" },
      select: { question_id: true, result: true, score: true, evidence: true },
    });

    const evSessionOf = (evidence: unknown): string | null => {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return null;
      const v = (evidence as Record<string, unknown>).session_id;
      return typeof v === "string" ? v : null;
    };

    const latestSubByQ = new Map<string, { score: number | null; result: any }>();
    for (const s of subs) {
      // Skip submissions that explicitly belong to a different session.
      const evSession = evSessionOf(s.evidence as any);
      if (evSession && evSession !== sessionId) continue;
      if (!latestSubByQ.has(s.question_id)) {
        latestSubByQ.set(s.question_id, { score: s.score ?? null, result: s.result as any });
      }
    }

    const skillScores = new Map<string, { sum: number; n: number }>();

    for (const a of answers) {
      const q = qById.get(a.question_id);
      if (!q) continue;

      const tags = Array.isArray(q.skillTags) ? q.skillTags : [];
      const typeStr = String(q.type || "").toLowerCase();
      const isCoding = typeStr.includes("coding");
      const isMcq = typeStr.includes("mcq");

      let baseScore = 0;

      if (isCoding) {
        const sub = latestSubByQ.get(a.question_id);
        // Full runner-shape resolution (DB score → result JSON), same as the total.
        baseScore = resolveCodingScore({ dbScore: sub?.score, result: sub?.result }).score;
      } else if (isMcq) {
        baseScore = scoreMcq(a.answer, {
          correctAnswer: q.correctAnswer ?? null,
          options: q.options,
        }).score;
      } else {
        baseScore = 0;
      }

      const usedTags = tags.length ? tags : ["General"];
      for (const skill of usedTags) {
        const key = String(skill || "General");
        const cur = skillScores.get(key) ?? { sum: 0, n: 0 };
        cur.sum += baseScore;
        cur.n += 1;
        skillScores.set(key, cur);
      }
    }

    const radar_tag = Array.from(skillScores.entries()).map(([label, v]) => ({
      label,
      score: v.n ? Math.round(v.sum / v.n) : 0,
    }));

    const prev = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: { result_summary: true },
    });

    const prevObj = asPlainObject(prev?.result_summary);

    await prisma.candidateAssessmentSession.update({
      where: { session_id: sessionId },
      data: {
        result_summary: {
          ...prevObj,
          radar_tag,
          assessmentId: session.assessment_id,
          generatedAt: new Date().toISOString(),
        } as any,
      },
    });

    return { ok: true, radarCount: radar_tag.length, radar_tag };
  }
}

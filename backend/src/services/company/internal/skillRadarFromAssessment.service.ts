// backend/src/services/company/internal/skillRadarFromAssessment.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function clampScore(x: unknown) {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeOptions(options: any): any[] {
  if (!options) return [];
  if (Array.isArray(options?.options)) return options.options;
  if (Array.isArray(options)) return options;
  return [];
}

// ✅ Fix for TS2698: only spread real objects
function asPlainObject(v: unknown): Record<string, any> {
  if (!v || typeof v !== "object") return {};
  if (Array.isArray(v)) return {};
  return v as Record<string, any>;
}

// normalize ids: trim + uppercase
function normId(x: unknown) {
  return String(x ?? "")
    .trim()
    .toUpperCase();
}

function getCorrectMcqOptionIds(question: { correctAnswer: string | null; options: any }): string[] {
  const raw = question.correctAnswer;

  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();

    // allow JSON array in string: '["A","B"]'
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.map((x) => normId(x)).filter(Boolean);
      } catch {}
    }

    // handle "A,B" or "A, B" or "A|B"
    if (t.includes(",") || t.includes("|")) {
      return t
        .split(/[,|]/g)
        .map((s) => normId(s))
        .filter(Boolean);
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

export class SkillRadarFromAssessmentService {
  static async buildAndPush(sessionId: string) {
    const session = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        assessment_id: true,
        candidate_id: true,
        status: true,
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
      await prisma.candidateAssessmentSession.update({
        where: { session_id: sessionId },
        data: { result_summary: { radar_tag: [], assessmentId: session.assessment_id } as any },
      });
      return { ok: true, radarCount: 0, radar_tag: [] };
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: qIds } },
      select: { id: true, type: true, skillTags: true, correctAnswer: true, options: true },
    });

    const qById = new Map(questions.map((q) => [q.id, q]));

    const subs = await prisma.codeSubmission.findMany({
      where: {
        candidate_id: session.candidate_id,
        assessment_id: session.assessment_id,
        question_id: { in: qIds },
      },
      orderBy: { created_at: "desc" },
      select: { question_id: true, result: true, score: true },
    });

    const latestSubByQ = new Map<string, { score: number | null; result: any }>();
    for (const s of subs) {
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
        const fromScore = sub?.score;
        const fromResultScore = sub?.result?.score;

        baseScore = clampScore(
          typeof fromScore === "number"
            ? fromScore
            : typeof fromResultScore === "number"
            ? fromResultScore
            : 0
        );
      } else if (isMcq) {
        const selected = Array.isArray((a.answer as any)?.selectedOptionIds)
          ? (a.answer as any).selectedOptionIds.map((x: any) => normId(x))
          : [];

        const correct = getCorrectMcqOptionIds({
          correctAnswer: q.correctAnswer ?? null,
          options: q.options,
        });

        baseScore = correct.length > 0 && sameSet(selected, correct) ? 100 : 0;
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

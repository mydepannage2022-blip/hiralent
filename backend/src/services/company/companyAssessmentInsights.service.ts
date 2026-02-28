import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* =========================
   Helpers
========================= */

function levelFromScore(score: number | null | undefined) {
  const s = typeof score === "number" ? score : 0;
  if (s >= 85) return "EXPERT";
  if (s >= 70) return "ADVANCED";
  if (s >= 50) return "INTERMEDIATE";
  return "BEGINNER";
}

/**
 * If your DB stores total_score as 0..1 -> convert to 0..100
 * If already 0..100 -> keep it
 */
function scoreToPercent(score: number | null | undefined): number | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score <= 1) return Math.round(score * 100);
  return Math.round(score);
}

function toISO(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") {
    const d = new Date(val);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  return null;
}

function timeTakenSec(start: unknown, end: unknown): number | null {
  const s =
    start instanceof Date ? start : typeof start === "string" ? new Date(start) : null;
  const e =
    end instanceof Date ? end : typeof end === "string" ? new Date(end) : null;
  if (!s || !e) return null;
  const ms = e.getTime() - s.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

function extractRadarCategoriesFromInsight(radar_ai_json: any) {
  const cats = radar_ai_json?.radar_categories;
  return Array.isArray(cats) ? cats : null;
}

function extractRadarAiLegacy(radar_ai_json: any) {
  const arr = radar_ai_json?.radar_ai;
  return Array.isArray(arr) ? arr : null;
}

function pickCandidateProfilePictureUrl(user: any): string | null {
  // ✅ In your schema: CandidateProfile.profile_picture_url exists
  return user?.candidateProfile?.profile_picture_url ?? null;
}

/* =========================
   Service
========================= */

export class CompanyAssessmentInsightsService {
  /**
   * GET /company/candidates/:candidateId/assessments/completed
   * Return submitted sessions visible to this company admin.
   */
  static async getCompletedForCandidate(companyId: string, candidateId: string) {
    const companyAssessments = await prisma.employerAssessment.findMany({
      where: { company_id: companyId },
      select: { assessment_id: true, title: true, job_id: true },
    });

    if (companyAssessments.length === 0) return [];

    const allowedAssessmentIds = companyAssessments.map((a) => a.assessment_id);
    const assessmentById = new Map(companyAssessments.map((a) => [a.assessment_id, a]));

    const sessions = await prisma.candidateAssessmentSession.findMany({
      where: {
        candidate_id: candidateId,
        status: "SUBMITTED",
        assessment_id: { in: allowedAssessmentIds },
      },
      orderBy: { submitted_at: "desc" },
      select: {
        session_id: true,
        assessment_id: true,
        status: true,
        started_at: true,
        submitted_at: true,
        expires_at: true,
      },
    });

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.session_id);

    const insights = await prisma.candidateAssessmentInsight.findMany({
      where: { session_id: { in: sessionIds } },
      select: { session_id: true, generated_at: true },
    });

    const insightBySession = new Map(insights.map((i) => [i.session_id, i]));

    return sessions.map((s) => {
      const ins = insightBySession.get(s.session_id);
      const a = assessmentById.get(s.assessment_id);
      return {
        sessionId: s.session_id,
        assessmentId: s.assessment_id,
        title: a?.title ?? null,
        jobId: a?.job_id ?? null,
        status: s.status,
        startedAt: toISO(s.started_at),
        submittedAt: toISO(s.submitted_at),
        hasInsight: !!ins,
        insightGeneratedAt: toISO(ins?.generated_at),
      };
    });
  }

  static async getInsight(companyId: string, sessionId: string) {
    const session = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        candidate_id: true,
        assessment_id: true,
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");

    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: session.assessment_id },
      select: { company_id: true, title: true, job_id: true },
    });

    if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");
    if (assessment.company_id !== companyId) throw new Error("FORBIDDEN");

    const insight = await prisma.candidateAssessmentInsight.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        strengths: true,
        weaknesses: true,
        recommendations: true,
        risk_flags: true,
        evidence_by_skill: true,
        model_name: true,
        model_version: true,
        confidence: true,
        generated_at: true,
        summary: true,
        kpis: true,
        radar_ai: true,
      },
    });

    if (!insight) {
      return {
        sessionId: session.session_id,
        assessmentId: session.assessment_id,
        candidateId: session.candidate_id,
        assessmentTitle: assessment.title ?? null,
        jobId: assessment.job_id ?? null,
        insight: null,
      };
    }

    const radarCategories = extractRadarCategoriesFromInsight((insight as any).radar_ai);
    const radarAiLegacy = extractRadarAiLegacy((insight as any).radar_ai);

    return {
      sessionId: session.session_id,
      assessmentId: session.assessment_id,
      candidateId: session.candidate_id,
      assessmentTitle: assessment.title ?? null,
      jobId: assessment.job_id ?? null,
      insight: {
        summary: (insight as any).summary ?? null,
        kpis: (insight as any).kpis ?? null,
        radar_categories: radarCategories,
        radar_ai: radarAiLegacy,
        strengths: insight.strengths ?? null,
        weaknesses: insight.weaknesses ?? null,
        recommendations: insight.recommendations ?? null,
        risk_flags: insight.risk_flags ?? null,
        evidence_by_skill: insight.evidence_by_skill ?? null,
        model_name: insight.model_name ?? null,
        model_version: insight.model_version ?? null,
        confidence: insight.confidence ?? null,
      },
      generatedAt: toISO((insight as any).generated_at),
    };
  }

  static async getAssessmentCandidatesAnalytics(companyId: string, assessmentId: string) {
    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: assessmentId },
      select: { assessment_id: true, company_id: true, title: true, job_id: true },
    });

    if (!assessment) return { assessmentId, title: null, jobId: null, candidates: [] };
    if (assessment.company_id !== companyId) throw new Error("FORBIDDEN");

    const sessions = await prisma.candidateAssessmentSession.findMany({
      where: { assessment_id: assessmentId, status: "SUBMITTED" },
      orderBy: [{ total_score: "desc" }, { submitted_at: "desc" }],
      select: {
        session_id: true,
        candidate_id: true,
        total_score: true,
        passed: true,
        started_at: true,
        submitted_at: true,
      },
    });

    if (sessions.length === 0) {
      return {
        assessmentId,
        title: assessment.title ?? null,
        jobId: assessment.job_id ?? null,
        candidates: [],
      };
    }

    const candidateIds = Array.from(new Set(sessions.map((s) => s.candidate_id)));
    const sessionIds = sessions.map((s) => s.session_id);

    // ✅ Correct: photo comes from CandidateProfile, not User
    const users = await prisma.user.findMany({
      where: { user_id: { in: candidateIds } },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        candidateProfile: { select: { profile_picture_url: true } },
      },
    });

    const userById = new Map(users.map((u) => [u.user_id, u]));

    const insights = await prisma.candidateAssessmentInsight.findMany({
      where: { session_id: { in: sessionIds } },
      select: { session_id: true, generated_at: true, summary: true },
    });

    const insightBySession = new Map(insights.map((i) => [i.session_id, i]));

    return {
      assessmentId,
      title: assessment.title ?? null,
      jobId: assessment.job_id ?? null,
      candidates: sessions.map((s) => {
        const u = userById.get(s.candidate_id);
        const ins = insightBySession.get(s.session_id);

        const totalScorePct = scoreToPercent(s.total_score);

        return {
          sessionId: s.session_id,
          candidateId: s.candidate_id,
          candidateName: u?.full_name ?? "Candidate",
          email: u?.email ?? null,
          profile_picture_url: pickCandidateProfilePictureUrl(u),

          totalScore: totalScorePct,
          passed: s.passed ?? null,
          level: levelFromScore(totalScorePct),

          startedAt: toISO(s.started_at),
          submittedAt: toISO(s.submitted_at),
          timeTakenSec: timeTakenSec(s.started_at, s.submitted_at),

          hasInsight: !!ins,
          insightGeneratedAt: toISO(ins?.generated_at),
          quickSummary: ins?.summary ?? null,
        };
      }),
    };
  }

  static async getAssessmentKPIs(companyId: string, assessmentId: string) {
    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: assessmentId },
      select: { assessment_id: true, company_id: true, title: true, passing_score: true },
    });

    if (!assessment) return { assessmentId, kpis: null };
    if (assessment.company_id !== companyId) throw new Error("FORBIDDEN");

    const sessions = await prisma.candidateAssessmentSession.findMany({
      where: { assessment_id: assessmentId, status: "SUBMITTED" },
      select: { session_id: true, total_score: true, passed: true, result_summary: true },
    });

    const n = sessions.length;

    const insights = await prisma.candidateAssessmentInsight.findMany({
      where: { session_id: { in: sessions.map((s) => s.session_id) } },
      select: { session_id: true, radar_ai: true },
    });

    const insightBySession = new Map(insights.map((i) => [i.session_id, i]));

    const scores = sessions
      .map((s) => scoreToPercent(s.total_score))
      .filter((x): x is number => x != null);

    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    const passCount = sessions.filter((s) => s.passed === true).length;
    const passRate = n ? Math.round((passCount / n) * 100) : 0;

    const skillAgg = new Map<string, { sum: number; n: number }>();

    for (const s of sessions) {
      const ins = insightBySession.get(s.session_id);
      const fromInsightCats = extractRadarCategoriesFromInsight((ins as any)?.radar_ai);

      const radar =
        fromInsightCats ??
        (s.result_summary as any)?.radar_categories ??
        (s.result_summary as any)?.radar_tag ??
        (s.result_summary as any)?.radar ??
        null;

      if (!Array.isArray(radar)) continue;

      for (const item of radar) {
        const label = String(item?.label ?? item?.skill ?? "");
        const score = Number(item?.score);
        if (!label || !Number.isFinite(score)) continue;

        const cur = skillAgg.get(label) ?? { sum: 0, n: 0 };
        cur.sum += score;
        cur.n += 1;
        skillAgg.set(label, cur);
      }
    }

    const topSkills = Array.from(skillAgg.entries())
      .map(([skill, v]) => ({ skill, avg: v.n ? Math.round(v.sum / v.n) : 0 }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    const buckets: Record<string, number> = { "0-49": 0, "50-69": 0, "70-84": 0, "85-100": 0 };
    for (const s of scores) {
      if (s < 50) buckets["0-49"]++;
      else if (s < 70) buckets["50-69"]++;
      else if (s < 85) buckets["70-84"]++;
      else buckets["85-100"]++;
    }

    return {
      assessmentId,
      title: assessment.title ?? null,
      passingScore: assessment.passing_score ?? 70,
      kpis: {
        submissions: n,
        passCount,
        passRate,
        avgScore,
        scoreDistribution: buckets,
        topSkills,
      },
    };
  }

  static async getSessionAnalytics(companyId: string, sessionId: string) {
    const session = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        assessment_id: true,
        candidate_id: true,
        total_score: true,
        passed: true,
        result_summary: true,
        started_at: true,
        submitted_at: true,
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");

    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: session.assessment_id },
      select: { company_id: true, title: true, job_id: true, passing_score: true },
    });

    if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");
    if (assessment.company_id !== companyId) throw new Error("FORBIDDEN");

    const candidate = await prisma.user.findUnique({
      where: { user_id: session.candidate_id },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        candidateProfile: { select: { profile_picture_url: true } },
      },
    });

    const insight = await prisma.candidateAssessmentInsight.findUnique({
      where: { session_id: sessionId },
      select: {
        summary: true,
        kpis: true,
        radar_ai: true,
        strengths: true,
        weaknesses: true,
        recommendations: true,
        risk_flags: true,
        evidence_by_skill: true,
        model_name: true,
        model_version: true,
        confidence: true,
        generated_at: true,
      },
    });

    const questionBreakdown = (session.result_summary as any)?.questions ?? [];

    const radar_categories_from_ai = extractRadarCategoriesFromInsight((insight as any)?.radar_ai);
    const radar_ai_legacy = extractRadarAiLegacy((insight as any)?.radar_ai);

    const radar_tag_fallback =
      (session.result_summary as any)?.radar_tag ?? (session.result_summary as any)?.radar ?? [];

    const totalScorePct = scoreToPercent(session.total_score);

    return {
      sessionId: session.session_id,
      assessmentId: session.assessment_id,
      assessmentTitle: assessment.title ?? null,
      jobId: assessment.job_id ?? null,

      candidate: {
        candidateId: session.candidate_id,
        name: candidate?.full_name ?? "Candidate",
        email: candidate?.email ?? null,
        profile_picture_url: pickCandidateProfilePictureUrl(candidate),
      },

      final: {
        totalScore: totalScorePct,
        passed: session.passed ?? null,
        passingScore: assessment.passing_score ?? 70,
        startedAt: toISO(session.started_at),
        submittedAt: toISO(session.submitted_at),
        timeTakenSec: timeTakenSec(session.started_at, session.submitted_at),
      },

      radar: {
        categories: radar_categories_from_ai ?? null,
        ai: radar_ai_legacy ?? null,
        tag: radar_tag_fallback ?? null,
      },

      summary: (insight as any)?.summary ?? null,
      kpis: (insight as any)?.kpis ?? null,

      strengths: (insight as any)?.strengths ?? null,
      weaknesses: (insight as any)?.weaknesses ?? null,
      recommendations: (insight as any)?.recommendations ?? null,

      risk: (insight as any)?.risk_flags ?? null,
      evidence_by_skill: (insight as any)?.evidence_by_skill ?? null,

      questionBreakdown,

      model: insight
        ? {
            name: (insight as any).model_name ?? null,
            version: (insight as any).model_version ?? null,
            confidence: (insight as any).confidence ?? null,
            generatedAt: toISO((insight as any).generated_at),
          }
        : null,
    };
  }
}

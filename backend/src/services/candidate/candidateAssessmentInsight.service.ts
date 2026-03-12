import { PrismaClient } from "@prisma/client";
import { generateAssessmentInsightWithGemini } from "../../utils/gemini.client";

const prisma = new PrismaClient();

function countTelemetry(events: Array<{ type: string }>) {
  const c = (t: string) => events.filter((e) => String(e.type) === t).length;
  return {
    copyPaste: c("COPY_PASTE"),
    tabSwitch: c("TAB_SWITCH"),
    focusLost: c("FOCUS_LOST"),
    fullscreenExit: c("FULLSCREEN_EXIT"),
    networkIssue: c("NETWORK_ISSUE"),
  };
}

export class CandidateAssessmentInsightService {
  static async generateAndStore(sessionId: string) {
    const session = await prisma.candidateAssessmentSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        status: true,
        assessment_id: true,
        candidate_id: true,
        total_score: true,
        passed: true,
        result_summary: true,
        started_at: true,
        submitted_at: true,
        assessment: {
          select: {
            title: true,
            difficulty: true,
            skill_category: true,
            passing_score: true,
            time_limit: true,
          },
        },
        candidate: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "SUBMITTED") return { ok: true, skipped: true };

    const aq = await prisma.assessmentQuestion.findMany({
      where: { assessment_id: session.assessment_id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: {
        question_id: true,
        points: true,
        section: true,
        order: true,
        question: {
          select: {
            id: true,
            title: true,
            description: true,
            problemStatement: true,
            difficulty: true,
            skillTags: true,
            type: true,
            canonicalSolution: true,
            testCases: true,
            options: true,
            correctAnswer: true,
            explanation: true,
          },
        },
      },
    });

    const answers = await prisma.candidateAssessmentAnswer.findMany({
      where: { session_id: sessionId },
      select: {
        question_id: true,
        state: true,
        answer: true,
        time_spent_sec: true,
        attempts: true,
        latest_submission_id: true,
      },
    });

    const qIds = aq.map((x) => x.question_id);

    const submissions = await prisma.codeSubmission.findMany({
      where: {
        assessment_id: session.assessment_id,
        candidate_id: session.candidate_id,
        question_id: { in: qIds },
      },
      orderBy: [{ created_at: "desc" }],
      select: {
        submission_id: true,
        question_id: true,
        status: true,
        score: true,
        runtime_ms: true,
        memory_kb: true,
        result: true,
        error: true,
        created_at: true,
        ended_at: true,
      },
    });

    const telemetryEvents = await prisma.candidateAssessmentTelemetryEvent.findMany({
      where: { session_id: sessionId },
      select: { type: true, payload: true, created_at: true },
      orderBy: { created_at: "asc" },
    });

    const telemetrySummary = {
      counts: countTelemetry(telemetryEvents.map((e) => ({ type: String(e.type) }))),
      totalEvents: telemetryEvents.length,
    };

    const payload = {
      sessionId: session.session_id,
      assessmentId: session.assessment_id,
      assessmentTitle: session.assessment?.title ?? null,
      jobId: null, // optional if you want later
      candidate: {
        candidateId: session.candidate.user_id,
        name: session.candidate.full_name,
        email: session.candidate.email,
      },
      final: {
        totalScore: session.total_score ?? null,
        passed: session.passed ?? null,
        passingScore: session.assessment?.passing_score ?? 70,
        startedAt: session.started_at?.toISOString?.() ?? null,
        submittedAt: session.submitted_at?.toISOString?.() ?? null,
      },
      questions: aq.map((x) => ({
        id: x.question.id,
        title: x.question.title,
        type: x.question.type,
        difficulty: x.question.difficulty,
        skillTags: x.question.skillTags,
        points: x.points ?? 1,
        section: x.section ?? null,
        canonicalSolution: x.question.canonicalSolution,
        testCases: x.question.testCases,
        mcq: {
          options: x.question.options,
          correctAnswer: x.question.correctAnswer,
          explanation: x.question.explanation,
        },
      })),
      answers: answers.map((a) => ({
        questionId: a.question_id,
        state: a.state,
        answer: a.answer,
        timeSpentSec: a.time_spent_sec ?? null,
        attempts: a.attempts ?? 0,
        latestSubmissionId: a.latest_submission_id ?? null,
      })),
      submissions,
      telemetry: telemetrySummary,
      scoringBreakdown: (session.result_summary as any)?.questions ?? null,
      radar_tag: (session.result_summary as any)?.radar_tag ?? null, // fallback input for Gemini
    };

    // 🔥 Gemini call (dynamic clustering)
    const ai = await generateAssessmentInsightWithGemini(payload);

    /**
     * ✅ We store both radar_categories + radar_ai inside radar_ai JSON field.
     * No Prisma change needed.
     */
    const radar_ai_payload = {
      radar_categories: ai.radar_categories ?? [],
      radar_ai: ai.radar_ai ?? [],
    };

    const saved = await prisma.candidateAssessmentInsight.upsert({
      where: { session_id: sessionId },
      create: {
        session_id: sessionId,
        summary: ai.summary ?? null,
        kpis: (ai.kpis ?? null) as any,
        radar_ai: radar_ai_payload as any,
        strengths: (ai.strengths ?? null) as any,
        weaknesses: (ai.weaknesses ?? null) as any,
        recommendations: (ai.recommendations ?? null) as any,
        evidence_by_skill: (ai.evidence_by_skill ?? null) as any,
        risk_flags: (ai.kpis?.riskLevel
          ? { level: ai.kpis.riskLevel, anomalies: ai.kpis.anomalies ?? [] }
          : null) as any,
        model_name: "gemini",
        model_version: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        confidence: typeof ai.confidence === "number" ? ai.confidence : 0.65,
        generated_at: new Date(),
      },
      update: {
        summary: ai.summary ?? null,
        kpis: (ai.kpis ?? null) as any,
        radar_ai: radar_ai_payload as any,
        strengths: (ai.strengths ?? null) as any,
        weaknesses: (ai.weaknesses ?? null) as any,
        recommendations: (ai.recommendations ?? null) as any,
        evidence_by_skill: (ai.evidence_by_skill ?? null) as any,
        risk_flags: (ai.kpis?.riskLevel
          ? { level: ai.kpis.riskLevel, anomalies: ai.kpis.anomalies ?? [] }
          : null) as any,
        model_name: "gemini",
        model_version: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        confidence: typeof ai.confidence === "number" ? ai.confidence : 0.65,
        generated_at: new Date(),
      },
      select: {
        insight_id: true,
        session_id: true,
        generated_at: true,
      },
    });

    return { ok: true, insight: saved };
  }
}

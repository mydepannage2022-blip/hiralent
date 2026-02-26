import { PrismaClient } from "@prisma/client";
import { getEffectiveDeadline, autoSubmitIfExpired } from "./sessionDeadline.util";

const prisma = new PrismaClient();

const now = () => new Date();

function secondsBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
}

export class CandidateAssessmentSessionService {
  static async startSession(candidateId: string, assessmentId: string) {
    // ✅ must have accepted invite
    const inv = await prisma.candidateAssessmentInvite.findFirst({
      where: {
        candidate_id: candidateId,
        assessment_id: assessmentId,
        status: "ACCEPTED",
      },
      select: { invite_id: true, expires_at: true, status: true },
    });

    if (!inv) throw new Error("ASSESSMENT_INVITE_REQUIRED");

    // ✅ If invite already expired, block start
    if (inv.expires_at && inv.expires_at.getTime() <= Date.now()) {
      await prisma.candidateAssessmentInvite.updateMany({
        where: { invite_id: inv.invite_id },
        data: { status: "EXPIRED" },
      });
      throw new Error("ASSESSMENT_INVITE_EXPIRED");
    }

    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: assessmentId },
      select: {
        assessment_id: true,
        time_limit: true,
        total_questions: true,
        status: true,
        company_id: true,
      },
    });

    if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");
    if (assessment.status !== "ACTIVE") throw new Error("ASSESSMENT_NOT_ACTIVE");

    // prevent multiple active sessions
    const existing = await prisma.candidateAssessmentSession.findFirst({
      where: {
        candidate_id: candidateId,
        assessment_id: assessmentId,
        status: { in: ["IN_PROGRESS"] },
      },
      select: { session_id: true },
    });

    if (existing) return existing;
// 0) If already submitted -> block retake
const submitted = await prisma.candidateAssessmentSession.findFirst({
  where: {
    candidate_id: candidateId,
    assessment_id: assessmentId,
    status: "SUBMITTED",
  },
  select: { session_id: true },
});

if (submitted) {
  const err: any = new Error("ALREADY_SUBMITTED");
  err.statusCode = 409;
  throw err;
}

// 1) If in progress -> resume existing session (optional but recommended)
const inProgress = await prisma.candidateAssessmentSession.findFirst({
  where: {
    candidate_id: candidateId,
    assessment_id: assessmentId,
    status: "IN_PROGRESS",
  },
  select: { session_id: true },
});

if (inProgress) {
  return { session_id: inProgress.session_id };
}

    const startedAt = now();

    // ✅ IMPORTANT: session.expires_at = started + time_limit (NEVER invite.expires_at)
    const expiresAt =
      typeof assessment.time_limit === "number" && assessment.time_limit > 0
        ? new Date(startedAt.getTime() + assessment.time_limit * 60 * 1000)
        : null;

    const session = await prisma.candidateAssessmentSession.create({
      data: {
        candidate_id: candidateId,
        assessment_id: assessmentId,
        status: "IN_PROGRESS",
        started_at: startedAt,
        last_activity_at: startedAt,
        expires_at: expiresAt,
        time_limit_min: assessment.time_limit ?? null,
        current_index: 0,
        flagged: [],
      },
      select: { session_id: true },
    });

    // link session into invite
    await prisma.candidateAssessmentInvite.updateMany({
      where: { invite_id: inv.invite_id },
      data: { session_id: session.session_id },
    });

    return session;
  }

  static async getSession(sessionId: string, candidateId: string) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      select: {
        session_id: true,
        assessment_id: true,
        candidate_id: true,
        status: true,
        started_at: true,
        expires_at: true,
        submitted_at: true,
        current_index: true,
        flagged: true,
        time_limit_min: true,
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");

    const assessment = await prisma.employerAssessment.findUnique({
      where: { assessment_id: session.assessment_id },
      select: { assessment_id: true, time_limit: true, total_questions: true },
    });

    if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");

    // ✅ effective deadline = min(session time_limit, invite deadline)
    const effectiveExpiresAt = await getEffectiveDeadline({
      session_id: session.session_id,
      candidate_id: candidateId,
      assessment_id: session.assessment_id,
      started_at: session.started_at,
      expires_at: session.expires_at,
    });

    // ✅ HackerRank: if expired & in progress => AUTO SUBMIT
    if (
      session.status === "IN_PROGRESS" &&
      effectiveExpiresAt &&
      effectiveExpiresAt.getTime() <= now().getTime()
    ) {
      await autoSubmitIfExpired({
        sessionId: session.session_id,
        candidateId,
        reason: "INVITE_OR_TIME_DEADLINE",
      });

      session.status = "SUBMITTED"; // reflect locally
    }

    const remaining =
      effectiveExpiresAt ? secondsBetween(now(), effectiveExpiresAt) : 0;

    const finalCount = await prisma.candidateAssessmentAnswer.count({
      where: { session_id: sessionId, state: "FINAL" },
    });

    const flaggedCount = (session.flagged ?? []).length;

    return {
      session_id: session.session_id,
      assessment_id: session.assessment_id,
      candidate_id: session.candidate_id,
      status: session.status,
      started_at: session.started_at.toISOString(),
      expires_at: effectiveExpiresAt ? effectiveExpiresAt.toISOString() : null,
      submitted_at: session.submitted_at?.toISOString() ?? null,
      time_limit_minutes: assessment.time_limit ?? session.time_limit_min ?? null,
      remaining_seconds: remaining,
      current_index: session.current_index ?? 0,
      progress: {
        total: assessment.total_questions ?? 0,
        answered: finalCount,
        flagged: flaggedCount,
        current_index: session.current_index ?? 0,
      },
    };
  }

  static async getSessionQuestions(sessionId: string, candidateId: string) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      select: { assessment_id: true, status: true },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const rows = await prisma.assessmentQuestion.findMany({
      where: { assessment_id: session.assessment_id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: {
        question: {
          select: {
            id: true,
            title: true,
            description: true,
            problemStatement: true,
            difficulty: true,
            skillTags: true,
            type: true,
            options: true,
            hasDiagram: true,
            diagramType: true,
            diagramCode: true,
            diagramImageUrl: true,
          },
        },
      },
    });

    return rows.map((r, idx) => ({
      question_id: r.question_id,
      order: r.order ?? idx,
      points: r.points ?? 1,
      section: r.section ?? null,
      type: r.question.type,

      title: r.question.title,
      description: r.question.description,
      problemStatement: r.question.problemStatement,
      difficulty: r.question.difficulty,
      skillTags: r.question.skillTags,

      options: r.question.options ?? null,

      hasDiagram: r.question.hasDiagram,
      diagramType: r.question.diagramType,
      diagramCode: r.question.diagramCode,
      diagramImageUrl: r.question.diagramImageUrl,
    }));
  }

  static async setNavigation(sessionId: string, candidateId: string, idx: number) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      select: {
        session_id: true,
        candidate_id: true,
        status: true,
        expires_at: true,
        started_at: true,
        assessment_id: true,
      },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "IN_PROGRESS") throw new Error("SESSION_LOCKED");

    const effectiveDeadline = await getEffectiveDeadline({
      session_id: sessionId,
      candidate_id: candidateId,
      assessment_id: session.assessment_id,
      started_at: session.started_at,
      expires_at: session.expires_at,
    });

    if (effectiveDeadline && effectiveDeadline.getTime() <= Date.now()) {
      await autoSubmitIfExpired({
        sessionId,
        candidateId,
        reason: "INVITE_OR_TIME_DEADLINE",
      });
      throw new Error("SESSION_EXPIRED");
    }

    await prisma.candidateAssessmentSession.update({
      where: { session_id: sessionId },
      data: { current_index: idx, last_activity_at: now() },
    });

    return { ok: true };
  }
}

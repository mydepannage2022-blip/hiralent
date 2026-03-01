import { PrismaClient } from "@prisma/client";
import { getEffectiveDeadline, autoSubmitIfExpired } from "./sessionDeadline.util";

const prisma = new PrismaClient();

function isMCQPayload(p: any): p is { selectedOptionIds: string[] } {
  return p && Array.isArray(p.selectedOptionIds);
}

function normalizeQuestionOptions(options: any): any[] | null {
  if (!options) return null;
  if (Array.isArray(options?.options)) return options.options;
  if (Array.isArray(options)) return options;
  return null;
}

export class CandidateAssessmentAnswerService {
  static async saveAnswer(
    sessionId: string,
    candidateId: string,
    questionId: string,
    payload: any,
    isFinal: boolean,
    isFlagged?: boolean
  ) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      select: {
        session_id: true,
        status: true,
        expires_at: true,
        assessment_id: true,
        started_at: true,
        flagged: true,
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

    const link = await prisma.assessmentQuestion.findFirst({
      where: { assessment_id: session.assessment_id, question_id: questionId },
      select: { id: true },
    });
    if (!link) throw new Error("QUESTION_NOT_IN_ASSESSMENT");

    const q = await prisma.question.findUnique({
      where: { id: questionId },
      select: { type: true, options: true },
    });
    if (!q) throw new Error("QUESTION_NOT_FOUND");

    const typeLower = String(q.type || "").toLowerCase();
    const isMcq = typeLower.includes("mcq");

    if (isMcq) {
      if (!isMCQPayload(payload)) throw new Error("INVALID_MCQ_PAYLOAD");
      const optList = normalizeQuestionOptions(q.options);
      if (optList) {
        const allowed = new Set(
          optList.map((o: any) => String(o.id ?? o.option_id ?? o.value ?? o.key))
        );
        for (const id of payload.selectedOptionIds) {
          if (!allowed.has(String(id))) throw new Error("INVALID_OPTION_ID");
        }
      }
    }

    const row = await prisma.candidateAssessmentAnswer.upsert({
      where: { session_id_question_id: { session_id: sessionId, question_id: questionId } },
      create: {
        session_id: sessionId,
        question_id: questionId,
        state: isFinal ? "FINAL" : "DRAFT",
        answer: payload as any,
        last_saved_at: new Date(),
      },
      update: {
        state: isFinal ? "FINAL" : "DRAFT",
        answer: payload as any,
        last_saved_at: new Date(),
      },
      select: {
        session_id: true,
        question_id: true,
        state: true,
        last_saved_at: true,
        updated_at: true,
      },
    });

    if (typeof isFlagged === "boolean") {
      const flaggedSet = new Set(session.flagged ?? []);
      if (isFlagged) flaggedSet.add(questionId);
      else flaggedSet.delete(questionId);

      await prisma.candidateAssessmentSession.update({
        where: { session_id: sessionId },
        data: { flagged: Array.from(flaggedSet), last_activity_at: new Date() },
      });
    }

    const flaggedNow =
      typeof isFlagged === "boolean"
        ? isFlagged
        : (session.flagged ?? []).includes(questionId);

    return {
      session_id: row.session_id,
      question_id: row.question_id,
      state: row.state,
      is_flagged: flaggedNow,
      updated_at: (row.updated_at ?? new Date()).toISOString(),
    };
  }

  static async getAnswers(sessionId: string, candidateId: string) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      select: { session_id: true, flagged: true },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const answers = await prisma.candidateAssessmentAnswer.findMany({
      where: { session_id: sessionId },
      select: {
        question_id: true,
        state: true,
        answer: true,
        last_saved_at: true,
        updated_at: true,
      },
    });

    const flaggedSet = new Set(session.flagged ?? []);

    return answers.map((a) => ({
      question_id: a.question_id,
      state: a.state,
      answer: a.answer ?? null,
      is_flagged: flaggedSet.has(a.question_id),
      updated_at: (a.updated_at ?? new Date()).toISOString(),
      last_saved_at: (a.last_saved_at ?? new Date()).toISOString(),
    }));
  }
}

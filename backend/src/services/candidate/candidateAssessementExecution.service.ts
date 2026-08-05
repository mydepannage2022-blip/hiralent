import prisma from '../../lib/prisma';
import { enqueueRun } from "../../workers/queue";
import { getEffectiveDeadline, autoSubmitIfExpired } from "./sessionDeadline.util";


type CreateRunSubmissionInput = {
  sessionId: string;
  candidateId: string;
  questionId: string;
  language: string;
  code: string;
};

function normalizeLanguage(lang: string) {
  return String(lang || "").trim().toLowerCase();
}

// ✅ ADDED: same helper as simpleTest.service.ts
function extractSuiteFromTestCases(testCases: any): any[] {
  if (!testCases) return [];
  if (Array.isArray(testCases)) return testCases;
  if (typeof testCases === "string") {
    try { const p = JSON.parse(testCases); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  if (typeof testCases === "object") {
    if (Array.isArray(testCases.tests)) return testCases.tests;
    if (Array.isArray(testCases.testCases)) return testCases.testCases;
    if (Array.isArray(testCases.publicTests)) return testCases.publicTests;
    if (Array.isArray(testCases.inputs) && Array.isArray(testCases.outputs)) {
      const n = Math.min(testCases.inputs.length, testCases.outputs.length);
      return Array.from({ length: n }, (_, i) => ({ input: testCases.inputs[i], expected: testCases.outputs[i] }));
    }
  }
  return [];
}

export class ExecutionService {
  static async createRunSubmission(input: CreateRunSubmissionInput) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: input.sessionId, candidate_id: input.candidateId },
      select: {
        session_id: true,
        candidate_id: true,
        status: true,
        expires_at: true,
        assessment_id: true,
        started_at: true,
      },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "IN_PROGRESS") throw new Error("SESSION_LOCKED");

    const effectiveDeadline = await getEffectiveDeadline({
      session_id: input.sessionId,
      candidate_id: input.candidateId,
      assessment_id: session.assessment_id,
      started_at: session.started_at,
      expires_at: session.expires_at,
    });

    if (effectiveDeadline && effectiveDeadline.getTime() <= Date.now()) {
      await autoSubmitIfExpired({
        sessionId: input.sessionId,
        candidateId: input.candidateId,
        reason: "INVITE_OR_TIME_DEADLINE",
      });
      throw new Error("SESSION_EXPIRED");
    }

    const link = await prisma.assessmentQuestion.findFirst({
      where: { assessment_id: session.assessment_id, question_id: input.questionId },
      select: { id: true },
    });
    if (!link) throw new Error("QUESTION_NOT_IN_ASSESSMENT");

    // ✅ ADDED: load testCases + extract suite (same as simpleTest.service.ts)
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      select: { testCases: true },
    });
    const suite = extractSuiteFromTestCases(question?.testCases);

    console.info("[execution.createRunSubmission]", {
      questionId: input.questionId,
      loadedTestsCount: suite.length,
    });

    const submission = await prisma.codeSubmission.create({
      data: {
        assessment_id: session.assessment_id,
        candidate_id: input.candidateId,
        question_id: input.questionId,
        language: normalizeLanguage(input.language),
        code: input.code,
        status: "QUEUED",
        evidence: {
          session_id: input.sessionId,
          kind: "candidate_assessment_session_run",
          loadedTestsCount: suite.length, // ✅ useful for debugging
        },
      },
      select: {
        submission_id: true,
        assessment_id: true,
        question_id: true,
        candidate_id: true,
        status: true,
      },
    });

    await prisma.candidateAssessmentAnswer.upsert({
      where: { session_id_question_id: { session_id: input.sessionId, question_id: input.questionId } },
      create: {
        session_id: input.sessionId,
        question_id: input.questionId,
        state: "DRAFT",
        answer: { language: normalizeLanguage(input.language), code: input.code },
        attempts: 1,
        latest_submission_id: submission.submission_id,
        last_saved_at: new Date(),
      },
      update: {
        answer: { language: normalizeLanguage(input.language), code: input.code },
        attempts: { increment: 1 },
        latest_submission_id: submission.submission_id,
        last_saved_at: new Date(),
        updated_at: new Date(),
      } as any,
    });

    // ✅ CHANGED: pass suite to worker exactly like simpleTest.service.ts
    await enqueueRun({
      submissionId: submission.submission_id,
      assessmentId: submission.assessment_id,
      questionId: submission.question_id,
      language: normalizeLanguage(input.language),
      suite, // ✅ THIS was the only missing piece
    } as any);

    return {
      submission_id: submission.submission_id,
      status: submission.status,
    };
  }

  static async getSubmission(candidateId: string, submissionId: string) {
    const s = await prisma.codeSubmission.findFirst({
      where: { submission_id: submissionId, candidate_id: candidateId },
      select: {
        submission_id: true,
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

    if (!s) throw new Error("SUBMISSION_NOT_FOUND");

    return {
      submission_id: s.submission_id,
      status: s.status,
      score: s.score ?? null,
      runtime_ms: s.runtime_ms ?? null,
      memory_kb: s.memory_kb ?? null,
      result: s.result ?? null,
      error: s.error ?? null,
      created_at: s.created_at ? s.created_at.toISOString() : null,
      ended_at: s.ended_at ? s.ended_at.toISOString() : null,
    };
  }
}
// backend/src/services/candidate/simpleTest.service.ts
import {
  Prisma,
  PrismaClient,
  SimpleTestAttemptStatus,
  SimpleTestInviteStatus,
} from "@prisma/client";
import { enqueueRun } from "../../workers/queue";
// Per-question scoring math delegated to the pure core (Wave 4 / S5, R-37) — same
// MCQ/coding rules as the real employer assessment. Only the simple-test lifecycle
// (attempts, timers, ownership, persistence) stays here.
import {
  scoreMcq,
  resolveCodingScore,
  extractTestsPassed,
  extractTestsTotal,
  weightedTotal,
} from "../../utils/assessment-scoring-core";

/**
 * ================================
 * Types
 * ================================
 */
type SubmitAnswers = Record<
  string,
  | { selectedOptionId?: string; selectedOptionIds?: string[] } // MCQ (support both shapes)
  | { code?: string; language?: string } // CODING
  | any
>;

/** For the "Run" button (execution only) */
type RunCodingInput = {
  attemptId: string;
  questionId: string;
  language: string;
  code: string;
};

/**
 * ================================
 * Helpers (aligned with real assessment)
 * ================================
 */

/** normalize language like the real assessment */
function normalizeLanguage(lang: string) {
  return String(lang || "").trim().toLowerCase();
}

function assertNonEmptyString(v: any, name: string) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`${name}_REQUIRED`);
  }
}

/** Narrow Prisma.JsonValue safely */
function isJsonObject(v: unknown): v is Prisma.JsonObject {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function getJsonStringField(
  v: Prisma.JsonValue | null | undefined,
  key: string
): string | null {
  if (!isJsonObject(v)) return null;
  const val = v[key];
  return typeof val === "string" ? val : null;
}

function getJsonAnyField(
  v: Prisma.JsonValue | null | undefined,
  key: string
): Prisma.JsonValue | null {
  if (!isJsonObject(v)) return null;
  return (v as Prisma.JsonObject)[key] ?? null;
}

/**
 * Extract suite from your Question.testCases Json.
 *
 * Your schema comment says: { inputs: [], outputs: [] }
 * But your runner may want an array of objects.
 *
 * This supports:
 * - array directly
 * - { tests: [...] }
 * - { testCases: [...] }
 * - { inputs: [...], outputs: [...] }  -> converted to [{ input, expected }]
 */
function extractSuiteFromTestCases(testCases: Prisma.JsonValue): any[] {
  if (!testCases) return [];

  // If already an array of test objects
  if (Array.isArray(testCases)) return testCases;

  if (typeof testCases === "string") {
    try {
      const parsed = JSON.parse(testCases);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (typeof testCases === "object" && testCases !== null) {
    const obj: any = testCases;

    if (Array.isArray(obj.tests)) return obj.tests;
    if (Array.isArray(obj.testCases)) return obj.testCases;
    if (Array.isArray(obj.publicTests)) return obj.publicTests;

    // Your declared shape: { inputs: [], outputs: [] }
    if (Array.isArray(obj.inputs) && Array.isArray(obj.outputs)) {
      const inputs = obj.inputs;
      const outputs = obj.outputs;
      const n = Math.min(inputs.length, outputs.length);

      const arr: any[] = [];
      for (let i = 0; i < n; i++) {
        arr.push({
          input: inputs[i],
          expected: outputs[i],
        });
      }
      return arr;
    }
  }

  return [];
}

/**
 * Language rules:
 * You DON'T have requiredLanguage/allowedLanguages columns.
 * So we read them from Question.metadata (Json?) if present.
 *
 * Supported keys (choose whatever you store):
 * - metadata.requiredLanguage (string)
 * - metadata.allowedLanguages (string[])
 */
function extractLanguageRulesFromMetadata(metadata: Prisma.JsonValue | null) {
  const requiredRaw = getJsonStringField(metadata, "requiredLanguage");
  const allowedRaw = getJsonAnyField(metadata, "allowedLanguages");

  const required = normalizeLanguage(requiredRaw ?? "");

  const allowed =
    Array.isArray(allowedRaw) && allowedRaw.length > 0
      ? allowedRaw.map((x) => normalizeLanguage(String(x))).filter(Boolean)
      : null;

  return { required, allowed };
}

/**
 * ================================
 * Service
 * ================================
 */
export class SimpleTestService {
  constructor(private prisma: PrismaClient) {}

  /**
   * ✅ NEW LOGIC:
   * - Unlimited attempts: each start => new attempt row with attempt_no++
   * - Simple Test must NEVER block the real assessment
   * - We do NOT reject based on invite expires_at (warm-up only)
   */
  async startAttempt(candidateId: string, inviteId: string) {
    const inv = await this.prisma.candidateJobSimpleTestInvite.findUnique({
      where: { invite_id: inviteId },
      select: {
        invite_id: true,
        candidate_id: true,
        test_id: true,
        job_id: true,
        application_id: true,
        status: true,
        expires_at: true,
        test: { select: { time_limit_min: true } },
      },
    });

    if (!inv) throw new Error("INVITE_NOT_FOUND");
    if (inv.candidate_id !== candidateId) throw new Error("FORBIDDEN");

    const now = new Date();

    const timeLimitMin = inv.test?.time_limit_min ?? 10;
    const attemptExpiresAt = new Date(now.getTime() + timeLimitMin * 60 * 1000);

    // ✅ compute next attempt_no per application (unlimited)
    const last = await this.prisma.candidateJobSimpleTestAttempt.findFirst({
      where: { application_id: inv.application_id },
      orderBy: { attempt_no: "desc" },
      select: { attempt_no: true },
    });
    const nextAttemptNo = (last?.attempt_no ?? 0) + 1;

    // ✅ UX: if invite still pending => mark accepted (does NOT gate anything)
    if (inv.status === SimpleTestInviteStatus.PENDING) {
      await this.prisma.candidateJobSimpleTestInvite.update({
        where: { invite_id: inv.invite_id },
        data: {
          status: SimpleTestInviteStatus.ACCEPTED,
          accepted_at: new Date(),
        },
      });
    }

    // ✅ Always create a NEW attempt (no upsert on invite_id)
    const attempt = await this.prisma.candidateJobSimpleTestAttempt.create({
      data: {
        invite_id: inv.invite_id,
        test_id: inv.test_id,
        candidate_id: candidateId,
        job_id: inv.job_id,
        application_id: inv.application_id,
        attempt_no: nextAttemptNo,
        status: SimpleTestAttemptStatus.IN_PROGRESS,
        started_at: now,
        expires_at: attemptExpiresAt,
      },
      select: {
        attempt_id: true,
        expires_at: true,
        status: true,
        attempt_no: true,
      },
    });

    return {
      ok: true,
      attempt_id: attempt.attempt_id,
      attempt_no: attempt.attempt_no,
      expires_at: attempt.expires_at,
      status: attempt.status,
    };
  }

  async getTest(candidateId: string, attemptId: string) {
    const attempt = await this.prisma.candidateJobSimpleTestAttempt.findUnique({
      where: { attempt_id: attemptId },
      select: {
        attempt_id: true,
        candidate_id: true,
        status: true,
        expires_at: true,

        // ✅ expose these
        attempt_no: true,
        submitted_at: true,
        score: true,

        test: {
          select: {
            test_id: true,
            title: true,
            description: true,
            time_limit_min: true,
            questions: {
              orderBy: [{ order: "asc" }],
              select: {
                kind: true,
                order: true,
                question: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    problemStatement: true,
                    difficulty: true,
                    type: true,
                    skillTags: true,
                    options: true,
                    explanation: true,

                    // ✅ optional: expose metadata if you want UI to know language lock
                    metadata: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
    if (attempt.candidate_id !== candidateId) throw new Error("FORBIDDEN");
    if (!attempt.test) throw new Error("TEST_NOT_FOUND");

    const questions = (attempt.test.questions || []).map((q) => {
      const base = {
        id: q.question.id,
        kind: q.kind,
        order: q.order ?? null,
        title: q.question.title,
        difficulty: q.question.difficulty,
        skillTags: q.question.skillTags,
        type: q.question.type,
      };

      // optional: send language lock info if stored in metadata
      const { required, allowed } = extractLanguageRulesFromMetadata(
        q.question.metadata ?? null
      );
      const languageRules =
        required || (allowed && allowed.length > 0)
          ? { requiredLanguage: required || null, allowedLanguages: allowed ?? null }
          : null;

      if (q.kind === "MCQ") {
        return {
          ...base,
          prompt: q.question.description,
          options: q.question.options ?? null,
          languageRules,
        };
      }

      return {
        ...base,
        prompt: q.question.problemStatement || q.question.description,
        languageRules,
      };
    });

    return {
      attempt_id: attempt.attempt_id,
      status: attempt.status,
      expires_at: attempt.expires_at,

      attempt_no: attempt.attempt_no ?? null,
      submitted_at: attempt.submitted_at ? attempt.submitted_at.toISOString() : null,
      score: typeof attempt.score === "number" ? attempt.score : null,

      test: {
        title: attempt.test.title,
        description: attempt.test.description,
        time_limit_min: attempt.test.time_limit_min,
        questions,
      },
    };
  }

  /* ============================================================
     ✅ RUN (like real assessment session)
     - Creates a CodeSubmission row
     - Enqueues runner execution
     - Stores a "draft" code in attempt.answers (best-effort)

     ✅ FIXED FOR YOUR SCHEMA:
     - Uses Question.testCases as suite (no tests/publicTests columns)
     - Uses Question.metadata for language lock (no requiredLanguage/allowedLanguages columns)
     ============================================================ */
  async runCoding(candidateId: string, input: RunCodingInput) {
    assertNonEmptyString(input.attemptId, "attemptId");
    assertNonEmptyString(input.questionId, "questionId");
    assertNonEmptyString(input.language, "language");
    assertNonEmptyString(input.code, "code");

    const attempt = await this.prisma.candidateJobSimpleTestAttempt.findUnique({
      where: { attempt_id: input.attemptId },
      select: {
        attempt_id: true,
        candidate_id: true,
        status: true,
        expires_at: true,
        test_id: true,
        answers: true,
      },
    });

    if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
    if (attempt.candidate_id !== candidateId) throw new Error("FORBIDDEN");

    // Must be active for Run
    if (attempt.status !== SimpleTestAttemptStatus.IN_PROGRESS) {
      throw new Error("ATTEMPT_LOCKED");
    }

    // Enforce attempt timer
    const now = new Date();
    if (attempt.expires_at && now.getTime() > attempt.expires_at.getTime()) {
      await this.prisma.candidateJobSimpleTestAttempt.update({
        where: { attempt_id: input.attemptId },
        data: { status: SimpleTestAttemptStatus.EXPIRED },
      });
      throw new Error("ATTEMPT_EXPIRED");
    }

    /**
     * ✅ Guard question belongs to attempt's test
     */
    const link = await this.prisma.jobSimpleTestQuestion.findFirst({
      where: { test_id: attempt.test_id, question_id: input.questionId },
      select: { question_id: true, kind: true },
    });
    if (!link) throw new Error("QUESTION_NOT_IN_ATTEMPT");
    if (link.kind !== "CODING") throw new Error("QUESTION_NOT_CODING");

    const lang = normalizeLanguage(input.language);

    /**
     * ✅ Load only fields that EXIST in your Prisma schema
     */
    const q = await this.prisma.question.findUnique({
      where: { id: input.questionId },
      select: {
        id: true,
        testCases: true,  // ✅ exists
        metadata: true,   // ✅ exists
        parameters: true, // ✅ exists (optional, if you use it)
      },
    });

    if (!q) throw new Error("QUESTION_NOT_FOUND");

    /**
     * ✅ Server-side language enforcement (from metadata)
     */
    const { required, allowed } = extractLanguageRulesFromMetadata(q.metadata ?? null);

    if (required && lang !== required) throw new Error("LANGUAGE_LOCKED");
    if (allowed && allowed.length > 0 && !allowed.includes(lang)) {
      throw new Error("LANGUAGE_NOT_ALLOWED");
    }

    /**
     * ✅ Extract suite ONLY from testCases
     */
    const suite = extractSuiteFromTestCases(q.testCases as any);

    const loadedTestsCount = suite.length;
    const firstExpected =
      loadedTestsCount > 0
        ? String(
            (suite[0] as any)?.expected ??
              (suite[0] as any)?.expectedOutput ??
              (suite[0] as any)?.stdout_expected ??
              (suite[0] as any)?.out ??
              (suite[0] as any)?.expectedResult ??
              ""
          )
        : "";

    console.info("[simpleTest.runCoding] mapping", {
      attemptId: attempt.attempt_id,
      questionId: input.questionId,
      loadedTestsCount,
      firstExpected: firstExpected?.slice?.(0, 120) ?? firstExpected,
      requiredLanguage: required || null,
      allowedLanguages: allowed ?? null,
    });

    /**
     * Create a submission row
     */
    const submission = await this.prisma.codeSubmission.create({
      data: {
        assessment_id: attempt.test_id as any,
        candidate_id: candidateId,
        question_id: input.questionId,
        language: lang,
        code: input.code,
        status: "QUEUED",
        evidence: {
          kind: "simple_test_attempt_run",
          attempt_id: attempt.attempt_id,
          test_id: attempt.test_id,
          question_id: input.questionId,
          loadedTestsCount,
          firstExpected: firstExpected?.slice?.(0, 200) ?? firstExpected,
          language: lang,

          // optional debugging / future use
          requiredLanguage: required || null,
          allowedLanguages: allowed ?? null,

          // ✅ pass suite to worker
          suite,
        } as Prisma.InputJsonObject,
      },
      select: {
        submission_id: true,
        assessment_id: true,
        question_id: true,
        candidate_id: true,
        status: true,
      },
    });

    // Best-effort: store draft code in attempt.answers
    try {
      const prev = isJsonObject(attempt.answers)
        ? attempt.answers
        : ({} as Prisma.JsonObject);

      const prevQ = isJsonObject(prev[input.questionId])
        ? (prev[input.questionId] as Prisma.JsonObject)
        : {};

      const merged: Prisma.InputJsonObject = {
        ...prev,
        [input.questionId]: {
          ...prevQ,
          code: input.code,
          language: lang,
          last_run_submission_id: submission.submission_id,
          last_run_at: now.toISOString(),
        },
      };

      await this.prisma.candidateJobSimpleTestAttempt.update({
        where: { attempt_id: input.attemptId },
        data: { answers: merged },
      });
    } catch {
      // ignore
    }

    /**
     * Enqueue runner execution
     */
    await enqueueRun({
      submissionId: submission.submission_id,
      assessmentId: submission.assessment_id as any,
      questionId: submission.question_id,
      language: lang,

      attemptId: attempt.attempt_id,
      suite,
      loadedTestsCount,
      firstExpected: firstExpected?.slice?.(0, 200) ?? firstExpected,
    } as any);

    return { submission_id: submission.submission_id, status: submission.status };
  }

  /** GET submission (same as real assessment), but ensures candidate ownership */
  async getSubmission(candidateId: string, submissionId: string) {
    assertNonEmptyString(submissionId, "submissionId");

    const s = await this.prisma.codeSubmission.findFirst({
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
        evidence: true,
      },
    });

    if (!s) throw new Error("SUBMISSION_NOT_FOUND");

    // Optional safety: ensure it is a simple-test submission
    const kind = getJsonStringField(s.evidence, "kind");
    if (kind && kind !== "simple_test_attempt_run") {
      throw new Error("SUBMISSION_FORBIDDEN_KIND");
    }

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

  /**
   * ✅ Score "like real assessment" (but simple test constraints):
   * - Candidate-only score (no company notification)
   * - Enforces attempt timer (expires_at) for THIS attempt
   * - MCQ: 100 if selected == correct (set compare), else 0
   * - CODING: use BEST (or LAST) submission score from codeSubmission, else 0
   * - Total score: weighted average by points (default 1 each)
   */
  async submit(candidateId: string, attemptId: string, answers: SubmitAnswers) {
    const attempt = await this.prisma.candidateJobSimpleTestAttempt.findUnique({
      where: { attempt_id: attemptId },
      select: {
        attempt_id: true,
        candidate_id: true,
        status: true,
        expires_at: true,
        test_id: true,
      },
    });

    if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
    if (attempt.candidate_id !== candidateId) throw new Error("FORBIDDEN");

    if (attempt.status === SimpleTestAttemptStatus.SUBMITTED) {
      return { ok: true, alreadySubmitted: true };
    }

    const now = new Date();
    if (attempt.expires_at && now.getTime() > attempt.expires_at.getTime()) {
      await this.prisma.candidateJobSimpleTestAttempt.update({
        where: { attempt_id: attemptId },
        data: { status: SimpleTestAttemptStatus.EXPIRED },
      });
      throw new Error("ATTEMPT_EXPIRED");
    }

    // Load questions of this simple test (need correctAnswer + type + options)
    const testQs = await this.prisma.jobSimpleTestQuestion.findMany({
      where: { test_id: attempt.test_id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: {
        kind: true,
        question: {
          select: {
            id: true,
            type: true,
            correctAnswer: true,
            options: true,
          },
        },
      },
    });

    const questionIds = testQs.map((q) => q.question.id);

    // Pull code submissions for this candidate + simple test
    const submissions = await this.prisma.codeSubmission.findMany({
      where: {
        assessment_id: attempt.test_id as any,
        candidate_id: candidateId,
        question_id: { in: questionIds },
      },
      orderBy: [{ created_at: "desc" }],
      select: {
        submission_id: true,
        question_id: true,
        score: true,
        result: true,
        created_at: true,
      },
    });

    const subsByQ = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const arr = subsByQ.get(s.question_id) ?? [];
      arr.push(s);
      subsByQ.set(s.question_id, arr);
    }

    // Scoring (weighted average, points=1 each) — via the canonical core.
    const breakdown: { score: number; points: number; [k: string]: any }[] = [];

    for (const row of testQs) {
      const q = row.question;
      const points = 1;

      const typeLower = String(q.type || "").toLowerCase();
      const isCoding =
        typeLower.includes("coding") || String(row.kind).toUpperCase() === "CODING";
      const isMcq =
        typeLower.includes("mcq") || String(row.kind).toUpperCase() === "MCQ";

      if (isMcq) {
        const { score, isCorrect, selected, correct } = scoreMcq(answers?.[q.id], {
          correctAnswer: q.correctAnswer ?? null,
          options: q.options,
        });

        breakdown.push({
          questionId: q.id,
          type: "mcq",
          points,
          score,
          isCorrect,
          selected,
          correct,
        });
      } else if (isCoding) {
        const subs = subsByQ.get(q.id) ?? [];

        // ALWAYS use LATEST submission before submit ("latest run score" is truth).
        const chosen = subs[0] ?? null; // ordered by created_at desc

        const { score, used } = resolveCodingScore({ dbScore: chosen?.score, result: chosen?.result });

        breakdown.push({
          questionId: q.id,
          type: "coding",
          points,
          score,
          submissionId: chosen?.submission_id ?? null,
          used,
          runnerPassed: chosen ? extractTestsPassed(chosen.result as any) : null,
          runnerTotal: chosen ? extractTestsTotal(chosen.result as any) : null,
        });
      } else {
        breakdown.push({
          questionId: q.id,
          type: "unknown",
          points,
          score: 0,
        });
      }
    }

    const totalScore = weightedTotal(breakdown);

    await this.prisma.candidateJobSimpleTestAttempt.update({
      where: { attempt_id: attemptId },
      data: {
        status: SimpleTestAttemptStatus.SUBMITTED,
        submitted_at: now,
        answers: answers as Prisma.InputJsonObject,
        score: totalScore,
        result_summary: {
          generatedAt: now.toISOString(),
          totalScore,
          questions: breakdown,
        } as Prisma.InputJsonObject,
      },
    });

    return { ok: true, score: totalScore };
  }
}

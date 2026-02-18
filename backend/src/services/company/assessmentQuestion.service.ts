// src/services/company/assessmentQuestion.service.ts
import { PrismaClient, DifficultyLevel } from "@prisma/client";

const prisma = new PrismaClient();

function mapDifficultyToQuestionDifficulty(d: DifficultyLevel): string {
  switch (d) {
    case "BEGINNER":
      return "easy";
    case "INTERMEDIATE":
      return "medium";
    case "ADVANCED":
    case "EXPERT":
      return "hard";
    default:
      return "medium";
  }
}

// Small DTO for frontend
export interface AttachedQuestionDTO {
  id: string;
  title: string;
  description: string;
  problemStatement?: string; // ✅ NEW (useful for coding questions)
  difficulty: string; // easy/medium/hard
  type: string; // coding/mcq/debugging...
  skillTags: string[];
  order: number;
  points: number;
  isReserve: boolean;

  override?: any | null; // ✅ NEW (Json override per assessment)
}

/**
 * Generate + attach questions from Wafaa's Question bank
 * - fills assessment_questions table
 * - updates employer_assessments.question_ids + auto_generated
 * - returns the attached questions (for UI)
 */
export async function attachQuestionsToAssessment(
  assessmentId: string
): Promise<{
  assessment_id: string;
  question_count: number;
  questions: AttachedQuestionDTO[];
}> {
  // 1) Load assessment
  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id: assessmentId },
  });

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  const skills = assessment.extracted_skills ?? [];
  const totalQuestions = assessment.total_questions || 20;
  const difficultyStr = mapDifficultyToQuestionDifficulty(assessment.difficulty);

  // 2) Fetch candidate questions from Wafaa’s bank
  const candidateQuestions = await prisma.question.findMany({
    where: {
      difficulty: difficultyStr,
      status: "approved",
      ...(skills.length
        ? {
            skillTags: {
              hasSome: skills,
            },
          }
        : {}),
    },
    take: totalQuestions * 3, // get more than we shuffle
  });

  if (candidateQuestions.length === 0) {
    throw new Error(
      `No questions found for difficulty=${difficultyStr} and skills=[${skills.join(
        ", "
      )}]`
    );
  }

  // 3) Shuffle (Fisher–Yates)
  for (let i = candidateQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidateQuestions[i], candidateQuestions[j]] = [
      candidateQuestions[j],
      candidateQuestions[i],
    ];
  }

  const selected = candidateQuestions.slice(0, totalQuestions);

  // Payload we’ll return to frontend
  const questionsPayload: AttachedQuestionDTO[] = selected.map((q, index) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    problemStatement: q.problemStatement ?? undefined, // ✅ NEW
    difficulty: q.difficulty,
    type: q.type,
    skillTags: q.skillTags,
    order: index + 1,
    points: 1,
    isReserve: false,
    override: null, // ✅ NEW
  }));

  // 4) Transaction: update AssessmentQuestion + EmployerAssessment.question_ids
  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.deleteMany({
      where: { assessment_id: assessmentId },
    });

    await tx.assessmentQuestion.createMany({
      data: questionsPayload.map((q) => ({
        assessment_id: assessmentId,
        question_id: q.id,
        order: q.order,
        points: q.points,
        isReserve: q.isReserve,
        override: null, // ✅ NEW
      })),
    });

    await tx.employerAssessment.update({
      where: { assessment_id: assessmentId },
      data: {
        question_ids: selected.map((q) => q.id),
        auto_generated: true,
      },
    });
  });

  return {
    assessment_id: assessmentId,
    question_count: selected.length,
    questions: questionsPayload,
  };
}

/**
 * Load already attached questions (no generation, just select + join).
 * ✅ Applies override fallback so UI can display customized text directly.
 */
export async function getQuestionsForAssessment(
  assessmentId: string
): Promise<AttachedQuestionDTO[]> {
  const rows = await prisma.assessmentQuestion.findMany({
    where: { assessment_id: assessmentId },
    orderBy: { order: "asc" },
    include: { question: true },
  });

  return rows.map((row, index) => {
    const o: any = row.override ?? {};

    return {
      id: row.question.id,
      title: o.title ?? row.question.title,
      description: o.description ?? row.question.description,
      problemStatement: o.problemStatement ?? row.question.problemStatement ?? undefined,
      difficulty: row.question.difficulty,
      type: row.question.type,
      skillTags: row.question.skillTags,
      order: row.order ?? index + 1,
      points: row.points,
      isReserve: row.isReserve,
      override: row.override ?? null,
    };
  });
}

/**
 * ✅ Update per-assessment question override (does NOT modify global Question bank)
 * Used by: PATCH /api/employer-assessments/:assessment_id/questions/:question_id/override
 *
 * NOTE: This assumes AssessmentQuestion has an `id` primary key.
 * If your model uses a composite key, tell me and I’ll adapt this to @@unique([assessment_id, question_id]).
 */
export async function updateAssessmentQuestionOverride(args: {
  company_id: string;
  assessment_id: string;
  question_id: string;
  override: any; // Json
}) {
  const { company_id, assessment_id, question_id, override } = args;

  // 1) Ownership check
  const assessment = await prisma.employerAssessment.findFirst({
    where: { assessment_id, company_id },
    select: { assessment_id: true },
  });

  if (!assessment) throw new Error("Assessment not found or forbidden");

  // 2) Find join row
  const row = await prisma.assessmentQuestion.findFirst({
    where: { assessment_id, question_id },
    select: { id: true },
  });

  if (!row) throw new Error("Question not attached to this assessment");

  // 3) Update override JSON
  return prisma.assessmentQuestion.update({
    where: { id: row.id },
    data: { override: override ?? null },
  });
}

//Actions Sur l'attach des questions pour l'assessment 
export async function attachQuestionsByIdsToAssessment(args: {
  company_id: string; 
  assessment_id: string;
  question_ids: string[];
  mode?: "append" | "replace";
}): Promise<{
  assessment_id: string;
  attached_count: number;
  questions: AttachedQuestionDTO[];
}> {
  const { assessment_id, mode = "append" } = args;
  const question_ids = (args.question_ids ?? []).filter(Boolean);

  if (!question_ids.length) {
    throw new Error("question_ids is required");
  }

  // Ensure assessment exists
  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  // Ensure all questions exist
  const found = await prisma.question.findMany({
    where: { id: { in: question_ids } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((q) => q.id));
  const missing = question_ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw new Error(`Some questions not found: ${missing.join(", ")}`);
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.assessmentQuestion.deleteMany({
        where: { assessment_id },
      });

      await tx.assessmentQuestion.createMany({
        data: question_ids.map((qid, idx) => ({
          // if your schema requires id:
          id: crypto.randomUUID(),
          assessment_id,
          question_id: qid,
          order: idx + 1,
          points: 1,
          isReserve: false,
          override: null,
        })),
      });

      await tx.employerAssessment.update({
        where: { assessment_id },
        data: {
          question_ids: question_ids,
          auto_generated: false,
        },
      });

      return;
    }

    // mode === "append"
    const existingRows = await tx.assessmentQuestion.findMany({
      where: { assessment_id },
      orderBy: { order: "asc" },
      select: { question_id: true, order: true },
    });

    const existingIds = new Set(existingRows.map((r) => r.question_id));
    const toAdd = question_ids.filter((id) => !existingIds.has(id));

    if (!toAdd.length) {
      // Still keep question_ids in sync
      const currentIds = existingRows.map((r) => r.question_id);
      await tx.employerAssessment.update({
        where: { assessment_id },
        data: {
          question_ids: currentIds,
          auto_generated: false,
        },
      });
      return;
    }

    const maxOrder = existingRows.reduce((m, r) => Math.max(m, r.order ?? 0), 0);

    await tx.assessmentQuestion.createMany({
      data: toAdd.map((qid, i) => ({
        id: crypto.randomUUID(),
        assessment_id,
        question_id: qid,
        order: maxOrder + i + 1,
        points: 1,
        isReserve: false,
        override: null,
      })),
    });

    // sync employerAssessment.question_ids
    const updatedIds = [...existingRows.map((r) => r.question_id), ...toAdd];

    await tx.employerAssessment.update({
      where: { assessment_id },
      data: {
        question_ids: updatedIds,
        auto_generated: false,
      },
    });
  });

  // Return updated attached questions for UI
  const questions = await getQuestionsForAssessment(assessment_id);

  return {
    assessment_id,
    attached_count: question_ids.length,
    questions,
  };
}

/**
 * Detach a question from an assessment (does NOT delete the Question globally)
 */
export async function detachQuestionFromAssessment(args: {
  assessment_id: string;
  question_id: string;
}): Promise<{ assessment_id: string; question_id: string; deleted: boolean }> {
  const { assessment_id, question_id } = args;

  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.assessmentQuestion.deleteMany({
      where: { assessment_id, question_id },
    });

    if (!deleted.count) {
      throw new Error("Question not attached to this assessment");
    }

    // Re-pack orders
    const rows = await tx.assessmentQuestion.findMany({
      where: { assessment_id },
      orderBy: { order: "asc" },
      select: { id: true, question_id: true },
    });

    for (let i = 0; i < rows.length; i++) {
      await tx.assessmentQuestion.update({
        where: { id: rows[i].id },
        data: { order: i + 1 },
      });
    }

    await tx.employerAssessment.update({
      where: { assessment_id },
      data: {
        question_ids: rows.map((r) => r.question_id),
        auto_generated: false,
      },
    });
  });

  return { assessment_id, question_id, deleted: true };
}

/**
 * Reorder questions for an assessment
 */
export async function reorderAssessmentQuestions(args: {
  assessment_id: string;
  ordered_question_ids: string[];
}): Promise<{ assessment_id: string; questions: AttachedQuestionDTO[] }> {
  const { assessment_id } = args;
  const ordered = (args.ordered_question_ids ?? []).filter(Boolean);

  if (!ordered.length) throw new Error("ordered_question_ids is required");

  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.assessmentQuestion.findMany({
      where: { assessment_id },
      select: { id: true, question_id: true },
    });

    const existingIds = new Set(existing.map((r) => r.question_id));

    // Ensure ordered contains only attached questions
    const invalid = ordered.filter((qid) => !existingIds.has(qid));
    if (invalid.length) {
      throw new Error(`Some questions are not attached: ${invalid.join(", ")}`);
    }

    // Optional: if ordered doesn't include all, append the missing at end
    const missing = existing
      .map((r) => r.question_id)
      .filter((qid) => !ordered.includes(qid));

    const finalOrder = [...ordered, ...missing];

    const byQid = new Map(existing.map((r) => [r.question_id, r.id]));

    for (let i = 0; i < finalOrder.length; i++) {
      const qid = finalOrder[i];
      const id = byQid.get(qid);
      if (!id) continue;

      await tx.assessmentQuestion.update({
        where: { id },
        data: { order: i + 1 },
      });
    }

    await tx.employerAssessment.update({
      where: { assessment_id },
      data: {
        question_ids: finalOrder,
        auto_generated: false,
      },
    });
  });

  const questions = await getQuestionsForAssessment(assessment_id);

  return { assessment_id, questions };
}
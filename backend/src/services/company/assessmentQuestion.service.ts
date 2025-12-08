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
  difficulty: string; // easy/medium/hard
  type: string; // coding/mcq/debugging...
  skillTags: string[];
  order: number;
  points: number;
  isReserve: boolean;
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
    take: totalQuestions * 3, // get more then we shuffle
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
    difficulty: q.difficulty,
    type: q.type,
    skillTags: q.skillTags,
    order: index + 1,
    points: 1,
    isReserve: false,
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
 */
export async function getQuestionsForAssessment(
  assessmentId: string
): Promise<AttachedQuestionDTO[]> {
  const rows = await prisma.assessmentQuestion.findMany({
    where: { assessment_id: assessmentId },
    orderBy: { order: "asc" },
    include: { question: true },
  });

  return rows.map((row, index) => ({
    id: row.question.id,
    title: row.question.title,
    description: row.question.description,
    difficulty: row.question.difficulty,
    type: row.question.type,
    skillTags: row.question.skillTags,
    order: row.order ?? index + 1,
    points: row.points,
    isReserve: row.isReserve,
  }));
}

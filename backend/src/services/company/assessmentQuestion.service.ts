// src/services/company/assessmentQuestion.service.ts
import { PrismaClient, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

function mapDifficultyToQuestionDifficulty(d: DifficultyLevel): string {
  switch (d) {
    case 'BEGINNER':
      return 'easy';
    case 'INTERMEDIATE':
      return 'medium';
    case 'ADVANCED':
    case 'EXPERT':
      return 'hard';
    default:
      return 'medium';
  }
}

export async function attachQuestionsToAssessment(assessmentId: string) {
  // 1) Load assessment
  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id: assessmentId },
  });

  if (!assessment) {
    throw new Error('Assessment not found');
  }

  const skills = assessment.extracted_skills ?? [];
  const totalQuestions = assessment.total_questions || 20;
  const difficultyStr = mapDifficultyToQuestionDifficulty(assessment.difficulty);

  // 2) Fetch candidate questions from Wafaa’s bank
  const candidateQuestions = await prisma.question.findMany({
    where: {
      difficulty: difficultyStr,
      status: 'approved',
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
        ', ',
      )}]`,
    );
  }

  // 3) Shuffle
  for (let i = candidateQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidateQuestions[i], candidateQuestions[j]] = [
      candidateQuestions[j],
      candidateQuestions[i],
    ];
  }

  const selected = candidateQuestions.slice(0, totalQuestions);

  // 4) Transaction: update AssessmentQuestion + EmployerAssessment.question_ids
  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.deleteMany({
      where: { assessment_id: assessmentId },
    });

    await tx.assessmentQuestion.createMany({
      data: selected.map((q, index) => ({
        assessment_id: assessmentId,
        question_id: q.id,
        order: index + 1,
        points: 1,
        isReserve: false,
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
  };
}

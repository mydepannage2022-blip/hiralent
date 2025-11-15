import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const candidateId = process.env.CANDIDATE_ID || 'dev-user';
    const assessmentId = process.env.ASSESSMENT_ID || 'local-test';
    const questionId = process.env.QUESTION_ID || 'local-q';

    const existing = await prisma.skillAssessment.findUnique({ where: { assessment_id: assessmentId } });
    if (existing) {
      console.log('Assessment already exists:', assessmentId);
      process.exit(0);
    }

    const assessment = await prisma.skillAssessment.create({
      data: {
        assessment_id: assessmentId,
        candidate_id: candidateId,
        provider: 'dev-script',
        questions: [
          {
            question_id: questionId,
            prompt: 'Dev test question',
            tests: [{ input: '', expected: 'hello' }],
          },
        ] as any,
        answers: [] as any,
        total_questions: 1,
        skill_category: 'programming',
        assessment_type: 'QUICK_CHECK',
      } as any,
    });

    console.log('Created assessment:', assessment.assessment_id);
  } catch (e) {
    console.error('Failed to create dev assessment', e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();

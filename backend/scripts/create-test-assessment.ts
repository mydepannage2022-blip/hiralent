import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const assessment = await prisma.skillAssessment.create({
      data: {
        candidate_id: 'bfb5f6ab-7c71-4dbf-b31d-ca827e545e0c',
        provider: 'local',
        questions: [
          { question_id: 'q-1', prompt: 'Print hello', tests: [{ input: '', expected: 'hello' }] }
        ] as any,
        answers: [] as any,
        total_questions: 1,
        skill_category: 'programming',
        assessment_type: 'QUICK_CHECK',
      } as any,
    });
    console.log('Created assessment:', assessment.assessment_id);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();

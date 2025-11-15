import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No users in DB. Create a user first.');
      process.exit(1);
    }
    // find an assessment and extract a question id from its questions JSON
    const assessment = await prisma.skillAssessment.findFirst();
    if (!assessment) {
      console.error('No assessment found in DB.');
      process.exit(1);
    }

    // SkillAssessment.questions is a JSON; try extract first question id
    let questionId: string | undefined = undefined;
    try {
      const qs = (assessment as any).questions;
      if (Array.isArray(qs) && qs.length > 0) {
        const first = qs[0];
        questionId = first.question_id || first.id || first.id_str || first.questionId;
      }
    } catch (e) {
      // ignore
    }

    if (!questionId) {
      // fallback: use a random uuid (worker will likely fail but we test enqueue)
      questionId = '00000000-0000-0000-0000-000000000000';
    }

    const res = await fetch('http://localhost:5000/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessment.assessment_id,
        questionId,
        language: 'python',
        code: 'print("hello world")',
        userId: user.user_id,
      }),
    });

    const text = await res.text();
    console.log('Response status:', res.status, 'content-type:', res.headers.get('content-type'));
    try {
      const data = JSON.parse(text);
      console.log('Submission response:', data);
    } catch (e) {
      console.error('Failed to parse JSON response. Raw response:\n', text);
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();

import { run_submission_and_grade } from '../services/execution.service';

async function run() {
  const res = await run_submission_and_grade({ submissionId: 'test-1', questionId: 'q1', language: 'python', code: 'def solve():\n  return\n', userId: 'u1' });
  console.log('execution test result', res);
  if (typeof res.score !== 'number') throw new Error('score not number');
}

run().then(() => console.log('execution.test OK')).catch((e) => { console.error(e); process.exit(1); });

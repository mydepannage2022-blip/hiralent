import { check_web_plagiarism } from '../services/plagiarism.service';

async function run() {
  const code = 'def add(a,b):\n  return a+b\n';
  const res = await check_web_plagiarism(code, 5);
  console.log('plagiarism test result', res);
  if (typeof res.score !== 'number') throw new Error('score not number');
  if (!Array.isArray(res.evidences)) throw new Error('evidences not array');
}

run().then(() => console.log('plagiarism.test OK')).catch((e) => { console.error(e); process.exit(1); });

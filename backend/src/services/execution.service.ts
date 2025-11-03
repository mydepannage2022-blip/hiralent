import { get_question_test_cases, update_skill_radar } from './externalClients';
import { check_web_plagiarism } from './plagiarism.service';
import { dispatch_to_runner } from './runner.dispatcher';
import axios from 'axios';

export type TestResult = { passed: boolean; input: string; expected: string; output?: string; error?: string; timeMs?: number; memKb?: number };

export async function run_submission_and_grade(opts: { submissionId: string; questionId: string; language: string; code: string; userId: string }) {
  // 1. fetch test cases
  const testCases = await get_question_test_cases(opts.questionId);

  // 2. Execute via runner dispatch
  let runnerResult: any = null;
  try {
    runnerResult = await dispatch_to_runner(opts.code, testCases, Number(process.env.RUNNER_TIMEOUT_MS || 20000));
  } catch (e) {
    // fall back to a safe failure result
    console.error('Runner dispatch failed', e);
    runnerResult = { passed: false, score: 0, runtimeMs: null, memoryKb: null, testsSummary: testCases.map((t, i) => ({ id: i + 1, pass: false, timeMs: 0, memKb: 0, stderr: '', note: 'runner-failed' })) };
  }

  // map tests: support runnerResult.results (our new runner) or legacy testsSummary
  const results: TestResult[] = [];
  if (runnerResult) {
    if (Array.isArray(runnerResult.results)) {
      for (const t of runnerResult.results) {
        results.push({ passed: !!t.passed, input: t.input || '', expected: t.expected || '', output: t.output || '', error: t.stderr || '', timeMs: t.durationMs || 0, memKb: t.memKb || 0 });
      }
    } else if (Array.isArray(runnerResult.testsSummary)) {
      for (const t of runnerResult.testsSummary) {
        results.push({ passed: !!t.pass, input: t.input || '', expected: t.expected_output || '', output: t.output || '', error: t.stderr || '', timeMs: t.timeMs || 0, memKb: t.memKb || 0 });
      }
    }
  }

  // 3. Plagiarism check during grading — prefer runner-provided plagiarism endpoint if available
  let plagiarism: any = null;
  const runnerHttp = process.env.RUNNER_HTTP_URL;
  if (runnerHttp) {
    try {
      const pResp = await axios.post(`${runnerHttp.replace(/\/$/, '')}/plagiarism`, { code: opts.code }, { timeout: 5000 });
      plagiarism = pResp.data;
    } catch (e) {
      // fallback to existing web plagiarism if runner plagiarism endpoint fails
      console.warn('Runner plagiarism call failed, falling back to vector DB check', e);
      plagiarism = await check_web_plagiarism(opts.code, 10);
    }
  } else {
    plagiarism = await check_web_plagiarism(opts.code, 10);
  }

  // 4. Update skill radar via Ihssane client (best-effort)
  try {
    await update_skill_radar({ userId: opts.userId, id: opts.submissionId, code: opts.code });
  } catch (e) {
    console.warn('Skill radar update failed', e);
  }

  // 5. compute summary
  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const score = runnerResult && typeof runnerResult.score === 'number' ? runnerResult.score : (total ? Math.round((passedCount / total) * 100) : 0);

  return {
    submissionId: opts.submissionId,
    score,
    total,
    passedCount,
    results,
    runner: runnerResult,
    plagiarism,
  };
}

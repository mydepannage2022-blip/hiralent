import { get_question_test_cases, update_skill_radar } from './externalClients';
import { dispatch_to_runner } from './runner.dispatcher';
import axios from 'axios';
import { TestCaseResult as TestResultType, RunnerResult as RunnerResultType } from '../types/execution.types';
import { compareOutputs } from '../utils/outputNormalization';
import { normalizePlagiarism, PlagiarismResult } from './plagiarismNormalize';

function normalizeOneTestCase(tc: any) {
  const input =
    tc?.input ??
    tc?.stdin ??
    tc?.in ??
    tc?.args ??
    '';

  // ✅ BIG: support many DB shapes
  const expected =
    tc?.expected ??
    tc?.expected_output ??
    tc?.expectedOutput ??
    tc?.stdout_expected ??
    tc?.out ??
    tc?.output ??        // some schemas store expected in "output"
    tc?.outputs ??
    null;

  // ✅ runner compatibility: ensure the suite we send contains expected_output too
  return {
    ...tc,
    input,
    expected,
    expected_output: tc?.expected_output ?? expected,   // important
    expectedOutput: tc?.expectedOutput ?? expected,     // optional
    stdout_expected: tc?.stdout_expected ?? expected,   // optional
  };
}

function normalizeTestSuite(raw: any): any[] {
  if (!raw) return [];

  // 1) Already an array of testcases
  if (Array.isArray(raw)) return raw.map(normalizeOneTestCase);

  // 2) Prisma shape: { inputs: [], outputs: [] }
  const inputs =
    raw?.inputs ??
    raw?.input ??
    raw?.stdin ??
    null;

  const outputs =
    raw?.outputs ??
    raw?.expected ??
    raw?.expected_outputs ??
    raw?.expectedOutputs ??
    raw?.stdout_expected ??
    null;

  if (Array.isArray(inputs) && Array.isArray(outputs)) {
    const n = Math.min(inputs.length, outputs.length);
    return Array.from({ length: n }).map((_, i) =>
      normalizeOneTestCase({
        id: raw?.ids?.[i] ?? `${i + 1}`,
        input: inputs[i],
        expected: outputs[i],
      })
    );
  }

  // 3) Other common shape: { testCases: [...] }
  if (Array.isArray(raw?.testCases)) return raw.testCases.map(normalizeOneTestCase);
  if (Array.isArray(raw?.cases)) return raw.cases.map(normalizeOneTestCase);

  // 4) Worst-case: unknown object
  return [];
}

export async function run_submission_and_grade(opts: {
  submissionId: string;
  questionId: string;
  language: string;
  code: string;
  userId: string;

  // ✅ NEW
  suite?: any[];
}): Promise<{
  submissionId: string;
  score: number;
  total: number;
  passedCount: number;
  results: TestResultType[];
  runner: RunnerResultType | any;
  plagiarism: any;
}> {

  // 1) fetch test cases (prefer suite from queue/service)
  const rawTestCases =
    Array.isArray(opts.suite) && opts.suite.length > 0
      ? opts.suite
      : await get_question_test_cases(opts.questionId);

  // ✅ normalize testcases so expected exists + runner-compatible keys exist
  const testCases = normalizeTestSuite(rawTestCases);

  // (optional but useful) quick debug (remove later)
  // console.log("[grading] q=", opts.questionId, "tc0=", testCases?.[0]);

  // 2) Execute via runner dispatch
  let runnerResult: any = null;
  try {
    runnerResult = await dispatch_to_runner(
      opts.code,
      testCases,
      Number(process.env.RUNNER_TIMEOUT_MS || 20000),
      opts.language
    );
  } catch (e) {
    console.error('Runner dispatch failed', e);
    runnerResult = {
      passed: false,
      score: 0,
      runtimeMs: null,
      memoryKb: null,
      testsSummary: testCases.map((t, i) => ({
        id: i + 1,
        pass: false,
        timeMs: 0,
        memKb: 0,
        stderr: '',
        note: 'runner-failed',
      })),
    };
  }

  // 3) Map tests (support runnerResult.results OR legacy testsSummary)
  const results: TestResultType[] = [];

  if (runnerResult) {
    if (Array.isArray(runnerResult.results)) {
      for (let i = 0; i < runnerResult.results.length; i++) {
        const t = runnerResult.results[i];
        const tc: any = testCases[i] ?? {};

        // ✅ ALWAYS force expected from tc if runner doesn't provide it
        const expectedVal =
          t?.expected ??
          t?.expected_output ??
          t?.expectedOutput ??
          t?.stdout_expected ??
          t?.out ??
          tc?.expected ??
          tc?.expected_output ??
          tc?.expectedOutput ??
          tc?.stdout_expected ??
          tc?.out ??
          tc?.output ??
          tc?.outputs ??
          null;

        const outputVal = t?.output ?? t?.stdout ?? null;

        // ✅ CRITICAL: do not allow pass without expected
        const computedPass =
          expectedVal != null
            ? compareOutputs(expectedVal, outputVal)
            : false;

        results.push({
          passed: computedPass,
          input: (t?.input ?? tc?.input ?? '') as string,
          expected: expectedVal,
          output: outputVal,
          stderr: t?.stderr ?? null,
          durationMs: t?.durationMs ?? t?.timeMs ?? 0,
          memKb: t?.memKb ?? null,
        });
      }
    } else if (Array.isArray(runnerResult.testsSummary)) {
      for (let i = 0; i < runnerResult.testsSummary.length; i++) {
        const t = runnerResult.testsSummary[i];
        const tc: any = testCases[i] ?? {};

        const expectedVal =
          t?.expected ??
          t?.expected_output ??
          t?.expectedOutput ??
          t?.stdout_expected ??
          t?.out ??
          tc?.expected ??
          tc?.expected_output ??
          tc?.expectedOutput ??
          tc?.stdout_expected ??
          tc?.out ??
          tc?.output ??
          tc?.outputs ??
          null;

        const outputVal = t?.output ?? t?.stdout ?? null;

        const computedPass =
          expectedVal != null
            ? compareOutputs(expectedVal, outputVal)
            : false;

        results.push({
          passed: computedPass,
          input: (t?.input ?? tc?.input ?? '') as string,
          expected: expectedVal,
          output: outputVal,
          stderr: t?.stderr ?? null,
          durationMs: t?.timeMs ?? t?.durationMs ?? 0,
          memKb: t?.memKb ?? null,
        });
      }
    }
  }

  // 4) Plagiarism check during grading. De-scoped (R-34, Wave 4 S2): the old code
  // fabricated a passing result — the runner stub returned risk:0.0, and both the error
  // path and the no-runner path coerced a mocked vector-DB score (finalScore:0, or a
  // bogus 0.92). normalizePlagiarism() now yields an explicit not_computed (null scores)
  // whenever nothing real was computed — never coerced to 0.
  let plagiarism: PlagiarismResult = normalizePlagiarism(null);
  const runnerHttp = process.env.RUNNER_HTTP_URL;

  if (runnerHttp) {
    try {
      const pResp = await axios.post(
        `${runnerHttp.replace(/\/$/, '')}/plagiarism`,
        { code: opts.code },
        { timeout: 5000 }
      );
      plagiarism = normalizePlagiarism(pResp.data || {});
    } catch (e) {
      // Could NOT compute (runner down / error). Honest not_computed — never a
      // fabricated fallback number.
      console.warn('Runner plagiarism call failed; recording not_computed', e);
      plagiarism = normalizePlagiarism(null);
    }
  }

  // 5) Update skill radar (best-effort)
  try {
    await update_skill_radar({ userId: opts.userId, id: opts.submissionId, code: opts.code });
  } catch (e) {
    console.warn('Skill radar update failed', e);
  }

  // 6) compute summary
  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;

  // ✅ IMPORTANT: score should be based on our computed results (not runner score)
  const score = total ? Math.round((passedCount / total) * 100) : 0;

  const runnerNormalized = {
    submissionId: opts.submissionId,
    results,
    totalPassed: passedCount,
    totalTests: total,
    runtimeMs: runnerResult && (runnerResult.runtimeMs ?? runnerResult.runtime_ms ?? null),
    memoryKb: runnerResult && (runnerResult.memoryKb ?? runnerResult.memory_kb ?? null),
    stdout: runnerResult && (runnerResult.stdout ?? null),
    stderr: runnerResult && (runnerResult.stderr ?? null),
    exitCode: runnerResult && (runnerResult.exitCode ?? runnerResult.exit_code ?? null),
  };

  return {
    submissionId: opts.submissionId,
    score,
    total,
    passedCount,
    results,
    runner: runnerNormalized,
    plagiarism,
  };
}

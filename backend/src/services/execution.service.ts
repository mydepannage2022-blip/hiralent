import { get_question_test_cases, update_skill_radar } from './externalClients';
import { check_web_plagiarism } from './plagiarism.service';
import { dispatch_to_runner } from './runner.dispatcher';
import axios from 'axios';
import { TestCaseResult as TestResultType, RunnerResult as RunnerResultType } from '../types/execution.types';
import { compareOutputs } from '../utils/outputNormalization';

export async function run_submission_and_grade(opts: { submissionId: string; questionId: string; language: string; code: string; userId: string }): Promise<{ submissionId: string; score: number; total: number; passedCount: number; results: TestResultType[]; runner: RunnerResultType | any; plagiarism: any }> {
  // 1. fetch test cases
  const testCases = await get_question_test_cases(opts.questionId);

  // 2. Execute via runner dispatch
  let runnerResult: any = null;
  try {
    runnerResult = await dispatch_to_runner(opts.code, testCases, Number(process.env.RUNNER_TIMEOUT_MS || 20000), opts.language);
  } catch (e) {
    // fall back to a safe failure result
    console.error('Runner dispatch failed', e);
    runnerResult = { passed: false, score: 0, runtimeMs: null, memoryKb: null, testsSummary: testCases.map((t, i) => ({ id: i + 1, pass: false, timeMs: 0, memKb: 0, stderr: '', note: 'runner-failed' })) };
  }

  // map tests: support runnerResult.results (our new runner) or legacy testsSummary
  const results: TestResultType[] = [];
  if (runnerResult) {
    if (Array.isArray(runnerResult.results)) {
      for (const t of runnerResult.results) {
        const expectedVal = t.expected ?? t.expected_output ?? null;
        const outputVal = t.output ?? t.stdout ?? null;
        // Determine pass via runner flag when present, otherwise compare
        const runnerFlag = typeof t.passed === 'boolean' ? !!t.passed : undefined;
        const computedPass = expectedVal != null ? compareOutputs(expectedVal, outputVal) : !!runnerFlag;
        results.push({
          passed: typeof runnerFlag === 'boolean' ? runnerFlag : computedPass,
          input: t.input || '',
          expected: expectedVal,
          output: outputVal,
          stderr: t.stderr ?? null,
          durationMs: t.durationMs ?? t.timeMs ?? 0,
          memKb: t.memKb ?? null,
        });
      }
    } else if (Array.isArray(runnerResult.testsSummary)) {
      for (const t of runnerResult.testsSummary) {
        const expectedVal = t.expected || t.expected_output || null;
        const outputVal = t.output || t.stdout || null;
        const runnerFlag = typeof t.pass === 'boolean' ? !!t.pass : undefined;
        const computedPass = expectedVal != null ? compareOutputs(expectedVal, outputVal) : !!runnerFlag;
        results.push({
          passed: typeof runnerFlag === 'boolean' ? runnerFlag : computedPass,
          input: t.input || '',
          expected: expectedVal,
          output: outputVal,
          stderr: t.stderr ?? null,
          durationMs: t.timeMs ?? t.durationMs ?? 0,
          memKb: t.memKb ?? null,
        });
      }
    }
  }

  // 3. Plagiarism check during grading — prefer runner-provided plagiarism endpoint if available
  let plagiarism: any = null;
  const runnerHttp = process.env.RUNNER_HTTP_URL;
  if (runnerHttp) {
    try {
      const pResp = await axios.post(`${runnerHttp.replace(/\/$/, '')}/plagiarism`, { code: opts.code }, { timeout: 5000 });
      // Normalize various runner plagiarism shapes into the canonical PlagiarismReportSchema
      const raw = pResp.data || {};
      // support runner returning `evidence` or `hits` or `evidences` from web check
      const evidenceRaw = Array.isArray(raw.evidence) ? raw.evidence : (Array.isArray(raw.hits) ? raw.hits : (Array.isArray(raw.evidences) ? raw.evidences : []));
      const evidence = evidenceRaw.map((e: any) => ({
        source: e.source || e.sourceId || e.origin || 'unknown',
        similarity: typeof e.similarity === 'number' ? e.similarity : (typeof e.similarityScore === 'number' ? e.similarityScore : (typeof e.score === 'number' ? e.score : 0)),
        snippet: e.snippet || e.context || e.snippet || '',
        url: e.url || null,
      }));
      const finalScore = typeof raw.finalScore === 'number' ? raw.finalScore : (typeof raw.risk === 'number' ? raw.risk : (typeof raw.score === 'number' ? raw.score : 0));
      const rawAny: any = raw;
      plagiarism = {
        staticScore: typeof rawAny.staticScore === 'number' ? rawAny.staticScore : finalScore,
        dynamicScore: typeof rawAny.dynamicScore === 'number' ? rawAny.dynamicScore : finalScore,
        webScore: typeof rawAny.webScore === 'number' ? rawAny.webScore : finalScore,
        finalScore,
        evidence,
      };
    } catch (e) {
      // fallback to existing web plagiarism if runner plagiarism endpoint fails
      console.warn('Runner plagiarism call failed, falling back to vector DB check', e);
      const raw = await check_web_plagiarism(opts.code, 10);
      // Normalize check_web_plagiarism result (it returns { score, evidences })
      const evidence = Array.isArray((raw as any).evidences) ? (raw as any).evidences.map((e: any) => ({ source: e.sourceId || 'web', similarity: e.score ?? 0, snippet: e.snippet || '', url: null })) : [];
      const finalScore = typeof (raw as any).finalScore === 'number' ? (raw as any).finalScore : (typeof (raw as any).score === 'number' ? (raw as any).score : 0);
      const rawAny2: any = raw;
      plagiarism = {
        staticScore: rawAny2.staticScore ?? finalScore,
        dynamicScore: rawAny2.dynamicScore ?? finalScore,
        webScore: rawAny2.webScore ?? finalScore,
        finalScore,
        evidence,
      };
    }
  } else {
    const raw = await check_web_plagiarism(opts.code, 10);
    const evidence = Array.isArray((raw as any).evidences) ? (raw as any).evidences.map((e: any) => ({ source: e.sourceId || 'web', similarity: e.score ?? 0, snippet: e.snippet || '', url: null })) : [];
    const finalScore = typeof (raw as any).finalScore === 'number' ? (raw as any).finalScore : (typeof (raw as any).score === 'number' ? (raw as any).score : 0);
    const rawAny3: any = raw;
    plagiarism = {
      staticScore: rawAny3.staticScore ?? finalScore,
      dynamicScore: rawAny3.dynamicScore ?? finalScore,
      webScore: rawAny3.webScore ?? finalScore,
      finalScore,
      evidence,
    };
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

  // Normalize runner result into canonical shape expected by worker validation
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

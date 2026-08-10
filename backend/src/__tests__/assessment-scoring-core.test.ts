// Wave 4 / Session 5 (R-37) — fail-provable unit test for the canonical scoring core.
// Runnable with tsx / ts-node. Exits non-zero on any failed assertion. No DB.
//
// This is THE math gate for the assessment-scoring consolidation: the three live
// scorers (assessmentScoring / simpleTest / skillRadarFromAssessment) all delegate to
// this module, so a regression in the shared math turns these assertions RED.
//   Run: npx tsx src/__tests__/assessment-scoring-core.test.ts

import {
  clampScore,
  normId,
  normalizeOptions,
  sameSet,
  percent,
  getCorrectMcqOptionIds,
  readSelectedOptionIds,
  scoreMcq,
  extractCodingScore,
  extractTestsPassed,
  extractTestsTotal,
  resolveCodingScore,
  weightedTotal,
} from '../utils/assessment-scoring-core';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else { console.log('  ok: ' + msg); }
}
function eq<T>(a: T, b: T, msg: string) { assert(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

// ── clampScore ────────────────────────────────────────────────────────────
console.log('clampScore:');
eq(clampScore(-5), 0, 'negative -> 0');
eq(clampScore(150), 100, 'over 100 -> 100');
eq(clampScore(NaN), 0, 'NaN -> 0');
eq(clampScore('abc' as any), 0, 'non-numeric string -> 0');
eq(clampScore('80' as any), 80, 'numeric string -> coerced');
eq(clampScore(79.6), 80, 'rounds half-up');
eq(clampScore(50), 50, 'in-range passthrough');

// ── percent ───────────────────────────────────────────────────────────────
console.log('percent:');
eq(percent(0, 0), 0, 'divide-by-zero guard -> 0');
eq(percent(1, 3), 33, '1/3 -> 33 (rounded)');
eq(percent(5, 5), 100, 'all passed -> 100');

// ── normId / normalizeOptions / sameSet ────────────────────────────────────
console.log('normId / normalizeOptions / sameSet:');
eq(normId(' a '), 'A', 'trim + uppercase');
eq(normId(null), '', 'null -> empty');
eq(normalizeOptions({ options: [1, 2] }).length, 2, 'unwraps {options:[]}');
eq(normalizeOptions([1, 2, 3]).length, 3, 'bare array passthrough');
eq(normalizeOptions(null).length, 0, 'nullish -> []');
assert(sameSet(['B', 'A'], ['A', 'B']), 'order-independent equality');
assert(sameSet(['a '], ['A']), 'normalized equality (trim/case)');
assert(!sameSet(['A'], ['A', 'B']), 'subset != equal');
assert(!sameSet(['A', 'C'], ['A', 'B']), 'differing members != equal');

// ── getCorrectMcqOptionIds — correctAnswer formats ──────────────────────────
console.log('getCorrectMcqOptionIds:');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: '["A","B"]', options: null })), JSON.stringify(['A', 'B']), 'JSON-array string');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: '[A,B', options: null })), JSON.stringify(['[A', 'B']), 'malformed JSON falls through to delimiter split');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: 'A, b', options: null })), JSON.stringify(['A', 'B']), 'comma + spacing');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: 'A|B', options: null })), JSON.stringify(['A', 'B']), 'pipe');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: 'A', options: null })), JSON.stringify(['A']), 'single value');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: '   ', options: [{ id: 'x', isCorrect: true }, { id: 'y' }] })), JSON.stringify(['X']), 'blank correctAnswer -> options.isCorrect');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: null, options: [{ option_id: 'q', correct: true }] })), JSON.stringify(['Q']), 'options.correct + option_id fallback');
eq(JSON.stringify(getCorrectMcqOptionIds({ correctAnswer: null, options: [{ value: 'v', isCorrect: true }] })), JSON.stringify(['V']), 'id resolves via value');

// ── readSelectedOptionIds ───────────────────────────────────────────────────
console.log('readSelectedOptionIds:');
eq(JSON.stringify(readSelectedOptionIds({ selectedOptionIds: ['a', 'b'] })), JSON.stringify(['A', 'B']), 'array form');
eq(JSON.stringify(readSelectedOptionIds({ selectedOptionId: 'a' })), JSON.stringify(['A']), 'scalar form');
eq(JSON.stringify(readSelectedOptionIds({})), JSON.stringify([]), 'neither -> []');

// ── scoreMcq ────────────────────────────────────────────────────────────────
console.log('scoreMcq:');
eq(scoreMcq({ selectedOptionId: 'A' }, { correctAnswer: 'A', options: null }).score, 100, 'single correct -> 100');
eq(scoreMcq({ selectedOptionId: 'B' }, { correctAnswer: 'A', options: null }).score, 0, 'wrong -> 0');
eq(scoreMcq({ selectedOptionIds: ['A', 'B'] }, { correctAnswer: '["A","B"]', options: null }).score, 100, 'multi-select exact -> 100');
eq(scoreMcq({ selectedOptionIds: ['B', 'A'] }, { correctAnswer: '["A","B"]', options: null }).score, 100, 'multi-select order-independent -> 100');
eq(scoreMcq({ selectedOptionIds: ['A'] }, { correctAnswer: '["A","B"]', options: null }).score, 0, 'subset -> 0');
eq(scoreMcq({ selectedOptionId: 'a ' }, { correctAnswer: 'A', options: null }).score, 100, 'normalized match -> 100');
eq(scoreMcq({}, { correctAnswer: null, options: [] }).score, 0, 'empty correct set -> 0 (not vacuously correct)');
assert(scoreMcq({}, { correctAnswer: null, options: [] }).isCorrect === false, 'empty correct set -> isCorrect false');

// ── extractCodingScore — runner shapes + precedence ─────────────────────────
console.log('extractCodingScore:');
eq(extractCodingScore({ runner: { passed: 5, total: 5 } }), 100, 'runner.passed/total 5/5');
eq(extractCodingScore({ runner: { passed: 3, total: 5 } }), 60, 'runner.passed/total 3/5');
eq(extractCodingScore({ runner: { totalPassed: 4, totalTests: 5 } }), 80, 'runner.totalPassed/totalTests 4/5');
eq(extractCodingScore({ score: '100' }), 100, 'numeric-string top score');
eq(extractCodingScore({ score: 80 }), 80, 'number top score');
eq(extractCodingScore({ score: 80, runner: { passed: 5, total: 5 } }), 80, 'PRECEDENCE: top score wins over runner');
eq(extractCodingScore({ score: 150, runner: { passed: 5, total: 5 } }), 100, 'out-of-range top score falls through to runner');
eq(extractCodingScore({ passedCount: 1, total: 2 }), 50, 'legacy passedCount/total');
eq(extractCodingScore({ testsPassed: 3, testsTotal: 4 }), 75, 'legacy testsPassed/testsTotal');
eq(extractCodingScore('{"runner":{"passed":5,"total":5}}'), 100, 'result stored as JSON string');
eq(extractCodingScore('not json'), 0, 'unparseable string -> 0');
eq(extractCodingScore(null), 0, 'null -> 0');
eq(extractCodingScore({}), 0, 'empty object -> 0');
eq(extractCodingScore({ runner: { passed: 5, total: 0 } }), 0, 'total:0 guard -> 0');

// ── extractTestsPassed / extractTestsTotal — precedence ─────────────────────
console.log('extractTestsPassed / extractTestsTotal:');
eq(extractTestsPassed({ runner: { passed: 3, totalPassed: 9 } }), 3, 'runner.passed wins over totalPassed');
eq(extractTestsTotal({ runner: { total: 5, totalTests: 9 } }), 5, 'runner.total wins over totalTests');
eq(extractTestsPassed({ runner: { totalPassed: 4 } }), 4, 'falls back to totalPassed');
eq(extractTestsTotal({ testsTotal: 7 }), 7, 'legacy testsTotal');
eq(extractTestsPassed({}), 0, 'default 0');

// ── resolveCodingScore — DB vs result + used label ──────────────────────────
console.log('resolveCodingScore:');
{
  const a = resolveCodingScore({ dbScore: 73, result: { runner: { passed: 1, total: 5 } } });
  eq(a.score, 73, 'DB number wins over result'); eq(a.used, 'codeSubmission.score', 'used=codeSubmission.score');
  const b = resolveCodingScore({ dbScore: '73' });
  eq(b.score, 73, 'DB numeric-string coerced'); eq(b.used, 'codeSubmission.score', 'numeric-string still codeSubmission.score');
  const c = resolveCodingScore({ dbScore: null, result: { runner: { passed: 5, total: 5 } } });
  eq(c.score, 100, 'no DB -> result score'); eq(c.used, 'result.score/runner', 'used=result.score/runner');
  const d = resolveCodingScore({ dbScore: null, result: null });
  eq(d.score, 0, 'nothing -> 0'); eq(d.used, 'none', 'used=none');
  const e = resolveCodingScore({ dbScore: 'abc', result: { score: 42 } });
  eq(e.score, 42, 'non-numeric dbScore falls through to result'); eq(e.used, 'result.score/runner', 'non-numeric db -> result label');
}

// ── weightedTotal ───────────────────────────────────────────────────────────
console.log('weightedTotal:');
eq(weightedTotal([{ score: 100, points: 1 }, { score: 0, points: 1 }]), 50, 'equal weights -> 50');
eq(weightedTotal([{ score: 100, points: 3 }, { score: 0, points: 1 }]), 75, 'weighted 100*3+0*1 / 4 -> 75');
eq(weightedTotal([{ score: 100, points: 1 }, { score: 100, points: 1 }, { score: 0, points: 1 }]), 67, 'rounds 66.67 -> 67');
eq(weightedTotal([{ score: 0, points: 1 }, { score: 100, points: 1 }]), 50, 'unknown/0 row counts in denominator');
eq(weightedTotal([]), 0, 'empty -> 0');

// ── CONTROL: prove the assertions have teeth (not vacuous) ───────────────────
// A deliberately-wrong expectation MUST count as a failure. We run it in an isolated
// counter so it doesn't fail the suite — it only proves `assert` actually catches a miss.
console.log('meta (teeth check):');
{
  const before = failures;
  assert(scoreMcq({ selectedOptionId: 'B' }, { correctAnswer: 'A', options: null }).score === 100, '(intentional miss — expected to be caught)');
  const caught = failures === before + 1;
  failures = before; // revert the intentional failure
  assert(caught, 'assert() catches a wrong expectation (suite is non-vacuous)');
}

if (failures > 0) {
  console.error(`\nassessment-scoring-core.test FAILED (${failures})`);
  process.exit(1);
}
console.log('\nassessment-scoring-core.test OK');

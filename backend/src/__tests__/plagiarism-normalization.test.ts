// R-34 (Wave 4 S2) fail-provable test for the honest plagiarism signal.
// Runnable with tsx / ts-node. Exits non-zero on any failed assertion.
//
// The whole point of the de-scope is that a null/not_computed result NEVER becomes 0.
// These assertions go RED if someone reintroduces a coerced-to-0 (or fabricated) score.

import { normalizePlagiarism } from '../services/plagiarismNormalize';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else { console.log('  ok: ' + msg); }
}

// 1) The de-scoped runner response { status:'not_computed', risk:null } stays honest.
const a = normalizePlagiarism({ status: 'not_computed', reason: 'x', risk: null, evidence: [] });
assert(a.status === 'not_computed', 'not_computed runner response -> status not_computed');
assert(a.finalScore === null, 'not_computed -> finalScore is null (NOT 0)');
assert(a.staticScore === null && a.dynamicScore === null && a.webScore === null, 'not_computed -> all sub-scores null');
assert(Array.isArray(a.evidence) && a.evidence.length === 0, 'not_computed -> empty evidence');

// 2) The error / no-runner path (null input) is honest too — never a fabricated number.
const b = normalizePlagiarism(null);
assert(b.status === 'not_computed', 'null input (runner down / not configured) -> not_computed');
assert(b.finalScore === null, 'null input -> finalScore null, never a mocked 0.92 or 0');

// 3) Empty object (no scores at all) must NOT be coerced to a 0 "clean" verdict.
const c = normalizePlagiarism({});
assert(c.status === 'not_computed', 'empty runner body -> not_computed');
assert(c.finalScore === null, 'empty runner body -> finalScore null (not 0)');

// 4) Non-vacuous control: a REAL numeric score is honoured (proves the function is not
//    hard-wired to always return not_computed — the assertions above have real teeth).
const d = normalizePlagiarism({ finalScore: 0.73, evidence: [{ source: 's', score: 0.73, snippet: 'x' }] });
assert(d.status === 'computed', 'real numeric finalScore -> status computed');
assert(d.finalScore === 0.73, 'real numeric finalScore passes through unchanged');
assert(d.evidence.length === 1 && d.evidence[0].similarity === 0.73, 'evidence normalized from a real hit');

// 5) A real ZERO from a real detector is still "computed" (0 !== not_computed) — we only
//    forbid FABRICATING a 0, not reporting a genuine one.
const e = normalizePlagiarism({ finalScore: 0, evidence: [] });
assert(e.status === 'computed' && e.finalScore === 0, 'genuine 0 from a real detector -> computed, finalScore 0');

if (failures > 0) {
  console.error(`\nplagiarism-normalization.test FAILED (${failures})`);
  process.exit(1);
}
console.log('\nplagiarism-normalization.test OK');

#!/usr/bin/env node
/**
 * verify-subsystem-consolidation.mjs — Wave 4 / Sessions 4-5 (Consolidation A + B, R-37)
 *
 * Session 4 (Questions + Chat) and Session 5 (Assessments + Scoring). Session 5 adds:
 *   • one pure per-question scoring core (utils/assessment-scoring-core.ts) that the three
 *     live scorers (assessmentScoring / simpleTest / skillRadarFromAssessment) delegate to —
 *     the triplicated MCQ/coding math is gone; LIVE unit test + parity/determinism probe;
 *   • dead compete-simulate removed (route + handler + no-op stub method);
 *   • mock/spoofable candidate surfaces deleted (/candidate/question, /candidate/results,
 *     /code-run + CodeRunner, Flow A instructions page) and Flow A's 60s fake countdown gone;
 *   • employer→candidate link guarded (invite requires an ACTIVE assessment).
 *
 * Proves the Questions + Chat consolidation is real and locks it so a regression goes RED:
 *
 *  (1) QUESTIONS — one canonical path. The dead duplicate generators are gone:
 *        - backend/src/services/question/QuestionGenerator.service.ts (dead) deleted,
 *        - backend/src/services/mockQuestionService.ts (100% commented) deleted,
 *        - question.controller.ts no longer imports/instantiates QuestionGeneratorService,
 *        - zero `QuestionBank`/`question_bank` references remain anywhere in backend/src.
 *      The live generator (aiQuestionGenerationService) + canonical Question CRUD stay.
 *  (2) CHAT — the two mock stores are gone. Both message/mockData.ts files deleted; zero
 *      `mockData`/`mockConversations` importers remain in frontend/src (components already
 *      consume the real message API). A COMPILE-FAIL assert proves the module is truly gone:
 *      a throwaway `import … from './mockData'` no longer type-resolves ("Cannot find module").
 *  (3) SCHEMA/MIGRATION — `model QuestionBank` / `model ChatHistory` absent from schema.prisma;
 *      the drop migration (20260728100100_drop_legacy_tables) DROPs both `question_bank` and
 *      `chat_history`. (The LIVE "tables absent on the migrated schema" gate lives in
 *      verify-data-model.mjs, which deploys the full chain to a throwaway DB.)
 *
 * Layers:
 *   STATIC (always): the retirement above is present in source + the compile-fail assert.
 *   LIVE (Postgres-gated, skip-with-note): question-canonical.probe.ts creates+reads a question
 *     through the canonical QuestionService → prisma.question path (non-vacuous search-miss control).
 *
 * Exit 0 => every applicable assertion holds. Exit 1 => a wiring/behaviour failed.
 * Node built-ins only. Windows-safe.
 * Usage: node hiralent-master-plan/tools/verify-subsystem-consolidation.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const errors = [];
const notes = [];
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(p);
const ok = (cond, msg) => { if (!cond) errors.push(msg); else console.log('  ok:', msg); };

/** Recursively collect .ts/.tsx files under dir, skipping node_modules/.next/dist/build. */
function collectTsFiles(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist' || e.name === 'build') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectTsFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

/** Files under `root` whose contents match `re`, excluding any path in `exclude` (substring match). */
function filesMatching(root, re, exclude = []) {
  return collectTsFiles(root).filter((f) => {
    if (exclude.some((x) => f.includes(x))) return false;
    return re.test(read(f));
  });
}

// ---------------------------------------------------------------------------
// STATIC — Questions
// ---------------------------------------------------------------------------
console.log('STATIC — Questions consolidation:');

ok(!exists(path.join(BACKEND, 'src/services/question/QuestionGenerator.service.ts')),
  '[static] dead QuestionGenerator.service.ts is deleted.');
ok(!exists(path.join(BACKEND, 'src/services/mockQuestionService.ts')),
  '[static] dead mockQuestionService.ts is deleted.');

const qController = read(path.join(BACKEND, 'src/controller/question/question.controller.ts'));
ok(!!qController && !/QuestionGeneratorService/.test(qController) && !/generatorService/.test(qController),
  '[static] question.controller.ts no longer imports/uses QuestionGeneratorService/generatorService.');
ok(/aiQuestionGenerationService/.test(qController),
  '[static] question.controller.ts keeps the live aiQuestionGenerationService (canonical generator).');

// The canonical service must still exist and be wired — so a false-green can't happen if
// someone deletes Question.service.ts while Postgres (the LIVE probe) is down.
ok(exists(path.join(BACKEND, 'src/services/question/Question.service.ts')) &&
   /from ['"][^'"]*Question\.service['"]/.test(qController) &&
   /prisma\.question\b/.test(read(path.join(BACKEND, 'src/services/question/Question.service.ts'))),
  '[static] canonical QuestionService exists, is imported by the controller, and hits prisma.question.');

// Zero QuestionBank / question_bank references in production backend/src (case-insensitive).
// __tests__ probes may legitimately NAME the retired table in a doc comment/control, so they're excluded.
const bankRefs = filesMatching(path.join(BACKEND, 'src'), /questionbank|question_bank/i, ['__tests__']);
ok(bankRefs.length === 0,
  `[static] zero QuestionBank/question_bank references in backend/src${bankRefs.length ? ' — found: ' + bankRefs.map((f) => path.relative(BACKEND, f)).join(', ') : ''}.`);

// ---------------------------------------------------------------------------
// STATIC — Chat
// ---------------------------------------------------------------------------
console.log('\nSTATIC — Chat mock-store deletion:');

const mockCandidate = path.join(FRONTEND, 'src/components/candidate/dashboard/message/mockData.ts');
const mockCompany = path.join(FRONTEND, 'src/components/company/dashboard/message/mockData.ts');
ok(!exists(mockCandidate), '[static] candidate message/mockData.ts is deleted.');
ok(!exists(mockCompany), '[static] company message/mockData.ts is deleted.');

// Zero importers of mockData / mockConversations in frontend/src.
const mockRefs = filesMatching(path.join(FRONTEND, 'src'), /mockData|mockConversations/);
ok(mockRefs.length === 0,
  `[static] zero mockData/mockConversations references in frontend/src${mockRefs.length ? ' — found: ' + mockRefs.map((f) => path.relative(FRONTEND, f)).join(', ') : ''}.`);

// ---------------------------------------------------------------------------
// STATIC — Schema / migration
// ---------------------------------------------------------------------------
console.log('\nSTATIC — schema/migration:');

const schema = read(path.join(BACKEND, 'prisma/schema.prisma'));
ok(!!schema && !/model\s+QuestionBank\s*\{/.test(schema) && !/model\s+ChatHistory\s*\{/.test(schema),
  '[static] schema.prisma has no `model QuestionBank` / `model ChatHistory`.');

const dropMig = read(path.join(BACKEND, 'prisma/migrations/20260728100100_drop_legacy_tables/migration.sql'));
ok(/DROP TABLE\s+"question_bank"/.test(dropMig) && /DROP TABLE\s+"chat_history"/.test(dropMig),
  '[static] drop migration 20260728100100 DROPs both question_bank and chat_history.');

// ---------------------------------------------------------------------------
// STATIC — COMPILE-FAIL assert (the mock module is truly gone)
// ---------------------------------------------------------------------------
console.log('\nSTATIC — compile-fail assert (deleted mock no longer resolves):');
{
  const probeDir = path.dirname(mockCandidate); // where mockData.ts used to live
  const probeFile = path.join(probeDir, '__consolidation_probe__.ts');
  // Pass a FORWARD-SLASH path RELATIVE to FRONTEND — the absolute path contains a space
  // ("Iqbal technologies"), which shell:true on Windows would split into broken args.
  const relProbe = path.relative(FRONTEND, probeFile).split(path.sep).join('/');
  try {
    fs.writeFileSync(probeFile, "import { mockConversations } from './mockData';\nvoid mockConversations;\n");
    // Explicit file arg => tsc ignores tsconfig and resolves './mockData' by the filesystem.
    const res = spawnSync('npx', ['tsc', '--noEmit', '--skipLibCheck', relProbe], {
      cwd: FRONTEND, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 16 * 1024 * 1024,
      timeout: 120000,
    });
    if (res.error && res.error.code === 'ETIMEDOUT') { errors.push('[static] compile-fail assert timed out (tsc hung).'); }
    const out = `${res.stdout || ''}${res.stderr || ''}`;
    ok(res.status !== 0 && /Cannot find module ['"]\.\/mockData['"]/.test(out) && /TS2307/.test(out),
      '[static] importing the deleted ./mockData fails to compile (TS2307 Cannot find module).');
  } catch (e) {
    errors.push(`[static] compile-fail assert crashed: ${e && e.message ? e.message : e}`);
  } finally {
    try { fs.unlinkSync(probeFile); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// LIVE — canonical question create/read (Postgres-gated; self-skips)
// ---------------------------------------------------------------------------
function loadDotenv(p) {
  const out = {};
  for (const line of read(p).split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '').trim();
  }
  return out;
}
// FORCE_INMEMORY neutralizes the Redis-backed assessment queue so the LIVE probes that
// transitively import queue modules don't hang when Redis is down (they still hit Postgres).
const childEnv = { ...process.env, ...loadDotenv(path.join(BACKEND, '.env')), FORCE_INMEMORY: '1' };

function runTsx(rel, label) {
  const abs = path.join(BACKEND, rel);
  if (!exists(abs)) { errors.push(`[${label}] probe missing: ${rel}`); return; }
  const res = spawnSync('npx', ['tsx', rel], {
    cwd: BACKEND, encoding: 'utf8', env: childEnv, shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024, timeout: 120000,
  });
  if (res.error && res.error.code === 'ETIMEDOUT') { errors.push(`[${label}] probe timed out.`); return; }
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const skipped = /\bSKIP(PED)?\b/.test(out);
  if (res.status === 0 && skipped) {
    const noteLine = out.split(/\r?\n/).find((l) => /SKIP/.test(l)) || 'skipped';
    notes.push(`[${label}] ${noteLine.trim()}`);
    console.log(`  ok(skip): ${label} — ${noteLine.trim()}`);
  } else if (res.status === 0) {
    console.log(`  ok: ${label} passed.`);
  } else {
    const tail = out.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ');
    errors.push(`[${label}] probe FAILED (exit ${res.status}): ${tail}`);
  }
}

console.log('\nLIVE — canonical Question create/read (Postgres-gated):');
runTsx('src/__tests__/question-canonical.probe.ts', 'LIVE canonical-question');

// ---------------------------------------------------------------------------
// STATIC — Assessments + Scoring (Session 5, Consolidation B)
// ---------------------------------------------------------------------------
console.log('\nSTATIC — Assessments + Scoring consolidation:');

// (1) One pure scoring core exists and exports the shared scorers.
const core = read(path.join(BACKEND, 'src/utils/assessment-scoring-core.ts'));
ok(!!core &&
   /export function scoreMcq\b/.test(core) &&
   /export function resolveCodingScore\b/.test(core) &&
   /export function extractCodingScore\b/.test(core) &&
   /export function weightedTotal\b/.test(core),
  '[static] assessment-scoring-core.ts exists and exports scoreMcq/resolveCodingScore/extractCodingScore/weightedTotal.');
// Pure module — must NOT import prisma (keeps it unit-testable, mirrors scoring-algorithms.ts).
ok(!!core && !/from ['"][^'"]*lib\/prisma['"]/.test(core) && !/@prisma\/client/.test(core),
  '[static] scoring core stays pure (no prisma/@prisma import).');

// (2) The three per-question scorers delegate to the core and no longer carry local dup helpers.
for (const [rel, label] of [
  ['src/services/company/internal/assessmentScoring.service.ts', 'assessmentScoring'],
  ['src/services/candidate/simpleTest.service.ts', 'simpleTest'],
  ['src/services/company/internal/skillRadarFromAssessment.service.ts', 'skillRadar'],
]) {
  const src = read(path.join(BACKEND, rel));
  ok(!!src && /from ['"][^'"]*assessment-scoring-core['"]/.test(src),
    `[static] ${label} imports the canonical scoring core.`);
  ok(!!src && !/function getCorrectMcqOptionIds\b/.test(src) && !/function sameSet\b/.test(src),
    `[static] ${label} no longer defines local getCorrectMcqOptionIds/sameSet (triplicated math gone).`);
}

// (3) Dead compete-simulate is removed (dev-only forge path + no-op stub method).
const competeCtrl = read(path.join(BACKEND, 'src/controller/company/compete.controller.ts'));
const competeRoutes = read(path.join(BACKEND, 'src/routes/compete.routes.ts'));
const competeSvc = read(path.join(BACKEND, 'src/services/company/compete.service.ts'));
ok(!!competeCtrl && !/simulateResultsHandler/.test(competeCtrl),
  '[static] compete.controller.ts no longer defines simulateResultsHandler.');
ok(!!competeRoutes && !/simulate/i.test(competeRoutes),
  '[static] compete.routes.ts no longer mounts a /simulate route.');
ok(!!competeSvc && !/simulateResultsForCandidate/.test(competeSvc),
  '[static] compete.service.ts no longer defines simulateResultsForCandidate.');

// (4) Mock/spoofable candidate surfaces deleted from the frontend.
const deletedFe = [
  'app/candidate/question/page.tsx',
  'app/candidate/results/page.tsx',
  'app/code-run/page.tsx',
  'src/components/Code-Runner-Frontend/CodeRunner.tsx',
  'app/candidate/dashboard/skills-assessment/instructions/page.tsx',
  'src/components/candidate/dashboard/skills-assessment/InstructionsBrief.tsx',
];
for (const f of deletedFe) ok(!exists(path.join(FRONTEND, f)), `[static] deleted mock/demo surface: ${f}`);

// Zero importers of the removed demo runner / instructions brief remain.
const demoRefs = filesMatching(FRONTEND, /Code-Runner-Frontend|InstructionsBrief/);
ok(demoRefs.length === 0,
  `[static] zero importers of CodeRunner/InstructionsBrief remain${demoRefs.length ? ' — found: ' + demoRefs.map((f) => path.relative(FRONTEND, f)).join(', ') : ''}.`);

// (5) Flow A "complete" page no longer runs the 60s fake countdown theater.
const completePage = read(path.join(FRONTEND, 'app/candidate/dashboard/skills-assessment/complete/[assessmentId]/page.tsx'));
ok(!!completePage && !/useState\(\s*60\s*\)/.test(completePage) && !/Results ready in/.test(completePage),
  '[static] Flow A complete page has no 60s fake countdown (honest transition).');

// (6) Employer→candidate link is guarded: an assessment must be ACTIVE before it can be invited.
const hiring = read(path.join(BACKEND, 'src/services/company/companyHiringFlow.service.ts'));
ok(!!hiring && /inviteToAssessment/.test(hiring) && /ASSESSMENT_NOT_ACTIVE/.test(hiring),
  '[static] inviteToAssessment guards on ACTIVE status (no DRAFT dead-end invite).');

// ---------------------------------------------------------------------------
// LIVE — scoring core (no DB) + parity + invite gate (Postgres-gated; self-skip)
// ---------------------------------------------------------------------------
console.log('\nLIVE — assessment scoring core + parity + invite gate:');
runTsx('src/__tests__/assessment-scoring-core.test.ts', 'LIVE scoring-core-unit'); // pure, always runs
runTsx('src/__tests__/assessment-scoring-parity.probe.ts', 'LIVE scoring-parity');  // Postgres-gated
runTsx('src/__tests__/assessment-invite-gate.probe.ts', 'LIVE invite-gate');        // Postgres-gated

// ---------------------------------------------------------------------------
console.log('\n' + '-'.repeat(60));
if (notes.length) {
  console.log('Notes (infra-gated, skipped honestly):');
  for (const n of notes) console.log('  -', n);
}
if (errors.length) {
  console.error(`\n✗ FAIL — ${errors.length} problem(s):`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('\n✅ verify-subsystem-consolidation: Questions + Chat + Assessments/Scoring consolidated onto their canonical paths; dead duplicates gone.');
process.exit(0);

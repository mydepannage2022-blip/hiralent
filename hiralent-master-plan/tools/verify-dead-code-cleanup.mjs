#!/usr/bin/env node
/**
 * verify-dead-code-cleanup.mjs — Wave 0 / Session 6 (Dead Code & Artifact Removal, Phase 0.7, R-40)
 *
 * Proves the Phase 0.7 Definition of Done:
 *   1. Every confirmed-dead source file is GONE from disk — and every live look-alike
 *      that shares a name/path prefix is UNTOUCHED (guards against over-deletion, e.g.
 *      CompanyOCRUpload.tsx, lib/api/apiClient.ts, queryClient.ts, scraping-scheduler.ts).
 *   2. No source file (TS or Python) still references a deleted module. This is the real
 *      safety-net for the Python deletions — `tsc` protects the TS side, but Python has no
 *      compile step, so a missed dynamic/path import would otherwise go unnoticed.
 *   3. `insightsRoutes` is mounted EXACTLY once in app.ts (was duplicated at 138-139).
 *   4. `mockAssessmentRoutes` is GATED — still mounted, but never at top level (column 0);
 *      the gated mount lives inside the `NODE_ENV !== 'production'` dev block so the
 *      dev-only /api/v1/dev/mock-assessment-result endpoint can't be exposed in production.
 *   5. Every committed runtime/junk artifact is UNTRACKED by git (logs, dev.db, temp PDFs,
 *      .lnk shortcuts, backups-files-folders/, test-signup.json, ai-service test files).
 *   6. Those artifact paths are gitignored, so they can never be re-committed.
 *
 * Exit 0 => all checks pass. Exit 1 => at least one failed (prints why).
 * Deterministic. Node built-ins only. Windows-safe (no shell, args-array spawns).
 *
 * Usage: node hiralent-master-plan/tools/verify-dead-code-cleanup.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const errors = [];
const notes = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const abs = (rel) => path.join(ROOT, rel);

// ---------------------------------------------------------------------------
// 1. Dead files gone; live look-alikes untouched.
// ---------------------------------------------------------------------------
const DELETED = [
  'backend/src/index.ts',
  // NOTE: backend/src/routes/health.routes.ts was deleted in Session 6 but
  // DELIBERATELY RE-ADDED in Session 7 (Wave 0 / Phase 0.8) as a live DB-aware
  // /health probe for the local-run baseline. It now lives under MUST_KEEP and
  // its dangling-ref pattern was removed below. This is an intentional reversal.
  'backend/src/scheduler/scraping.scheduler.ts',
  'ai-service/app/main_backup.py',
  'ai-service/app/api/routes.py',
  'ai-service/app/mock_sandbox_Youssra.py',
  'ai-service/test_gemini.py',
  'ai-service/test_renderer_windows.py',
  'ai-service/test_diagram_output.png',
  'frontend/src/lib/api-client.ts',
  'frontend/src/lib/admin-auth.ts',
  'frontend/src/providers/ReactQueryProvider.tsx',
  'frontend/src/components/question/MCQEditor.tsx',
  'frontend/src/components/company/dashboard/questionbank/MCQEditor.tsx',
  'frontend/src/components/auth/OCRUpload.tsx',
  'frontend/src/components/candidate/dashboard/profile/resume-quality/ResumeQuality.tsx',
];
for (const rel of DELETED) {
  if (exists(abs(rel))) errors.push(`Dead file still on disk (should be deleted): ${rel}`);
}

// Live look-alikes that MUST survive (over-deletion guard).
const MUST_KEEP = [
  // components/OCRUpload.tsx is KEPT: app/ocr-test/page.tsx imports it (only auth/OCRUpload.tsx,
  // the identical unreferenced duplicate, is dead). CompanyOCRUpload.tsx is a separate live component.
  'frontend/src/components/OCRUpload.tsx',
  'frontend/app/ocr-test/page.tsx',
  'frontend/src/components/auth/CompanyOCRUpload.tsx',
  'frontend/src/lib/api/apiClient.ts',
  'frontend/src/lib/api/admin.api.ts', // live adminAPI (new AdminAPI()) — distinct from dead lib/api-client.ts
  'frontend/src/lib/queryClient.ts',
  'frontend/src/context/Providers.tsx',
  'backend/src/services/scraping/scraping-scheduler.ts',
  'backend/src/scheduler/interview.scheduler.ts',
  'backend/src/server.ts',
  'backend/src/routes/mockAssessment.routes.ts',
  // Re-added in Session 7 (Phase 0.8) as a live /health probe — mounted in app.ts.
  'backend/src/routes/health.routes.ts',
];
for (const rel of MUST_KEEP) {
  if (!exists(abs(rel))) errors.push(`Live file wrongly removed (must be kept): ${rel}`);
}

// ---------------------------------------------------------------------------
// 2. No dangling references to deleted modules.
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '__pycache__', '.git', 'venv', '.venv', 'chroma_db']);
function walk(dir, exts, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

// Path-based patterns — deliberately match the deleted files' import paths, NOT bare
// symbols, so live look-alikes never false-trip:
//   `api-client` (hyphen) != live `apiClient`; `scraping.scheduler` (dot) != live
//   `scraping-scheduler`; `auth/OCRUpload` != live `auth/CompanyOCRUpload`.
const TS_REF_PATTERNS = [
  // routes/health.routes intentionally OMITTED here — re-added as a live module
  // in Session 7 (Phase 0.8); app.ts references it on purpose.
  { re: /scheduler\/scraping\.scheduler/, what: 'scheduler/scraping.scheduler (dead dup)' },
  { re: /lib\/api-client/, what: 'lib/api-client' },
  { re: /lib\/admin-auth/, what: 'lib/admin-auth' },
  { re: /providers\/ReactQueryProvider/, what: 'providers/ReactQueryProvider' },
  { re: /question\/MCQEditor/, what: 'question/MCQEditor' },
  { re: /questionbank\/MCQEditor/, what: 'questionbank/MCQEditor' },
  // NOTE: only auth/OCRUpload is dead. components/OCRUpload.tsx (and its OCRPlayground export)
  // survives — imported by app/ocr-test/page.tsx — so we must NOT flag those.
  { re: /auth\/OCRUpload/, what: 'auth/OCRUpload' },
  { re: /resume-quality\/ResumeQuality/, what: 'resume-quality/ResumeQuality' },
];
// IMPORTANT: scan the WHOLE frontend tree — Next.js routes live in frontend/app (a SIBLING of
// frontend/src, how a live app/ocr-test consumer was first overlooked) AND root-level files like
// next.config.ts sit directly under frontend/. Walking abs('frontend') (node_modules/.next skipped
// by SKIP_DIRS) covers app/src/config/scripts/public + root files in one pass. backend/prisma is
// scanned too because seed .ts there import from backend/src and tsc compiles them.
const tsFiles = [
  ...walk(abs('backend/src'), ['.ts', '.tsx']),
  ...walk(abs('backend/prisma'), ['.ts', '.tsx']),
  ...walk(abs('frontend'), ['.ts', '.tsx']),
];
for (const f of tsFiles) {
  const body = read(f);
  for (const { re, what } of TS_REF_PATTERNS) {
    if (re.test(body)) errors.push(`Dangling reference to deleted module '${what}' in ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
  }
}

// Python: bare module names (safe — these are unique) + the api/routes import forms.
const PY_REF_PATTERNS = [
  { re: /\bmain_backup\b/, what: 'main_backup' },
  { re: /\bmock_sandbox_Youssra\b/, what: 'mock_sandbox_Youssra' },
  { re: /\btest_gemini\b/, what: 'test_gemini' },
  { re: /\btest_renderer_windows\b/, what: 'test_renderer_windows' },
  { re: /from\s+app\.api\.routes|from\s+\.api\.routes|import\s+app\.api\.routes/, what: 'app/api/routes' },
];
for (const f of walk(abs('ai-service'), ['.py'])) {
  let body;
  try { body = read(f); } catch { continue; }
  for (const { re, what } of PY_REF_PATTERNS) {
    if (re.test(body)) errors.push(`Dangling Python reference to deleted module '${what}' in ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
  }
}

// ---------------------------------------------------------------------------
// 3 & 4. app.ts wiring: insightsRoutes once, mockAssessment gated.
// ---------------------------------------------------------------------------
const appTs = abs('backend/src/app.ts');
if (!exists(appTs)) {
  errors.push('backend/src/app.ts not found.');
} else {
  const lines = read(appTs).split(/\r?\n/);

  const insightsMounts = lines.filter((l) => /app\.use\([^)]*insightsRoutes/.test(l)).length;
  if (insightsMounts !== 1) errors.push(`insightsRoutes mounted ${insightsMounts}× in app.ts (expected exactly 1 — was duplicated at 138-139).`);

  const mockMounts = lines.filter((l) => /app\.use\([^)]*mockAssessmentRoutes/.test(l)).length;
  if (mockMounts === 0) {
    errors.push('mockAssessmentRoutes is no longer mounted in app.ts — it should be GATED, not removed.');
  }
  const topLevelMock = lines.some((l) => /^app\.use\([^)]*mockAssessmentRoutes/.test(l));
  if (topLevelMock) {
    errors.push('mockAssessmentRoutes is mounted at top level (column 0) in app.ts — must be gated inside the `NODE_ENV !== "production"` dev block.');
  }
  // The endpoint is an UNAUTHENTICATED prisma write, so NODE_ENV alone is not fail-safe (a
  // mis-set NODE_ENV in prod would re-expose it). Require an explicit ENABLE_DEV_MINT opt-in
  // guard immediately above the mount — the codebase's own dev-endpoint hardening pattern.
  const mockIdx = lines.findIndex((l) => /app\.use\([^)]*mockAssessmentRoutes/.test(l));
  if (mockIdx >= 0) {
    const guardWindow = lines.slice(Math.max(0, mockIdx - 6), mockIdx).join('\n');
    if (!/ENABLE_DEV_MINT/.test(guardWindow)) {
      errors.push('mockAssessmentRoutes mount is not guarded by an explicit ENABLE_DEV_MINT opt-in — NODE_ENV alone is not fail-safe for this unauthenticated DB-write endpoint.');
    }
  }
}

// ---------------------------------------------------------------------------
// 5 & 6. Committed artifacts untracked + gitignored.
// ---------------------------------------------------------------------------
const ls = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (ls.error) {
  notes.push('git not on PATH — skipped artifact untracked/gitignore checks.');
} else {
  const tracked = ls.stdout.split(/\r?\n/).filter(Boolean);
  const ARTIFACT_RE = [
    /\.log$/i,
    /\.lnk$/i,
    /(^|\/)dev\.db$/i,
    /(^|\/)temp_processing_.*\.pdf$/i,
    /^backups-files-folders\//i,
    /(^|\/)test-signup\.json$/i,
    /(^|\/)test_diagram_output\.png$/i,
    /(^|\/)test_gemini\.py$/i,
    /(^|\/)test_renderer_windows\.py$/i,
  ];
  const stillTracked = tracked.filter((p) => ARTIFACT_RE.some((re) => re.test(p)));
  if (stillTracked.length) {
    errors.push(`Artifacts still tracked by git (should be untracked): ${stillTracked.join(', ')}`);
  }

  const CHECK_IGNORE = [
    'backend/backend.log',
    'backend/worker.log',
    'runner-python/runner-stub.log',
    'backend/prisma/dev.db',
    'test-signup.json',
    'backups-files-folders/wafaa/schema.backup.prisma',
  ];
  for (const rel of CHECK_IGNORE) {
    const gi = spawnSync('git', ['check-ignore', rel], { cwd: ROOT, encoding: 'utf8' });
    if (gi.error) { notes.push('git check-ignore unavailable — skipped the gitignore assertion.'); break; }
    if (gi.status !== 0) errors.push(`Artifact path is NOT gitignored (could be re-committed): ${rel}`);
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
for (const n of notes) console.log('  · ' + n);
if (errors.length) {
  console.error('\n✗ FAIL: dead-code cleanup not clean\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✓ PASS: dead-code cleanup clean (dead files gone · live look-alikes intact · no dangling refs · insightsRoutes×1 · mockAssessment gated · artifacts untracked & gitignored).');
process.exit(0);

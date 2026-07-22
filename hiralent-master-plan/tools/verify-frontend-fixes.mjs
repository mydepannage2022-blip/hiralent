#!/usr/bin/env node
/**
 * verify-frontend-fixes.mjs — Wave 0 / Session 4 (Frontend Build Green, R-04)
 *
 * Purpose: guard the RISKY / behavioral fixes made while greening the frontend
 *          build, so a later refactor can't silently undo them. These are static
 *          source assertions (the React app needs a DB + Python services to run,
 *          so we assert on source — same convention as verify-build-fixes-runtime).
 *
 * Asserts:
 *   1. AuthContext exposes a `loading` flag (initial auth-restore gating) both in
 *      the type and in the provider value — fixes AIChatbot + ProtectedRoute.
 *   2. Public findjob page adapts Job[] -> list items AND passes
 *      eligibilityMode="useItem" (NO per-card eligibility fetch for anonymous
 *      browse) — and no longer passes the invalid `jobs=` prop to JobList.
 *   3. ChatWindow converts the camera data-URL to a real Blob before upload
 *      (behavior bug fix), i.e. fetch(dataUrl).blob().
 *   4. blog [id] types are extracted to a non-route module and the page uses
 *      async `params: Promise<...>` (Next 15 server-component contract).
 *   5. The dead src/pages/verifyEmail.tsx (validator trigger) is gone.
 *   6. Every app page that uses useSearchParams (directly or via CodeRunner /
 *      QuestionBankPage) is wrapped in a <Suspense> boundary (no CSR bailout).
 *
 * Exit 0 => all Session-4 critical fixes are present.
 * Exit 1 => a fix regressed (prints which).
 *
 * Deterministic, Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-frontend-fixes.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FE = path.join(ROOT, 'frontend');

const errors = [];
const read = (rel) => {
  const p = path.join(FE, rel);
  if (!fs.existsSync(p)) { errors.push(`Missing file: frontend/${rel}`); return ''; }
  return fs.readFileSync(p, 'utf8');
};
const must = (cond, msg) => { if (!cond) errors.push(msg); };

// 1. AuthContext loading flag.
const auth = read('src/context/AuthContext.tsx');
must(/loading:\s*boolean/.test(auth), 'AuthContext: `loading: boolean` missing from AuthContextType.');
must(/setLoading\(false\)/.test(auth) && /loading,/.test(auth), 'AuthContext: `loading` not wired/exposed in provider value.');

// 2. findjob public page: mapped items + no-fetch eligibility + no misleading eligibility UI.
const findjob = read('app/job/findjob/page.tsx');
must(/eligibilityMode="useItem"/.test(findjob), 'findjob: eligibilityMode="useItem" missing (anonymous browse would fire authed eligibility fetches).');
must(/items=\{jobItems\}/.test(findjob), 'findjob: JobList should receive items={jobItems} (mapped DTO).');
must(!/<JobList[\s\S]*?\bjobs=/.test(findjob), 'findjob: JobList still receives invalid `jobs=` prop.');
must(/showEligibility=\{false\}/.test(findjob), 'findjob: showEligibility={false} missing — anonymous public browse would show a misleading "Eligible" badge + enabled Apply on every job.');
// JobCard/JobList must actually honour showEligibility (not just accept the prop).
const jobCard = read('src/components/candidate/dashboard/jobs/JobCard.tsx');
must(/showEligibility\s*&&/.test(jobCard), 'JobCard: showEligibility not gating the eligibility badge / Apply button.');
must(/showEligibility\?:\s*boolean/.test(read('src/components/candidate/dashboard/jobs/JobList.tsx')), 'JobList: showEligibility prop not threaded to JobCard.');

// 3. ChatWindow camera data-URL -> Blob conversion.
const chat = read('src/components/candidate/dashboard/message/ChatWindow.tsx');
must(/fetch\(dataUrl\)/.test(chat) && /\.blob\(\)/.test(chat), 'ChatWindow: camera data-URL -> Blob conversion (fetch(dataUrl).blob()) missing.');

// 4. blog types extraction + async params.
must(/export type Article/.test(read('app/blog/[id]/types.ts')), 'blog: Article type not extracted to app/blog/[id]/types.ts.');
const blogPage = read('app/blog/[id]/page.tsx');
must(/params:\s*Promise</.test(blogPage) && /await\s+params/.test(blogPage), 'blog page: async `params: Promise<...>` + `await params` missing (Next 15 server component).');

// 5. Dead src/pages validator trigger removed.
must(!fs.existsSync(path.join(FE, 'src', 'pages', 'verifyEmail.tsx')), 'src/pages/verifyEmail.tsx is back — reintroduces the Next build-validator break.');

// 6. Every useSearchParams app page is Suspense-wrapped.
const APP = path.join(FE, 'app');
function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
  }
  return acc;
}
const pageFiles = walk(APP, []).filter((f) => /[/\\]page\.tsx$/.test(f));
// Pages that render a useSearchParams-using child component (transitive) — must also wrap.
const TRANSITIVE = [
  { page: 'app/code-run/page.tsx', child: 'CodeRunner' },
  { page: 'app/company/dashboard/questions/page.tsx', child: 'QuestionBankPage' },
];
for (const f of pageFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(FE, f).replace(/\\/g, '/');
  const usesDirect = /useSearchParams\s*\(/.test(src);
  const transitive = TRANSITIVE.find((t) => t.page === rel);
  if (usesDirect || transitive) {
    if (!/\bSuspense\b/.test(src)) {
      errors.push(`Suspense missing: ${rel} uses useSearchParams${transitive ? ` (via <${transitive.child}/>)` : ''} but has no <Suspense> boundary (CSR bailout).`);
    }
  }
}

if (errors.length) {
  console.error('✗ FAIL: Session-4 frontend fixes regressed\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('✅ PASS: AuthContext.loading, findjob no-fetch, ChatWindow blob fix, blog async types, src/pages removed, and all useSearchParams pages Suspense-wrapped.');
process.exit(0);

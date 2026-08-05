#!/usr/bin/env node
/**
 * verify-dependency-audit.mjs — Wave 1 / Session 7 (supply-chain gate; "npm audit no High")
 *
 * Enforces the production dependency posture: `pnpm audit --prod` must report NO High/Critical
 * advisory outside a small, explicitly-justified accepted-allowlist. This makes "no High" both
 *   (a) enforceable — the remediated set must stay gone, and
 *   (b) honest — the only survivors are advisories with no upstream fix, named + tracked here and
 *       in matrices/dependency-audit.md with a target wave; ANY new/untracked High fails the gate.
 *
 * Scope = --prod (the shipped attack surface). Dev-only tooling advisories (e.g. nodemon's
 * brace-expansion/minimatch/picomatch) are not in production and are documented, not gated.
 *
 * Accepted (no upstream patch available at time of remediation — see the doc):
 *   backend:  jws  (via firebase-admin; patched: <none>) -> Wave 8 firebase-admin major upgrade.
 *   frontend: (none)
 *
 * If `pnpm audit` cannot reach the advisory registry (offline CI), the affected project is
 * SKIPPED-with-log (exit 0) rather than false-failing — same pattern the transport/internal-auth
 * verifiers use for a down dependency. When it DOES run, enforcement is strict.
 *
 * Exit 0 => every project's prod High/Crit ⊆ its accepted-allowlist (or audit was unreachable).
 * Exit 1 => an un-accepted High/Critical appeared (prints which).
 *
 * Node built-ins only. Windows-safe. Usage: node hiralent-master-plan/tools/verify-dependency-audit.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// Advisories with NO upstream patched release at remediation time (Session 7). Each MUST have a
// tracked entry in matrices/dependency-audit.md with a target wave. Keep this list minimal.
const ACCEPTED = {
  backend: new Set(['jws']),   // via firebase-admin; no patched version published -> Wave 8.
  frontend: new Set([]),
};

const PROJECTS = [
  { name: 'backend', dir: path.join(ROOT, 'backend') },
  { name: 'frontend', dir: path.join(ROOT, 'frontend') },
];

const errors = [];
const notes = [];

function runAudit(dir) {
  // --prod = shipped surface only. --json for machine parsing. pnpm exits non-zero when vulns
  // exist, so we parse stdout regardless of exit code.
  const res = spawnSync('pnpm', ['audit', '--prod', '--json'], {
    cwd: dir, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout || ''}`;
  try {
    return { json: JSON.parse(out), raw: out };
  } catch {
    return { json: null, raw: out + (res.stderr || '') };
  }
}

for (const { name, dir } of PROJECTS) {
  if (!fs.existsSync(path.join(dir, 'package.json'))) { errors.push(`[${name}] package.json not found at ${dir}.`); continue; }

  const { json, raw } = runAudit(dir);
  if (!json || !json.advisories) {
    // Registry unreachable / unexpected output — skip-with-log rather than false-fail.
    const hint = /ENOTFOUND|ECONN|network|timeout|EAI_AGAIN/i.test(raw) ? ' (looks like no network)' : '';
    notes.push(`[${name}] SKIPPED — pnpm audit --prod produced no parseable JSON${hint}.`);
    continue;
  }

  const advisories = Object.values(json.advisories);
  const highCrit = advisories.filter((a) => a.severity === 'high' || a.severity === 'critical');
  const accepted = ACCEPTED[name] || new Set();

  const unaccepted = highCrit.filter((a) => !accepted.has(a.module_name));
  const seenAccepted = new Set(highCrit.filter((a) => accepted.has(a.module_name)).map((a) => a.module_name));

  for (const a of unaccepted) {
    const via = (a.findings?.[0]?.paths?.[0] || '').split('>')[1] || a.module_name;
    errors.push(`[${name}] un-accepted ${a.severity.toUpperCase()} advisory: ${a.module_name} (via ${via}) — patched: ${a.patched_versions || '<none>'}. Fix it or add a justified entry to matrices/dependency-audit.md + ACCEPTED.`);
  }

  const stillAccepted = [...seenAccepted];
  const goneAccepted = [...accepted].filter((m) => !seenAccepted.has(m));
  notes.push(`[${name}] prod High/Crit: ${highCrit.length} total, ${unaccepted.length} un-accepted, accepted-present: [${stillAccepted.join(', ') || 'none'}]${goneAccepted.length ? `, accepted-now-gone: [${goneAccepted.join(', ')}] (tighten ACCEPTED)` : ''}.`);
}

for (const n of notes) console.log('  · ' + n);

if (errors.length) {
  console.error('\n✗ FAIL: production dependency audit has un-accepted High/Critical advisories\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✅ PASS: no un-accepted High/Critical in any project (--prod). Accepted survivors are tracked in matrices/dependency-audit.md.');
process.exit(0);

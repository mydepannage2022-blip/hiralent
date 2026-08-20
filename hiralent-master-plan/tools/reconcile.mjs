#!/usr/bin/env node
/**
 * reconcile.mjs — Wave 5 / Session 4 (operator entry point)
 *
 * Runs the gateway ↔ DB payment reconciliation and prints the mismatch report. Thin wrapper
 * around `backend/src/scripts/reconcile-payments.ts` so the check is one command from the repo
 * root without needing to remember the tsx invocation.
 *
 * Usage:
 *   node hiralent-master-plan/tools/reconcile.mjs
 *   node hiralent-master-plan/tools/reconcile.mjs --days 90 --limit 500
 *
 * Read-only: it reports transactions whose status disagrees with Stripe and never repairs them.
 * Node built-ins only. Windows-safe.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.join(repoRoot, 'backend');

// The repo path contains a space ("Iqbal technologies"), which breaks an absolute path handed
// to a shell. Run from the backend cwd and pass the script relative instead.
const relScript = path.join('src', 'scripts', 'reconcile-payments.ts');

const passthrough = process.argv.slice(2);

const res = spawnSync('npx', ['tsx', relScript, ...passthrough], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (res.error) {
  console.error('Failed to launch reconciliation:', res.error.message);
  process.exit(1);
}

process.exit(res.status ?? 1);

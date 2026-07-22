#!/usr/bin/env node
/**
 * verify-py-encoding.mjs — Wave 0 / Session 2 (Dependency Cleanup)
 *
 * Purpose: prove the two previously-corrupt Python requirement files are now
 * clean UTF-8 and machine-parseable by pip.
 *
 * Historically:
 *   - ai-service/requirements.txt          was UTF-8 *with BOM*
 *   - assessment-ai-service/requirements.txt was UTF-16 LE (NUL bytes)
 * Both break naive parsers / diff tooling.
 *
 * For each file asserts:
 *   1. No UTF-8 BOM (bytes EF BB BF) at the start.
 *   2. No NUL bytes (rules out UTF-16).
 *   3. Valid UTF-8 (round-trips through TextDecoder with fatal=true).
 *   4. Every non-blank, non-comment line is a valid pip requirement spec.
 *
 * Exit 0 => both files clean (Session-2 DoD test passes).
 * Exit 1 => a file is still corrupt / has an unparseable line (prints why).
 *
 * Deterministic, Node built-ins only, Windows-safe.
 * Usage:  node hiralent-master-plan/tools/verify-py-encoding.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const FILES = [
  'ai-service/requirements.txt',
  'assessment-ai-service/requirements.txt',
];

// pip requirement line: `name[extras]op version`, `name @ url`, `-r other.txt`, or a plain pinned/unpinned name.
// Kept permissive but rejects control/replacement chars and stray binary noise.
const REQ_RE = /^(-r\s+\S+|[A-Za-z0-9._-]+(\[[A-Za-z0-9._,-]+\])?\s*((==|>=|<=|~=|!=|>|<)\s*[^\s#]+)?(\s*@\s*\S+)?)\s*(#.*)?$/;

const errors = [];

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { errors.push(`${rel}: file not found`); continue; }
  const buf = fs.readFileSync(abs);

  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF)
    errors.push(`${rel}: still has a UTF-8 BOM`);
  if (buf.includes(0x00))
    errors.push(`${rel}: contains NUL bytes (still UTF-16?)`);

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    errors.push(`${rel}: not valid UTF-8`);
    continue;
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === '' || t.startsWith('#')) return;
    if (!REQ_RE.test(t)) errors.push(`${rel}:${i + 1}: unparseable requirement line: ${JSON.stringify(line)}`);
  });
}

if (errors.length) {
  console.error('✗ FAIL: python requirements encoding/parse check\n');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log(`✅ PASS: ${FILES.length} requirements files are clean UTF-8 (no BOM, no NUL) and every line parses.`);
process.exit(0);

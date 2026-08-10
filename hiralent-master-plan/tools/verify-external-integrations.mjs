#!/usr/bin/env node
/**
 * verify-external-integrations.mjs — Wave 4 / Session 3 (External-data integrations)
 *
 * Proves the stubbed external-data seams are now real (or honestly gated) and locks them so a
 * regression goes RED:
 *
 *  (1) S3 FETCH. verification/helpers/file.ts no longer throws "not implemented" — it reuses
 *      the shared s3GetObject client. Local (uploads/) reads still work; the S3 branch does a
 *      real fetch (round-trip proven when MinIO is up, else the stub-gone control still holds).
 *  (2) VERIFICATION SIGNALS. whois = real RDAP domain-age (no fabricated 18), website = real
 *      SSRF-guarded scrape (no "Stub website text"), linkedin = honest empty gate (no fake
 *      snippet). Scraped text reaching the onboarding LLM is fenced+isolated (R-34).
 *  (3) gRPC DE-SCOPE. assessment-ai-service's orphaned Wafaa/Youssra client stubs + dead
 *      USE_MOCK_* toggles are gone; the real integration is the Node HTTP/webhook seam.
 *  (4) AUTOFILL CARRY-FORWARD. A real resume extraction populates DB fields end-to-end
 *      (the wiring Wave 3 left unproven), driven by an injected known extraction.
 *
 * Layers:
 *   STATIC (always): the wiring above is present in source.
 *   LIVE-A (node+tsx, no infra): the pure signal/guard logic is fail-provable
 *     (SSRF guard, HTML→text, RDAP parse, prompt-fence) via signals-external.test.ts.
 *   LIVE-B (Postgres-gated, skip-with-note): autofill-live.probe.ts seeds a known extraction
 *     and asserts CandidateSkill/CandidateProfile/Certification rows are written.
 *   LIVE-C (MinIO-gated, skip-with-note): s3-fetch.probe.ts round-trips an object; the local
 *     branch + "stub gone" control always run.
 *
 * Exit 0 => every applicable assertion holds. Exit 1 => a wiring/behaviour failed.
 * Node built-ins only. Windows-safe.
 * Usage: node hiralent-master-plan/tools/verify-external-integrations.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const ASSESS = path.join(ROOT, 'assessment-ai-service');

const errors = [];
const notes = [];
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(p);
const ok = (cond, msg) => { if (!cond) errors.push(msg); else console.log('  ok:', msg); };

// ---------------------------------------------------------------------------
// STATIC wiring
// ---------------------------------------------------------------------------
console.log('STATIC wiring checks:');

// (1) S3 fetch
const fileHelper = read(path.join(BACKEND, 'src/services/verification/helpers/file.ts'));
ok(/from ["']\.\.\/\.\.\/\.\.\/lib\/s3["']/.test(fileHelper) && /s3GetObject/.test(fileHelper),
  '[static] file.ts imports the shared s3GetObject client.');
ok(!/not implemented/i.test(fileHelper),
  '[static] file.ts no longer throws the "S3 fetch not implemented" stub.');
ok(/return s3GetObject\(/.test(fileHelper),
  '[static] file.ts S3 branch returns s3GetObject(storage_key).');

// (2) prompt guard (TS mirror)
const guard = read(path.join(BACKEND, 'src/lib/promptGuard.ts'));
ok(exists(path.join(BACKEND, 'src/lib/promptGuard.ts')) &&
   /export function wrapUntrusted/.test(guard) &&
   /export function sanitizeInline/.test(guard) &&
   /export const ISOLATION_PREAMBLE/.test(guard),
  '[static] promptGuard.ts exports wrapUntrusted + sanitizeInline + ISOLATION_PREAMBLE.');

// (2) whois — real RDAP, no fabricated stub
const whois = read(path.join(BACKEND, 'src/services/signals/whois.ts'));
ok(!/return 18/.test(whois), '[static] whois.ts no longer returns the fabricated "18" stub.');
ok(/computeMonthsFromRdap/.test(whois) && /rdap/i.test(whois),
  '[static] whois.ts computes domain age from a real RDAP lookup.');

// (2) website — real scrape + SSRF guard, no stub
const website = read(path.join(BACKEND, 'src/services/signals/website.ts'));
ok(!/Stub website text/.test(website), '[static] website.ts no longer returns the "Stub website text" stub.');
ok(/cheerio/.test(website) && /isBlockedAddress/.test(website) && /assertPublicHttpUrl/.test(website),
  '[static] website.ts does a cheerio scrape behind an SSRF guard (isBlockedAddress/assertPublicHttpUrl).');

// (2) linkedin — honest gate, no fabricated snippet
const linkedin = read(path.join(BACKEND, 'src/services/signals/linkedin.ts'));
ok(!/return\s*[`"']Stub/i.test(linkedin) && /return\s*"";/.test(linkedin),
  '[static] linkedin.ts returns an honest empty string, not a fabricated snippet.');

// (2) worker fences scraped text before the LLM (R-34)
const worker = read(path.join(BACKEND, 'src/workers/ai_company_setup.worker.ts'));
ok(/from ['"]\.\.\/lib\/promptGuard['"]/.test(worker) && /wrapUntrusted/.test(worker) && /ISOLATION_PREAMBLE/.test(worker),
  '[static] ai_company_setup.worker imports + uses wrapUntrusted + ISOLATION_PREAMBLE.');
ok(/wrapUntrusted\([^)]*website_text/.test(worker) || /websiteFenced/.test(worker),
  '[static] worker fences the scraped website_text before building the prompt.');

// (2) env example documents the tunables
const envex = read(path.join(BACKEND, '.env.example'));
ok(/SIGNALS_SCRAPE_ENABLED/.test(envex) && /SIGNALS_RDAP_BASE/.test(envex) && /SIGNALS_HTTP_TIMEOUT_MS/.test(envex) && /SIGNALS_MAX_BYTES/.test(envex),
  '[static] backend/.env.example documents the SIGNALS_* tunables.');

// (3) gRPC de-scope in assessment-ai-service
ok(!exists(path.join(ASSESS, 'app/clients')),
  '[static] assessment-ai-service app/clients (orphaned Wafaa/Youssra stubs) removed.');
const asvcConfig = read(path.join(ASSESS, 'app/core/config.py'));
ok(!/USE_MOCK_WAFAA/.test(asvcConfig) && !/USE_MOCK_YOUSSRA/.test(asvcConfig) &&
   !/WAFAA_QGEN_ADDR/.test(asvcConfig) && !/YOUSSRA_EXEC_ADDR/.test(asvcConfig),
  '[static] config.py no longer defines the dead gRPC addrs / USE_MOCK toggles.');
const asvcEnv = read(path.join(ASSESS, '.env.example'));
ok(!/USE_MOCK_WAFAA/.test(asvcEnv) && !/WAFAA_QGEN_ADDR/.test(asvcEnv),
  '[static] assessment-ai-service .env.example dropped the gRPC/mock vars.');

// ---------------------------------------------------------------------------
// LIVE probes (spawn tsx with backend/.env merged into the child env)
// ---------------------------------------------------------------------------
function loadDotenv(p) {
  const out = {};
  for (const line of read(p).split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '').trim();
  }
  return out;
}
const childEnv = { ...process.env, ...loadDotenv(path.join(BACKEND, '.env')) };

function runTsx(rel, label) {
  const abs = path.join(BACKEND, rel);
  if (!exists(abs)) { errors.push(`[${label}] probe missing: ${rel}`); return; }
  const res = spawnSync('npx', ['tsx', rel], {
    cwd: BACKEND, encoding: 'utf8', env: childEnv, shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024,
  });
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

console.log('\nLIVE-A — pure signal/guard logic (no infra):');
runTsx('src/__tests__/signals-external.test.ts', 'LIVE-A signals+guard');

console.log('\nLIVE-B — autofill DB field-population (Postgres-gated):');
runTsx('src/__tests__/autofill-live.probe.ts', 'LIVE-B autofill');

console.log('\nLIVE-C — S3 object fetch (MinIO-gated):');
runTsx('src/__tests__/s3-fetch.probe.ts', 'LIVE-C s3-fetch');

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
console.log('\n✅ verify-external-integrations: all applicable assertions hold.');
process.exit(0);

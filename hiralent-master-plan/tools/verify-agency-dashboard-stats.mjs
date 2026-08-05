#!/usr/bin/env node
/**
 * verify-agency-dashboard-stats.mjs — Wave 2 / Session 8 (Phase 2.4, R-30) — INFRA
 *
 * GOLDEN-DATA equivalence proof for the DB-side agency dashboard stats.
 *
 * getVisaDashboardStats / getRelocationDashboardStats / getIntegrationDashboardStats were
 * rewritten from "findMany ALL cases → aggregate in JS" (an unbounded per-hit read that could
 * OOM a large agency's dashboard) to discrete DB count/_sum/groupBy queries. That rewrite
 * translates the business predicates in constants/caseStatuses.ts (isActiveVisaCase,
 * isCompletedIntegrationCase, the housing-completeness pendingActions, …) into SQL — the exact
 * place a subtle mismatch (e.g. SQL `<>` dropping NULLs) could silently ship WRONG numbers.
 *
 * This verifier makes that impossible to regress silently:
 *   1. Spin up a throwaway DB, migrate deploy.
 *   2. Seed a deterministic fixture that hits every predicate branch (approved/rejected/pending
 *      embassy, housing-phase statuses, complete vs blank vs null housing details + utilities,
 *      integration service sets of <6 / 6-all-complete / mixed / empty, two candidates for the
 *      distinct-client count).
 *   3. Compute a REFERENCE using the ORIGINAL in-memory logic (findMany-all + the unchanged
 *      caseStatuses helpers) — the pre-refactor oracle.
 *   4. Call the REAL new service functions.
 *   5. Assert new === reference for EVERY numeric field of all three agency types.
 *
 * Exit 0 => DB-side stats are exactly equivalent to the in-memory ones. Exit 1 => prints the
 * mismatching fields. NEVER touches the primary `hiralent` DB.
 *
 * Usage: node hiralent-master-plan/tools/verify-agency-dashboard-stats.mjs [--skip-live]
 */

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const PRISMA_CLI = path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js');
const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const THROWAWAY_DB = 'hiralent_s8_dashboard'; // NEVER the primary `hiralent`

const skipLive = process.argv.includes('--skip-live');
const errors = [];
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

function tcpReachable(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const s = new net.Socket(); let done = false;
    const fin = (v) => { if (!done) { done = true; s.destroy(); resolve(v); } };
    s.setTimeout(ms); s.once('connect', () => fin(true)); s.once('timeout', () => fin(false)); s.once('error', () => fin(false)); s.connect(port, host);
  });
}
function readBaseUrl() {
  const raw = read(path.join(BACKEND, '.env'));
  if (raw) for (const line of raw.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
    if (m) { let v = m[1].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return v.split('?')[0]; }
  }
  return 'postgresql://postgres:huzaifa@localhost:5432/hiralent';
}
const withDbName = (base, db) => base.slice(0, base.lastIndexOf('/')) + '/' + db;

function runProbe(fileName, source, extraEnv, timeoutMs) {
  const p = path.join(BACKEND, fileName);
  try {
    fs.writeFileSync(p, source);
    const r = spawnSync(process.execPath, [TSX_CLI, fileName], { cwd: BACKEND, encoding: 'utf8', timeout: timeoutMs, env: { ...process.env, ...extraEnv }, maxBuffer: 32 * 1024 * 1024 });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const line = out.split(/\r?\n/).find((l) => l.includes('__RESULT__'));
    if (!line) return { ok: false, error: `no __RESULT__ (exit ${r.status}): ${out.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ')}` };
    return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length));
  } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) }; } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
}
function prisma(args, env) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], { cwd: BACKEND, encoding: 'utf8', timeout: 180000, env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024 });
}

// ---- 0. STATIC: the functions are DB-side (no findMany-all), not the old in-memory shape ----
function staticChecks() {
  const svc = read(path.join(BACKEND, 'src/services/agency/agency.dashboard.service.ts')) ?? '';
  // The three stat functions must not reload every case via findMany; they must aggregate DB-side.
  const statBlock = svc.slice(svc.indexOf('getVisaDashboardStats'), svc.indexOf('getFallbackDashboardStats'));
  if (/relocationCase\.findMany/.test(statBlock)) {
    errors.push('[static] a *DashboardStats function still uses relocationCase.findMany (should aggregate DB-side via count/_sum/groupBy).');
  }
  for (const needle of ['relocationCase.count', 'relocationCase.aggregate', 'relocationCase.groupBy', 'integrationService.count', 'integrationService.groupBy']) {
    if (!statBlock.includes(needle)) errors.push(`[static] dashboard stats missing expected DB-side call: ${needle}.`);
  }
}

// ---- LIVE probe: seed fixture, compute oracle (old logic) vs new functions, compare ----------
const PROBE = `
import prisma from './src/lib/prisma';
import {
  getVisaDashboardStats, getRelocationDashboardStats, getIntegrationDashboardStats,
} from './src/services/agency/agency.dashboard.service';
import {
  isActiveVisaCase, isCompletedVisaCase, isActiveRelocationCase, isCompletedRelocationCase,
  isActiveIntegrationCase, isCompletedIntegrationCase,
  getPendingIntegrationServicesCount, getCompletedIntegrationServicesCount, getInProgressIntegrationServicesCount,
  CASE_STATUSES,
} from './src/constants/caseStatuses';

let seq = 0;
const cn = () => 'CN-' + (++seq).toString().padStart(4, '0');

async function mkCase(fields, opts = {}) {
  const c = await prisma.relocationCase.create({ data: {
    candidate_id: fields.candidate_id, agency_id: fields.agency_id,
    housing_agency_id: fields.housing_agency_id ?? null, integration_agency_id: fields.integration_agency_id ?? null,
    case_number: cn(), service_type: 'full_relocation', priority_level: 'medium',
    status: fields.status, origin_country: 'IN', destination_country: 'MA',
    actual_cost: fields.actual_cost ?? null,
  }});
  if (opts.embassy) await prisma.embassySubmission.create({ data: { case_id: c.case_id, embassy_name: 'E', embassy_location: 'L', submission_date: new Date('2026-01-01'), status: opts.embassy } });
  if (opts.housing) await prisma.housingArrangement.create({ data: { case_id: c.case_id, ...opts.housing } });
  if (opts.services) for (const s of opts.services) await prisma.integrationService.create({ data: { case_id: c.case_id, service_type: s.type, status: s.status } });
  return c;
}

// ---- ORACLE: the pre-refactor in-memory computation (source of truth) ----
async function oracleVisa(agencyId, name) {
  const allCases = await prisma.relocationCase.findMany({ where: { agency_id: agencyId },
    select: { candidate_id: true, status: true, actual_cost: true, housing_agency_id: true, embassy_submission: { select: { status: true } } } });
  const completedCases = allCases.filter((c) => isCompletedVisaCase(c.status, c.embassy_submission?.status, c.housing_agency_id !== null)).length;
  const activeCases = allCases.filter((c) => isActiveVisaCase(c.status, c.embassy_submission?.status, c.housing_agency_id !== null)).length;
  const totalClients = new Set(allCases.map((c) => c.candidate_id)).size;
  const revenue = allCases.reduce((s, c) => s + (c.actual_cost || 0), 0);
  const pendingActions = allCases.filter((c) => c.status === CASE_STATUSES.PENDING_DOCUMENTS).length;
  const approvedVisas = allCases.filter((c) => c.embassy_submission?.status === 'approved').length;
  const pendingVisas = allCases.filter((c) => c.embassy_submission && ['submitted','under_review','interview_scheduled'].includes(c.embassy_submission.status)).length;
  const successRate = allCases.length > 0 ? Math.round((approvedVisas / allCases.length) * 100) : 0;
  return { activeCases, completedCases, totalClients, revenue, pendingActions, totalVisaApplications: allCases.length, approvedVisas, pendingVisas, successRate, embassySubmissions: pendingVisas };
}
async function oracleReloc(agencyId, name) {
  const allCases = await prisma.relocationCase.findMany({ where: { housing_agency_id: agencyId },
    select: { candidate_id: true, status: true, actual_cost: true, housing_details: { select: { housing_type: true, housing_address: true, utility_water: true, utility_electricity: true, utility_internet: true, arrival_date: true } } } });
  const completedCases = allCases.filter((c) => isCompletedRelocationCase(c.status)).length;
  const activeCases = allCases.filter((c) => isActiveRelocationCase(c.status)).length;
  const totalClients = new Set(allCases.map((c) => c.candidate_id)).size;
  const revenue = allCases.reduce((s, c) => s + (c.actual_cost || 0), 0);
  const pendingActions = allCases.filter((c) => {
    if (c.status === CASE_STATUSES.READY_FOR_ARRIVAL || c.status === CASE_STATUSES.COMPLETED) return false;
    const h = c.housing_details; if (!h) return true;
    const housingIncomplete = !h.housing_address || !h.housing_type || !h.arrival_date;
    const utilitiesIncomplete = h.utility_water !== 'completed' || h.utility_electricity !== 'completed' || h.utility_internet !== 'completed';
    return housingIncomplete || utilitiesIncomplete;
  }).length;
  const housingCompleted = allCases.filter((c) => c.status === CASE_STATUSES.READY_FOR_ARRIVAL).length;
  const housingInProgress = allCases.filter((c) => c.status === CASE_STATUSES.HOUSING_IN_PROGRESS || c.status === CASE_STATUSES.HOUSING_ASSIGNED).length;
  return { activeCases, completedCases, totalClients, revenue, pendingActions, totalRelocationCases: allCases.length, housingCompleted, housingInProgress, leasesActive: housingCompleted, propertiesFound: housingCompleted };
}
async function oracleInteg(agencyId, name) {
  const allCases = await prisma.relocationCase.findMany({ where: { integration_agency_id: agencyId },
    select: { candidate_id: true, status: true, actual_cost: true, integrationServices: { select: { service_type: true, status: true } } } });
  const activeCases = allCases.filter((c) => isActiveIntegrationCase(c.integrationServices)).length;
  const completedCases = allCases.filter((c) => isCompletedIntegrationCase(c.integrationServices)).length;
  const totalClients = new Set(allCases.map((c) => c.candidate_id)).size;
  const revenue = allCases.reduce((s, c) => s + (c.actual_cost || 0), 0);
  const pendingActions = allCases.reduce((s, c) => s + getPendingIntegrationServicesCount(c.integrationServices), 0);
  const servicesCompleted = allCases.reduce((s, c) => s + getCompletedIntegrationServicesCount(c.integrationServices), 0);
  const servicesInProgress = allCases.reduce((s, c) => s + getInProgressIntegrationServicesCount(c.integrationServices), 0);
  const bankAccountsOpened = allCases.reduce((s, c) => s + c.integrationServices.filter((x) => x.service_type === 'banking' && x.status === 'completed').length, 0);
  const healthcareRegistrations = allCases.reduce((s, c) => s + c.integrationServices.filter((x) => x.service_type === 'healthcare' && x.status === 'completed').length, 0);
  return { activeCases, completedCases, totalClients, revenue, pendingActions, totalIntegrationCases: allCases.length, servicesCompleted, servicesInProgress, bankAccountsOpened, healthcareRegistrations };
}

function diff(ref, got, keys) {
  const bad = [];
  for (const k of keys) if (ref[k] !== got[k]) bad.push(k + ': old=' + ref[k] + ' new=' + got[k]);
  return bad;
}

(async () => {
  const out = { ok: false, mismatches: [] };
  try {
    const u1 = await prisma.user.create({ data: { email: 'c1+' + Date.now() + '@t.test', full_name: 'C1', role: 'candidate', is_email_verified: true } });
    const u2 = await prisma.user.create({ data: { email: 'c2+' + Date.now() + '@t.test', full_name: 'C2', role: 'candidate', is_email_verified: true } });
    const agV = await prisma.agency.create({ data: { name: 'V', type: 'VISA', status: 'APPROVED' } });
    const agR = await prisma.agency.create({ data: { name: 'R', type: 'RELOCATION', status: 'APPROVED' } });
    const agI = await prisma.agency.create({ data: { name: 'I', type: 'INTEGRATION', status: 'APPROVED' } });

    // VISA fixture (agency_id = agV) — two candidates for distinct-client count.
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, status: 'submitted', actual_cost: 100 }, { embassy: 'submitted' });
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, status: 'pending_documents', actual_cost: 200 });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, status: 'in_progress', actual_cost: 300 }, { embassy: 'approved' });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, status: 'housing_assigned', actual_cost: 50 });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, status: 'cancelled', actual_cost: 0 });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, status: 'in_progress', actual_cost: 10 }, { embassy: 'rejected' });
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, status: 'in_progress' }, { embassy: 'interview_scheduled' });

    // RELOCATION fixture (housing_agency_id = agR) — agency_id set to agV to prove filter isolation.
    const H_OK = { housing_type: 'apt', housing_address: '1 St', arrival_date: new Date('2026-02-01'), utility_water: 'completed', utility_electricity: 'completed', utility_internet: 'completed' };
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, housing_agency_id: agR.agency_id, status: 'housing_assigned', actual_cost: 400 }, { housing: H_OK });
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, housing_agency_id: agR.agency_id, status: 'housing_in_progress', actual_cost: 500 });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, housing_agency_id: agR.agency_id, status: 'ready_for_arrival', actual_cost: 600 }, { housing: H_OK });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, housing_agency_id: agR.agency_id, status: 'completed', actual_cost: 700 });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, housing_agency_id: agR.agency_id, status: 'in_progress', actual_cost: 5 }, { housing: { ...H_OK, utility_water: 'pending' } });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, housing_agency_id: agR.agency_id, status: 'in_progress', actual_cost: 5 }, { housing: { ...H_OK, housing_address: '' } });

    // INTEGRATION fixture (integration_agency_id = agI).
    const sixDone = [{ type: 'banking', status: 'completed' }, { type: 'healthcare', status: 'completed' }, { type: 'tax_id', status: 'completed' }, { type: 'telecom', status: 'completed' }, { type: 'transport', status: 'completed' }, { type: 'integration_program', status: 'completed' }];
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, integration_agency_id: agI.agency_id, status: 'in_progress', actual_cost: 800 }, { services: sixDone });
    await mkCase({ candidate_id: u1.user_id, agency_id: agV.agency_id, integration_agency_id: agI.agency_id, status: 'in_progress', actual_cost: 900 }, { services: [...sixDone.slice(0, 5), { type: 'integration_program', status: 'in_progress' }] });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, integration_agency_id: agI.agency_id, status: 'in_progress', actual_cost: 10 }, { services: [{ type: 'banking', status: 'completed' }, { type: 'healthcare', status: 'completed' }, { type: 'tax_id', status: 'completed' }] });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, integration_agency_id: agI.agency_id, status: 'in_progress', actual_cost: 20 }, { services: [{ type: 'banking', status: 'pending' }, { type: 'healthcare', status: 'pending' }] });
    await mkCase({ candidate_id: u2.user_id, agency_id: agV.agency_id, integration_agency_id: agI.agency_id, status: 'in_progress', actual_cost: 30 });

    const VK = ['activeCases','completedCases','totalClients','revenue','pendingActions','totalVisaApplications','approvedVisas','pendingVisas','successRate','embassySubmissions'];
    const RK = ['activeCases','completedCases','totalClients','revenue','pendingActions','totalRelocationCases','housingCompleted','housingInProgress','leasesActive','propertiesFound'];
    const IK = ['activeCases','completedCases','totalClients','revenue','pendingActions','totalIntegrationCases','servicesCompleted','servicesInProgress','bankAccountsOpened','healthcareRegistrations'];

    const vRef = await oracleVisa(agV.agency_id, 'V'); const vGot = await getVisaDashboardStats(agV.agency_id, 'V');
    const rRef = await oracleReloc(agR.agency_id, 'R'); const rGot = await getRelocationDashboardStats(agR.agency_id, 'R');
    const iRef = await oracleInteg(agI.agency_id, 'I'); const iGot = await getIntegrationDashboardStats(agI.agency_id, 'I');

    for (const m of diff(vRef, vGot, VK)) out.mismatches.push('VISA.' + m);
    for (const m of diff(rRef, rGot, RK)) out.mismatches.push('RELOCATION.' + m);
    for (const m of diff(iRef, iGot, IK)) out.mismatches.push('INTEGRATION.' + m);

    // Sanity: the fixture must actually exercise non-zero branches (guards against a vacuous pass).
    out.coverage = { visaCompleted: vRef.completedCases, visaActive: vRef.activeCases, relocPending: rRef.pendingActions, integCompleted: iRef.completedCases, integActive: iRef.activeCases };
    const vacuous = vRef.completedCases < 1 || vRef.activeCases < 1 || rRef.pendingActions < 1 || iRef.completedCases < 1 || iRef.activeCases < 1;
    out.ok = out.mismatches.length === 0 && !vacuous;
    if (vacuous) out.mismatches.push('FIXTURE too weak — a key branch had 0 rows (would pass vacuously).');
  } catch (e) { out.ok = false; out.error = String(e && e.stack ? e.stack : e); }
  finally { try { await prisma.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n'); process.exit(0);
})();
`;

const PROBE_DDL = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const admin = new PrismaClient({ datasources:{ db:{ url: process.env.ADMIN_URL } } });
const DB=process.env.DDL_DB, ACT=process.env.DDL_ACTION;
(async()=>{ const out={}; try{ await admin.$connect();
  try{ await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "'+DB+'" WITH (FORCE)'); }
  catch{ await admin.$executeRawUnsafe("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='"+DB+"' AND pid<>pg_backend_pid()"); await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "'+DB+'"'); }
  if(ACT==='create') await admin.$executeRawUnsafe('CREATE DATABASE "'+DB+'"');
  out.ok=true; }catch(e){ out.ok=false; out.error=String(e&&e.message?e.message:e);} finally{ try{await admin.$disconnect();}catch{} }
  process.stdout.write('\\n__RESULT__'+JSON.stringify(out)+'\\n'); process.exit(0); })();
`;

async function liveChecks() {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push('prisma CLI not found — run pnpm install in backend.'); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT}.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');
  const targetUrl = withDbName(base, THROWAWAY_DB);
  let created = false;
  try {
    const c = runProbe('.__dash_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`could not create throwaway DB: ${c.error}`); return; }
    created = true;

    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) { errors.push(`migrate deploy FAILED (exit ${dep.status}): ${`${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`); return; }

    const r = runProbe('.__dash_probe.ts', PROBE, { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl }, 120000);
    if (!r.ok) {
      if (r.error) errors.push(`[golden] probe error: ${r.error}`);
      for (const m of r.mismatches || []) errors.push(`[golden] MISMATCH ${m}`);
      if (!r.error && !(r.mismatches || []).length) errors.push('[golden] probe returned not-ok without detail.');
      return;
    }
    console.log(`  [golden] DB-side stats === in-memory oracle across all fields. Coverage: ${JSON.stringify(r.coverage)}.`);
  } finally {
    if (created) { const d = runProbe('.__dash_ddl.ts', PROBE_DDL, { ADMIN_URL: adminUrl, DDL_DB: THROWAWAY_DB, DDL_ACTION: 'drop' }, 60000); if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop throwaway DB: ${d.error}`); }
  }
}

(async () => {
  staticChecks();
  if (!skipLive) await liveChecks();

  if (errors.length) {
    console.error('\n✗ FAIL: agency dashboard stats not proven equivalent:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log(`\n✅ PASS: dashboard stats aggregate DB-side (static)${skipLive ? '' : ' and equal the in-memory oracle field-for-field over a branch-covering fixture (golden)'}. Primary DB untouched. (R-30)`);
  process.exit(0);
})().catch((e) => { console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`); process.exit(1); });

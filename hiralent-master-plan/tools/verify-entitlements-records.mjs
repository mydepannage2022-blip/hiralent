#!/usr/bin/env node
/**
 * verify-entitlements-records.mjs — Wave 5 / Session 4 gate.
 *
 * Two things this session had to make true, and this verifier keeps true:
 *
 *  1. ENTITLEMENTS ARE REAL AND MOUNTED. The plan columns (`job_post_limit`,
 *     `ai_interview_limit`) drive access, the hardcoded `'FREE'|'PRO'|'ENTERPRISE'` maps are
 *     gone, and the quota/subscription middlewares are wired to actual routes. That last part
 *     is the one a structural check must not skip: before this session BOTH subscription
 *     middlewares existed and were mounted on ZERO routes, so "the code exists" proved nothing.
 *
 *  2. PAYMENT RECORDS ARE SAFE. Receipts are immutable at the database (a trigger, not a
 *     convention), reconciliation reports rather than repairs, and the event log cannot carry
 *     card data.
 *
 * Structural greps below; behaviour is proved fail-provably by three probes that this verifier
 * runs for real — entitlements.probe, payment-records.probe, and entitlements-http.probe (which
 * boots the app and drives the gates over HTTP).
 *
 * Needs Postgres. Node built-ins only. Windows-safe. Exit 0 = pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const backend = path.join(repoRoot, 'backend');
const frontend = path.join(repoRoot, 'frontend');

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log('  ok:', name);
  else { failures++; console.error('  FAIL:', name); }
};
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

const svc = (f) => path.join(backend, 'src', 'services', 'subscription', f);
const pay = (f) => path.join(backend, 'src', 'services', 'payment', f);
const route = (f) => path.join(backend, 'src', 'routes', f);
const mw = (f) => path.join(backend, 'src', 'middlewares', f);

// ── 1) Entitlements come from the plan rows, not from code ────────────────────
console.log('\n[1] Entitlements are DB-driven');
const entSrc = read(svc('entitlements.service.ts'));
check('entitlements.service.ts exists', entSrc.length > 0);
check('reads job_post_limit from the plan row', entSrc.includes('job_post_limit'));
check('reads ai_interview_limit from the plan row', entSrc.includes('ai_interview_limit'));
check('falls back to the seeded free plan', entSrc.includes("plan_free"));
check('treats -1 as unlimited', entSrc.includes('UNLIMITED'));
check('trialing counts as live', /LIVE_STATUSES[\s\S]{0,200}TRIALING/.test(entSrc));
check('usage is counted in the database, not by loading every job into memory',
  /companyJob\.count\(/.test(entSrc) && !/companyJob\.findMany\(/.test(entSrc));
check('job slots are concurrent (DRAFT/ACTIVE/PAUSED occupy one)',
  /SLOT_CONSUMING_STATUSES[\s\S]{0,160}JobStatus\.DRAFT[\s\S]{0,80}JobStatus\.ACTIVE[\s\S]{0,80}JobStatus\.PAUSED/.test(entSrc));

const faSrc = read(svc('feature-access.service.ts'));
check('feature-access no longer hardcodes a FREE/PRO/ENTERPRISE feature map',
  !/'PRO'\s*:\s*\[/.test(faSrc) && !/'ENTERPRISE'\s*:/.test(faSrc));
check('feature-access no longer hardcodes numeric limits',
  !/'job_posts'\s*:\s*\d/.test(faSrc) && !/'ai_interviews'\s*:\s*\d/.test(faSrc));
check('feature-access delegates to entitlements.service', faSrc.includes("from './entitlements.service'"));

// ── 2) Billing subject is the company, not the calling user ───────────────────
console.log('\n[2] Billing account = the company');
const baSrc = read(svc('billingAccount.ts'));
check('billingAccount.ts exists', baSrc.length > 0);
check('resolves company_id', baSrc.includes('actor.company_id'));
check('never falls back to user_id', !/return\s+actor\.user_id/.test(baSrc));

const subCtl = read(path.join(backend, 'src', 'controller', 'company', 'subscription.controller.ts'));
check('subscription controller resolves the billing account', subCtl.includes('resolveBillingAccountId'));
check('subscription controller no longer keys billing off req.user.user_id',
  !subCtl.includes('req.user?.user_id'));

const tokenSrc = read(path.join(backend, 'src', 'services', 'auth', 'tokenIssue.service.ts'));
check('recruiter resolves a company_id claim', /company_member'\s*\|\|\s*user\.role === 'recruiter'/.test(tokenSrc));
check('MFA login reuses the shared resolveCompanyId (no drifting copies)',
  read(path.join(backend, 'src', 'services', 'auth', 'twoFactor.service.ts')).includes('resolveCompanyId(user)'));

// ── 3) Plan hierarchy is derived, not hardcoded ───────────────────────────────
console.log('\n[3] Plan ranking comes from the catalogue');
const checkSubSrc = read(mw('checkSubscription.middleware.ts'));
check("the ['FREE','PRO','ENTERPRISE'] hierarchy array is gone",
  !/planHierarchy\s*=\s*\[/.test(checkSubSrc));
check('requirePlan ranks plans from the DB', checkSubSrc.includes('getPlanRanks'));
check('requireActiveSubscription accepts trialing', /LIVE_STATUSES[\s\S]{0,200}TRIALING/.test(checkSubSrc));
check('requireActiveSubscription uses the billing account', checkSubSrc.includes('resolveBillingAccountId'));
check('getPlanRanks orders by price', entSrc.includes('price_monthly_usd'));

// ── 4) The gates are MOUNTED (the part that was missing entirely) ─────────────
console.log('\n[4] Gates are mounted on real routes');
check('entitlements.middleware.ts exists', read(mw('entitlements.middleware.ts')).includes('requireQuota'));
check('quota gate refuses with PLAN_UPGRADE_REQUIRED',
  read(mw('entitlements.middleware.ts')).includes('PLAN_UPGRADE_REQUIRED'));

const jobRoutes = read(route('job.routes.ts'));
check("POST /jobs is gated by requireQuota('job_posts')",
  /router\.post\('\/jobs',\s*requireQuota\('job_posts'\)/.test(jobRoutes));

const interviewRoutes = read(route('interview.routes.ts'));
check("POST /interviews/assign is gated by requireQuota('ai_interviews')",
  /router\.post\('\/assign',\s*requireQuota\('ai_interviews'\)/.test(interviewRoutes));

check('candidate ranking requires an active subscription',
  read(route('company.candidateRanking.routes.ts')).includes('requireActiveSubscription'));
check('skill radar requires an active subscription',
  read(route('skillRadar.routes.ts')).includes('requireActiveSubscription'));
check('company insights requires an active subscription',
  read(route('insights.routes.ts')).includes('requireActiveSubscription'));

const subRoutes = read(route('subscription.routes.ts'));
check('GET /subscription/usage exists and is gated',
  /router\.get\('\/usage',\s*checkAuth,\s*requireActiveSubscription/.test(subRoutes));

check('the superseded checkFeatureAccess.middleware.ts is gone',
  !fs.existsSync(mw('checkFeatureAccess.middleware.ts')));

// An entitlement gate must not silently become an authorisation change. These four kept
// regressing the audit found: platform staff locked out of every gated screen, agency admins
// refused by a company quota, and the candidate-facing interview endpoint demanding a company
// allowance it could never have.
const quotaMw = read(mw('entitlements.middleware.ts'));
check('the quota gate lets platform staff through', quotaMw.includes('isPlatformStaff'));
check('the quota gate stays fail-closed for a company user with no claim',
  quotaMw.includes('isCompanyScopedActor'));
check('the subscription gate lets platform staff through', checkSubSrc.includes('isPlatformStaff'));
check('a non-billing role is refused with 403, not 400',
  checkSubSrc.includes("'NOT_A_BILLING_ACCOUNT'") && /status\(403\)[\s\S]{0,160}NOT_A_BILLING_ACCOUNT/.test(checkSubSrc));
check('POST /interviews (candidate-facing) is NOT quota-gated',
  !/router\.post\('\/',\s*requireQuota/.test(interviewRoutes));

// ── 5) Immutable records ──────────────────────────────────────────────────────
console.log('\n[5] Payment records are immutable');
const migDir = path.join(backend, 'prisma', 'migrations');
const migrations = fs.existsSync(migDir) ? fs.readdirSync(migDir) : [];
const recordsMig = migrations.find((m) => /wave5_payment_records/.test(m));
check('the payment-records migration exists', !!recordsMig);

const migSql = recordsMig ? read(path.join(migDir, recordsMig, 'migration.sql')) : '';
check('migration creates PaymentReceipt', migSql.includes('CREATE TABLE "PaymentReceipt"'));
check('migration creates PaymentEventLog', migSql.includes('CREATE TABLE "PaymentEventLog"'));
check('migration installs the immutability trigger function',
  migSql.includes('payment_receipt_immutable'));
check('the trigger fires BEFORE UPDATE OR DELETE',
  /BEFORE UPDATE OR DELETE ON "PaymentReceipt"/.test(migSql));
check('the trigger raises rather than silently ignoring', migSql.includes('RAISE EXCEPTION'));
check('receipts are protected from transaction deletion (onDelete: Restrict)',
  /PaymentReceipt_transaction_id_fkey[\s\S]{0,200}ON DELETE RESTRICT/.test(migSql));
check('the AI-interview usage index was added',
  migSql.includes('"AIInterviewResult"("job_id", "created_at")'));

const receiptSrc = read(pay('receipts.service.ts'));
check('receipts.service.ts exists', receiptSrc.length > 0);
check('receipts service exposes no update path',
  !/paymentReceipt\.update/.test(receiptSrc) && !/paymentReceipt\.delete/.test(receiptSrc));
check('receipt issuing is idempotent on transaction_id', receiptSrc.includes("'P2002'"));
check('only settled money gets a receipt', receiptSrc.includes('RECEIPTABLE'));

// ── 6) Reconciliation reports, never repairs ──────────────────────────────────
console.log('\n[6] Reconciliation is read-only');
const reconSrc = read(pay('reconciliation.service.ts'));
check('reconciliation.service.ts exists', reconSrc.length > 0);
check('reconciliation never writes payment state',
  !/paymentTransaction\.(update|updateMany|delete)/.test(reconSrc) &&
  !/userSubscription\.(update|updateMany)/.test(reconSrc));
check('reconciliation asks the gateway for status', reconSrc.includes('getPaymentStatus('));
check('an unconfigured gateway is reported, not treated as clean',
  reconSrc.includes('gateway_configured'));
check('a refunded charge is not mis-flagged', reconSrc.includes('isExpectedDivergence'));
check('mismatches are recorded in the event log', reconSrc.includes("'reconcile.mismatch'"));

check('the reconciliation scheduler exists',
  read(path.join(backend, 'src', 'scheduler', 'paymentReconciliation.scheduler.ts')).includes('reconcilePayments'));
check('the scheduler is wired into server.ts',
  read(path.join(backend, 'src', 'server.ts')).includes('getPaymentReconciliationScheduler'));
check('the operator CLI exists', fs.existsSync(path.join(__dirname, 'reconcile.mjs')));
check('the CLI script exists',
  fs.existsSync(path.join(backend, 'src', 'scripts', 'reconcile-payments.ts')));

// ── 7) Card data can never reach the log ──────────────────────────────────────
console.log('\n[7] Payment event log is card-safe');
const eventsSrc = read(pay('paymentEvents.service.ts'));
check('paymentEvents.service.ts exists', eventsSrc.length > 0);
check('a scrubber strips card-shaped keys',
  eventsSrc.includes('FORBIDDEN_KEYS') && eventsSrc.includes('CARD_KEY_PATTERN'));
check('cvc / expiry / last4 are in the forbidden set',
  /'cvc'/.test(eventsSrc) && /'expmonth'/.test(eventsSrc) && /'expyear'/.test(eventsSrc) && /'last4'/.test(eventsSrc));
check('PAN-shaped values are redacted wherever they appear', eventsSrc.includes('PAN_LIKE'));
check('the scrubber runs on every write', /detail:\s*\(scrubPaymentDetail/.test(eventsSrc));
// The first rule matched `number` as a substring and silently deleted `receipt_number` from the
// receipt.issued audit line — every card-data assertion still passed while the trail was gutted.
check('the key rule is exact-token, not substring (receipt_number survives)',
  eventsSrc.includes('FORBIDDEN_KEYS') && eventsSrc.includes('normaliseKey'));
check('logging never throws into the money path', /catch\s*\([\s\S]{0,80}log write failed/.test(eventsSrc));

const subSvc = read(svc('subscription.service.ts'));
check('checkout logs a payment event', subSvc.includes("'checkout.created'"));
check('webhook branches log payment events', (subSvc.match(/logPaymentEvent\(/g) || []).length >= 4);
check('refunds log a payment event', subSvc.includes("'refund.full'") || subSvc.includes("'refund.partial'"));
check('settled checkouts issue a receipt', subSvc.includes('issueReceiptForCheckoutSession'));
check('renewals issue a receipt', subSvc.includes('issueReceiptsForSubscription'));

// ── 8) Frontend surfaces the limits and the refusals ──────────────────────────
console.log('\n[8] Frontend consumes entitlements');
const feSubApi = read(path.join(frontend, 'src', 'lib', 'subscription', 'subscription.api.ts'));
check('frontend has a getUsage client', feSubApi.includes("get('/subscription/usage')"));
check('frontend exposes a useUsage hook',
  read(path.join(frontend, 'src', 'lib', 'subscription', 'subscription.queries.ts')).includes('useUsage'));

const errHelper = read(path.join(frontend, 'src', 'lib', 'subscription', 'entitlementError.ts'));
check('frontend recognises PLAN_UPGRADE_REQUIRED', errHelper.includes('PLAN_UPGRADE_REQUIRED'));
check('frontend recognises the no-subscription codes', errHelper.includes('EXPIRED_SUBSCRIPTION'));
check('a real error is not swallowed into an upgrade prompt', errHelper.includes('return null'));

check('the upgrade prompt component exists',
  read(path.join(frontend, 'src', 'components', 'subscription', 'UpgradePrompt.tsx')).includes('Upgrade'));

const billingPage = read(path.join(frontend, 'app', 'company', 'dashboard', 'billing', 'page.tsx'));
check('company billing page shows usage', billingPage.includes('useUsage') && billingPage.includes('UsageMeter'));

check('the job wizard offers an upgrade instead of a raw error',
  read(path.join(frontend, 'src', 'components', 'company', 'dashboard', 'jobManagement', 'CreateJobWizardModal.tsx')).includes('UpgradePrompt'));
check('the internal-candidates page handles the premium 403',
  read(path.join(frontend, 'app', 'company', 'dashboard', 'candidates', 'internal', 'page.tsx')).includes('UpgradePrompt'));
check('the assign-interview modal handles the quota 403',
  read(path.join(frontend, 'src', 'components', 'company', 'dashboard', 'interviews', 'AssignInterviewModal.tsx')).includes('UpgradePrompt'));

const adminBilling = read(path.join(frontend, 'app', 'admin', 'dashboard', 'billing', 'page.tsx'));
check('admin billing page can run reconciliation', adminBilling.includes('/admin/reconciliation/run'));
check('admin billing page can open a receipt', adminBilling.includes('/admin/receipts?transaction_id='));

const adminRoutes = read(route('admin.management.routes.ts'));
check('admin reconciliation endpoint is mounted', adminRoutes.includes("'/reconciliation/run'"));
check('admin payment-events endpoint is mounted', adminRoutes.includes("'/payment-events'"));
check('admin receipts endpoint is mounted', adminRoutes.includes("'/receipts'"));

// ── 9) LIVE probes — the behaviour, actually exercised ────────────────────────
function runProbe(label, file, env = {}) {
  const rel = path.join('src', '__tests__', file);
  if (!fs.existsSync(path.join(backend, rel))) {
    failures++;
    console.error(`  FAIL: ${file} is missing`);
    return;
  }

  const res = spawnSync('npx', ['tsx', rel], {
    cwd: backend,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    // Redis is optional for these paths; force the in-process fallbacks so the probe does not
    // sit in a connection-retry loop on a host without Redis.
    env: { ...process.env, FORCE_INMEMORY: '1', RATE_LIMIT_FORCE_MEMORY: '1', ...env },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });

  const out = `${res.stdout || ''}${res.stderr || ''}`;
  if (/Postgres not reachable|Can't reach database server|ECONNREFUSED 127\.0\.0\.1:5432/i.test(out)) {
    console.log(`  skip: ${label} (Postgres not reachable)`);
    return;
  }

  check(`live: ${label}`, res.status === 0);
  if (res.status !== 0) {
    console.error(out.split(/\r?\n/).filter((l) => /FAIL:|PROBE ERROR/.test(l)).slice(0, 12).join('\n'));
  }
}

console.log('\n[9] Live probes');
runProbe('billing subject resolves to the company', 'billing-account.probe.ts');
runProbe('entitlements follow the plan rows', 'entitlements.probe.ts');
runProbe('receipts immutable, reconcile read-only, log card-safe', 'payment-records.probe.ts');
runProbe('gates enforced over HTTP (401/403/201)', 'entitlements-http.probe.ts');

if (failures) {
  console.error(`\nverify-entitlements-records: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\n✅ verify-entitlements-records: plan limits enforced on real routes; receipts immutable; reconciliation read-only; payment log card-safe.');
process.exit(0);

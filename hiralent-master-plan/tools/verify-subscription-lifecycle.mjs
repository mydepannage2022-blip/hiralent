#!/usr/bin/env node
/**
 * verify-subscription-lifecycle.mjs — Wave 5 / Session 3 gate.
 *
 * Proves the outbound subscription LIFECYCLE is real, not the pre-Wave-5 stubs:
 *  - StripeGateway cancel is real (subscriptions.cancel + subscriptions.update
 *    {cancel_at_period_end}), refund is real (refunds.create — the `mock_refund_` fabrication
 *    is GONE), payment-status resolves a PaymentIntent, and plan change swaps the item with
 *    `proration_behavior: create_prorations` off a Price built from OUR amount,
 *  - the gateway interface + PayPal/Manual carry changeSubscriptionPlan,
 *  - the service exposes changeUserPlan / refundTransaction / sweepExpiredSubscriptions and a
 *    lazy expiry check,
 *  - the company change-plan route + admin refund route are wired,
 *  - the frontend billing page + nav item + changePlan api/hook exist.
 *
 * Plus an always-on OFFLINE SDK smoke that the installed `stripe` SDK exposes the lifecycle
 * calls the gateway relies on. Full behaviour (proration shape, cancel distinctness, refund →
 * refunded, lazy expiry) is covered fail-provably by
 * backend/src/__tests__/subscription-lifecycle.probe.ts.
 *
 * Node built-ins only (+ the repo's stripe SDK for the offline smoke). Windows-safe. Exit 0 = pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const backend = path.join(repoRoot, 'backend');
const payDir = path.join(backend, 'src', 'services', 'payment');

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log('  ok:', name);
  else { failures++; console.error('  FAIL:', name); }
};
const read = (p) => fs.readFileSync(p, 'utf8');

// ── 1) StripeGateway: real cancel / refund / status / plan change ──────────────
const stripeSrc = read(path.join(payDir, 'StripeGateway.ts'));
check('cancel calls subscriptions.cancel', stripeSrc.includes('subscriptions.cancel('));
check('cancel schedules via subscriptions.update({cancel_at_period_end})',
  /subscriptions\.update\([^)]*\{[^}]*cancel_at_period_end/s.test(stripeSrc));
check('refund calls stripe.refunds.create', stripeSrc.includes('refunds.create('));
check('refund no longer fabricates a mock_refund_ id', !stripeSrc.includes('mock_refund_'));
check('getPaymentStatus no longer returns a canned mock', !stripeSrc.includes('metadata: { mock: true }'));
check('plan change builds a Price (prices.create)', stripeSrc.includes('prices.create('));
check('plan change prorates (proration_behavior: create_prorations)',
  stripeSrc.includes("proration_behavior: 'create_prorations'"));
check('payment status resolves a PaymentIntent',
  stripeSrc.includes('checkout.sessions.retrieve(') || stripeSrc.includes('paymentIntents.retrieve('));

// ── 2) Interface + PayPal/Manual carry changeSubscriptionPlan ──────────────────
const baseSrc = read(path.join(payDir, 'BaseGateway.ts'));
check('IPaymentGateway declares changeSubscriptionPlan', baseSrc.includes('changeSubscriptionPlan:'));
check('PayPal gateway implements changeSubscriptionPlan',
  read(path.join(payDir, 'PayPalGateway.ts')).includes('changeSubscriptionPlan'));
check('Manual gateway implements changeSubscriptionPlan',
  read(path.join(payDir, 'PaymentGatewayFactory.ts')).includes('changeSubscriptionPlan'));

// ── 3) Service: change / refund / expiry ───────────────────────────────────────
const svcSrc = read(path.join(backend, 'src', 'services', 'subscription', 'subscription.service.ts'));
check('service exports changeUserPlan', svcSrc.includes('export const changeUserPlan'));
check('service exports refundTransaction', svcSrc.includes('export const refundTransaction'));
check('service exports sweepExpiredSubscriptions', svcSrc.includes('export const sweepExpiredSubscriptions'));
check('service has a lazy expiry check', svcSrc.includes('resolveExpiry'));
check('changeUserPlan reuses createOrUpdateSubscription', svcSrc.includes('createOrUpdateSubscription('));

// ── 4) Routes + controllers wired ──────────────────────────────────────────────
const subRoutes = read(path.join(backend, 'src', 'routes', 'subscription.routes.ts'));
check('subscription routes expose POST /change-plan', subRoutes.includes("'/change-plan'"));
const subCtrl = read(path.join(backend, 'src', 'controller', 'company', 'subscription.controller.ts'));
check('subscription controller has changePlan', subCtrl.includes('export const changePlan'));
const adminRoutes = read(path.join(backend, 'src', 'routes', 'admin.management.routes.ts'));
check('admin routes expose the refund endpoint', adminRoutes.includes('/transactions/:id/refund'));
const adminCtrl = read(path.join(backend, 'src', 'controller', 'superadmin', 'admin.management.controller.ts'));
check('admin controller has refundPayment', adminCtrl.includes('export const refundPayment'));

// ── 5) Frontend billing surface ────────────────────────────────────────────────
const billingPage = path.join(repoRoot, 'frontend', 'app', 'company', 'dashboard', 'billing', 'page.tsx');
check('frontend billing page exists', fs.existsSync(billingPage));
if (fs.existsSync(billingPage)) {
  const billingSrc = read(billingPage);
  check('billing page uses useMySubscription + useChangePlan + useCancelSubscription',
    billingSrc.includes('useMySubscription') && billingSrc.includes('useChangePlan') && billingSrc.includes('useCancelSubscription'));
}
const layoutSrc = read(path.join(repoRoot, 'frontend', 'app', 'company', 'dashboard', 'layout.tsx'));
check('company dashboard nav has a Billing link', layoutSrc.includes('/company/dashboard/billing'));
const feApi = read(path.join(repoRoot, 'frontend', 'src', 'lib', 'subscription', 'subscription.api.ts'));
check('frontend api has changePlan', feApi.includes('export const changePlan'));
const feQueries = read(path.join(repoRoot, 'frontend', 'src', 'lib', 'subscription', 'subscription.queries.ts'));
check('frontend queries expose useChangePlan', feQueries.includes('export const useChangePlan'));

// ── 6) Offline SDK smoke — the lifecycle calls exist on the installed SDK ───────
function offlineSmoke() {
  try {
    const require = createRequire(path.join(backend, 'package.json'));
    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_offline_smoke');
    check('offline: SDK exposes subscriptions.cancel', typeof stripe.subscriptions.cancel === 'function');
    check('offline: SDK exposes subscriptions.update', typeof stripe.subscriptions.update === 'function');
    check('offline: SDK exposes prices.create', typeof stripe.prices.create === 'function');
    check('offline: SDK exposes refunds.create', typeof stripe.refunds.create === 'function');
  } catch (e) {
    failures++;
    console.error('  FAIL: offline SDK smoke errored —', (e?.message || e));
  }
}

offlineSmoke();

// ── 7) Money-safety guards (S3 audit) ─────────────────────────────────────────
// The checks above prove the lifecycle CALLS the real SDK. They say nothing about whether the
// money paths can be abused — six exploits passed this gate before the audit. These assert the
// guards structurally; the live proof is subscription-money-safety.probe.ts below.
const svcSrcGuards = read(path.join(backend, 'src', 'services', 'subscription', 'subscription.service.ts'));

check('checkout only sells a publicly-available plan',
  /findFirst\(\{\s*where:\s*\{\s*plan_id:\s*request\.plan_id,\s*is_publicly_available:\s*true/s.test(svcSrcGuards));
check('change-plan only switches to a publicly-available plan',
  /findFirst\(\{\s*where:\s*\{\s*plan_id:\s*newPlanId,\s*is_publicly_available:\s*true/s.test(svcSrcGuards));
check('change-plan fails closed when there is no gateway subscription id',
  svcSrcGuards.includes('if (!subscription.gateway_subscription_id)'));
check('change-plan no longer coerces a missing gateway id to an empty string',
  !svcSrcGuards.includes("subscription.gateway_subscription_id ?? ''"));
check('refund claims the transaction atomically before calling the gateway',
  /updateMany\(\{\s*where:\s*\{\s*transaction_id:\s*transactionId,\s*status:\s*PaymentStatus\.SUCCEEDED\s*\},\s*data:\s*\{\s*status:\s*PaymentStatus\.PROCESSING/s.test(svcSrcGuards)
  && svcSrcGuards.includes('claim.count !== 1'));
check('refund caps the amount at the refundable balance',
  svcSrcGuards.includes('exceeds the refundable balance'));
check('refund accumulates partial refunds instead of flipping straight to refunded',
  svcSrcGuards.includes('refunded_amount') && svcSrcGuards.includes('fullyRefunded'));
check('refund sends a Stripe idempotency key',
  svcSrcGuards.includes('idempotency_key:') && stripeSrc.includes('idempotencyKey'));

const subRoutesGuards = read(path.join(backend, 'src', 'routes', 'subscription.routes.ts'));
check('money-moving subscription routes carry a role guard',
  subRoutesGuards.includes('checkRole') &&
  (subRoutesGuards.match(/requireBillingRole/g) || []).length >= 3);

// Admin billing slice: the refund endpoint is only usable if an admin can DISCOVER a
// transaction id, and only complete if there is a UI to trigger it from. Both halves must exist.
const adminCtrlSrc = read(path.join(backend, 'src', 'controller', 'superadmin', 'admin.management.controller.ts'));
check('admin can list transactions (refund ids are discoverable)',
  adminCtrlSrc.includes('export const listTransactions') &&
  adminRoutes.includes("router.get('/transactions'"));
check('transaction list reports the refundable balance, not the raw amount',
  adminCtrlSrc.includes('refundable_amount') && adminCtrlSrc.includes('refunded_amount'));

const adminBillingPage = path.join(repoRoot, 'frontend', 'app', 'admin', 'dashboard', 'billing', 'page.tsx');
check('admin billing page exists', fs.existsSync(adminBillingPage));
if (fs.existsSync(adminBillingPage)) {
  const src = read(adminBillingPage);
  check('admin billing page calls the list + refund endpoints',
    src.includes('/admin/transactions') && src.includes('/refund'));
  check('admin billing page caps the refund input at the refundable balance',
    src.includes('refundable_amount') && src.includes('amountInvalid'));
}
check('admin nav exposes Billing (both nav definitions)',
  read(path.join(repoRoot, 'frontend', 'app', 'admin', 'dashboard', 'layout.tsx')).includes('/admin/dashboard/billing') &&
  read(path.join(repoRoot, 'frontend', 'src', 'components', 'admin', 'SuperAdminSidebar.tsx')).includes('/admin/dashboard/billing'));

check('expiry sweep is actually scheduled (not a dead export)',
  fs.existsSync(path.join(backend, 'src', 'scheduler', 'subscriptionExpiry.scheduler.ts')) &&
  read(path.join(backend, 'src', 'server.ts')).includes('getSubscriptionExpiryScheduler'));

// ── 8) LIVE money-safety probe — the attacks, actually attempted ──────────────
// Self-skipping: needs Postgres. Without it the structural checks above still run.
function moneySafetyProbe() {
  const probe = path.join(backend, 'src', '__tests__', 'subscription-money-safety.probe.ts');
  if (!fs.existsSync(probe)) {
    failures++;
    console.error('  FAIL: subscription-money-safety.probe.ts is missing');
    return;
  }
  // Relative path on purpose: the repo path contains a space, and an absolute path through a
  // shell-spawned npx would be split on it.
  const res = spawnSync('npx', ['tsx', 'src/__tests__/subscription-money-safety.probe.ts'], {
    cwd: backend,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, FORCE_INMEMORY: '1' },
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  if (/Postgres not reachable|Can't reach database server|ECONNREFUSED/i.test(out)) {
    console.log('  skip: live money-safety probe (Postgres not reachable)');
    return;
  }
  check('live: all six money attacks blocked (money-safety probe)', res.status === 0);
  if (res.status !== 0) {
    console.error(out.split(/\r?\n/).filter((l) => /EXPLOITED/.test(l)).join('\n'));
  }
}

moneySafetyProbe();

if (failures) {
  console.error(`\nverify-subscription-lifecycle: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\n✅ verify-subscription-lifecycle: cancel/refund/plan-change real; expiry enforced; routes + billing UI wired.');
process.exit(0);

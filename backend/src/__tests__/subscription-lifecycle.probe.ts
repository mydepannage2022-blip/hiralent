// backend/src/__tests__/subscription-lifecycle.probe.ts
//
// Wave 5 / Session 3 — proof that subscription LIFECYCLE is real, not the pre-Wave-5 stubs:
// cancel (immediate vs at-period-end), upgrade/downgrade with proration, refund, and lazy
// expiry. The Stripe client is injected as a fake (no network) and the service DB effects are
// exercised against Postgres via the factory test-seam.
//
// Fail-provable, non-vacuous — the two riskiest (money + data-loss):
//   #1 UPGRADE/PRORATION — changeSubscriptionPlan must create a Price from OUR amount and swap
//      the item with `proration_behavior: 'create_prorations'`. Drop the proration_behavior (or
//      stop swapping the price) in StripeGateway.changeSubscriptionPlan → PART 1/PART 2 upgrade
//      assertions go RED.
//   #2 CANCEL DISTINCTNESS — immediate and at-period-end must write DISTINCT DB state. Make both
//      branches in cancelUserSubscription write the same thing → PART 2 cancel assertions RED.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/subscription-lifecycle.probe.ts

import type Stripe from 'stripe';

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_probe_dummy';

import prisma from '../lib/prisma';
import { createStripeGateway } from '../services/payment/StripeGateway';
import {
  __setGatewayForTest,
  __clearGatewayForTest,
} from '../services/payment/PaymentGatewayFactory';
import {
  changeUserPlan,
  cancelUserSubscription,
  refundTransaction,
  getUserSubscription,
} from '../services/subscription/subscription.service';
import { PaymentGatewayType } from '../types/payment.types';

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log('  ok:', name);
  else { failures++; console.error('  FAIL:', name); }
};

const last = <T>(a: T[]): T | undefined => a[a.length - 1];
const nowUnix = () => Math.floor(Date.now() / 1000);
const IN_30_DAYS = () => nowUnix() + 30 * 24 * 60 * 60;

// ── Fake Stripe client — records what the gateway sends, returns plausible objects ──────────
const calls = {
  pricesCreate: [] as any[],
  subsUpdate: [] as any[],
  subsCancel: [] as string[],
  refundsCreate: [] as any[],
};

const fakeStripe = {
  subscriptions: {
    retrieve: async (_id: string) => ({
      id: _id,
      status: 'active',
      items: { data: [{ id: 'si_fake_1', current_period_end: IN_30_DAYS() }] },
    }),
    update: async (id: string, params: any) => {
      calls.subsUpdate.push({ id, params });
      return {
        id,
        status: 'active',
        current_period_start: nowUnix(),
        current_period_end: IN_30_DAYS(),
        items: { data: [{ id: 'si_fake_1', current_period_start: nowUnix(), current_period_end: IN_30_DAYS() }] },
      };
    },
    cancel: async (id: string) => {
      calls.subsCancel.push(id);
      return {
        id,
        status: 'canceled',
        canceled_at: nowUnix(),
        items: { data: [{ id: 'si_fake_1', current_period_end: IN_30_DAYS() }] },
      };
    },
  },
  prices: {
    create: async (params: any) => {
      calls.pricesCreate.push(params);
      return { id: 'price_fake_1' };
    },
  },
  refunds: {
    create: async (params: any) => {
      calls.refundsCreate.push(params);
      return { id: 're_fake_1', status: 'succeeded', amount: params.amount ?? 6999 };
    },
  },
  checkout: {
    sessions: {
      retrieve: async (id: string) => ({
        id,
        payment_status: 'paid',
        amount_total: 6999,
        currency: 'usd',
        payment_intent: 'pi_fake_1',
      }),
    },
  },
  paymentIntents: {
    retrieve: async (id: string) => ({ id, status: 'succeeded', amount: 6999, currency: 'usd' }),
  },
} as unknown as Stripe;

const gw = createStripeGateway(fakeStripe);

const TAG = `lifeprobe-${Date.now()}`;
const planA = `${TAG}-planA`; // current plan ($69.99/mo)
const planB = `${TAG}-planB`; // upgrade target ($20.00/mo)
const users = {
  change: `${TAG}-change`,
  cancelImm: `${TAG}-cancelImm`,
  cancelSched: `${TAG}-cancelSched`,
  refund: `${TAG}-refund`,
  expire: `${TAG}-expire`,
};
const allUserIds = Object.values(users);

async function main() {
  // ============ PART 1 — GATEWAY CALL SHAPES (no DB) ============
  // #1 target: proration + price built from our amount.
  const change = await gw.changeSubscriptionPlan('sub_x', {
    unitAmount: 2000, currency: 'USD', interval: 'month', planName: 'Standard',
  });
  const priceCall = last(calls.pricesCreate);
  check('changeSubscriptionPlan creates a Price from our amount (unit_amount=2000)',
    priceCall?.unit_amount === 2000 && priceCall?.recurring?.interval === 'month');
  const swap = last(calls.subsUpdate);
  check('changeSubscriptionPlan swaps the item with create_prorations',
    swap?.params?.proration_behavior === 'create_prorations' &&
    swap?.params?.items?.[0]?.price === 'price_fake_1');
  check('changeSubscriptionPlan returns a gateway period end', change.current_period_end instanceof Date);

  // cancel — immediate vs scheduled hit different SDK calls.
  const imm = await gw.cancelSubscription('sub_imm', true);
  check('cancel immediate calls subscriptions.cancel', calls.subsCancel.includes('sub_imm'));
  check('cancel immediate result is not scheduled', imm.cancel_at_period_end === false);

  await gw.cancelSubscription('sub_sched', false);
  const schedUpdate = calls.subsUpdate.find((c) => c.id === 'sub_sched');
  check('cancel at-period-end calls subscriptions.update({cancel_at_period_end:true})',
    schedUpdate?.params?.cancel_at_period_end === true);

  // getPaymentStatus resolves a PaymentIntent from a checkout session (refund needs this).
  const status = await gw.getPaymentStatus('cs_fake_1');
  check('getPaymentStatus resolves payment_intent from a cs_ session',
    status.metadata?.payment_intent === 'pi_fake_1');

  // refund calls refunds.create with the resolved payment_intent (no mock id).
  const refund = await gw.refundPayment({ transaction_id: 't', payment_intent: 'pi_fake_1' });
  check('refundPayment calls refunds.create with the payment_intent',
    last(calls.refundsCreate)?.payment_intent === 'pi_fake_1');
  check('refundPayment returns the real refund id (not mock_refund_)',
    refund.refund_id === 're_fake_1' && !refund.refund_id.startsWith('mock_refund_'));

  // ============ PART 2 — SERVICE + DB (Postgres-gated) ============
  let dbAvailable = true;
  try {
    await prisma.$connect();
    await prisma.userSubscription.count();
  } catch (e: any) {
    dbAvailable = false;
    console.log('SKIP (DB parts): Postgres not reachable —', (e?.message || '').split('\n')[0]);
  }

  if (dbAvailable) {
    // Route the service's getPaymentGateway(STRIPE) to our fake gateway.
    __setGatewayForTest(PaymentGatewayType.STRIPE, gw);
    calls.subsUpdate.length = 0;
    calls.pricesCreate.length = 0;

    try {
      await prisma.subscriptionPlan.createMany({
        data: [
          { plan_id: planA, name: 'Probe A', price_monthly_usd: 69.99, price_annually_usd: 699.99, job_post_limit: 10, ai_interview_limit: 10, features_included: 'a', is_publicly_available: false, stripe_price_id_monthly: '', stripe_price_id_annually: '' },
          { plan_id: planB, name: 'Probe B', price_monthly_usd: 20.00, price_annually_usd: 200.00, job_post_limit: 5, ai_interview_limit: 5, features_included: 'b', is_publicly_available: false, stripe_price_id_monthly: '', stripe_price_id_annually: '' },
        ],
      });
      await prisma.user.createMany({
        data: allUserIds.map((uid) => ({
          user_id: uid, email: `${uid}@e.com`, password_hash: 'x',
          full_name: 'Lifecycle Probe', role: 'company_admin', is_email_verified: true,
        })),
      });

      const activeSub = (userId: string, extra: any = {}) => ({
        user_id: userId, plan_id: planA, payment_gateway: 'stripe',
        gateway_subscription_id: `sub_${userId}`, status: 'active', billing_cycle: 'monthly',
        current_period_start: new Date(), current_period_end: new Date(Date.now() + 30 * 864e5),
        cancel_at_period_end: false, ...extra,
      });
      await prisma.userSubscription.createMany({
        data: [
          activeSub(users.change),
          activeSub(users.cancelImm),
          activeSub(users.cancelSched),
          activeSub(users.refund),
          // expire: past period end + scheduled cancellation → lazy-check should flip to canceled.
          activeSub(users.expire, {
            cancel_at_period_end: true,
            current_period_end: new Date(Date.now() - 864e5),
          }),
        ],
      });

      // ---- UPGRADE (#1 at service level): plan swap + proration + gateway period ----
      const changed = await changeUserPlan(users.change, planB);
      check('changeUserPlan updates DB plan_id to the target', changed.plan_id === planB);
      const svcPrice = last(calls.pricesCreate);
      check('changeUserPlan drove a Price built from the target plan amount (2000 cents)',
        svcPrice?.unit_amount === 2000);
      const svcSwap = last(calls.subsUpdate);
      check('changeUserPlan drove a prorated item swap',
        svcSwap?.params?.proration_behavior === 'create_prorations');
      const changedRow = await prisma.userSubscription.findUnique({ where: { user_id: users.change } });
      check('changeUserPlan kept the subscription active', changedRow?.status === 'active');

      // ---- CANCEL DISTINCTNESS (#2): immediate vs at-period-end ----
      await cancelUserSubscription(users.cancelImm, true);
      const immRow = await prisma.userSubscription.findUnique({ where: { user_id: users.cancelImm } });
      check('immediate cancel → status canceled', immRow?.status === 'canceled');
      check('immediate cancel → canceled_at set', !!immRow?.canceled_at);
      check('immediate cancel → cancel_at_period_end false', immRow?.cancel_at_period_end === false);

      await cancelUserSubscription(users.cancelSched, false);
      const schedRow = await prisma.userSubscription.findUnique({ where: { user_id: users.cancelSched } });
      check('at-period-end cancel → status STILL active', schedRow?.status === 'active');
      check('at-period-end cancel → cancel_at_period_end true', schedRow?.cancel_at_period_end === true);
      check('at-period-end cancel → canceled_at set', !!schedRow?.canceled_at);
      // The two paths must NOT collapse to the same state.
      check('immediate and at-period-end produce DISTINCT status',
        immRow?.status !== schedRow?.status);

      // ---- REFUND: succeeded txn → refunded ----
      const txn = await prisma.paymentTransaction.create({
        data: {
          user_id: users.refund, amount: 69.99, currency: 'USD', payment_gateway: 'stripe',
          gateway_payment_id: 'cs_fake_refund', status: 'succeeded',
        },
      });
      const refundRes = await refundTransaction(txn.transaction_id);
      check('refundTransaction returns the real refund id', refundRes.refund_id === 're_fake_1');
      const txnAfter = await prisma.paymentTransaction.findUnique({ where: { transaction_id: txn.transaction_id } });
      check('refundTransaction flips the transaction to refunded', txnAfter?.status === 'refunded');

      // ---- EXPIRY: lazy-check on read flips a lapsed scheduled cancellation ----
      const resolved = await getUserSubscription(users.expire);
      check('lazy expiry: lapsed + cancel_at_period_end → canceled on read', resolved?.status === 'canceled');
      const expireRow = await prisma.userSubscription.findUnique({ where: { user_id: users.expire } });
      check('lazy expiry persisted to DB', expireRow?.status === 'canceled');
    } finally {
      __clearGatewayForTest(PaymentGatewayType.STRIPE);
      await prisma.user.deleteMany({ where: { user_id: { in: allUserIds } } }).catch(() => {}); // cascades subs + txns
      await prisma.subscriptionPlan.deleteMany({ where: { plan_id: { in: [planA, planB] } } }).catch(() => {});
      await prisma.$disconnect().catch(() => {});
    }
  } else {
    await prisma.$disconnect().catch(() => {});
  }

  if (failures) { console.error(`\nsubscription-lifecycle.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log(`\nsubscription-lifecycle.probe OK — lifecycle real${dbAvailable ? ' (gateway shapes + service DB proven)' : ' (gateway shapes only; DB skipped)'}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

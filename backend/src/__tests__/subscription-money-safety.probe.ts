// backend/src/__tests__/subscription-money-safety.probe.ts
//
// Wave 5 / Session 3 audit — the ATTACK side of the lifecycle. `subscription-lifecycle.probe`
// proves the happy paths call the real SDK; this one proves the money paths cannot be abused.
// Every case below was a CONFIRMED exploit before the audit fixes.
//
// Each `exploit(...)` is phrased as the SAFE property; a printed "EXPLOITED" means the safe
// property does not hold and the attack succeeded. Exit code is non-zero if any is exploited.
//
// Covered:
//   1. free upgrade via a subscription with no gateway_subscription_id
//   2. that null id being persisted as '' (making every later switch free too)
//   3. switching to an is_publicly_available=false plan the catalogue never offers
//   4. two concurrent refunds of one charge both reaching the gateway (double payout)
//   5. a partial refund marking the transaction fully refunded (stranding the balance)
//   6. refunding more than the transaction is worth
//
// Fail-provable: neuter the single-flight claim in refundTransaction (`if (claim.count !== 1)`)
// → case 4 goes RED with a double payout. Restore the `if (subscription.gateway_subscription_id)`
// skip in changeUserPlan → cases 1+2 go RED.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/subscription-money-safety.probe.ts
import type Stripe from 'stripe';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_probe_dummy';

import prisma from '../lib/prisma';
import { createStripeGateway } from '../services/payment/StripeGateway';
import { __setGatewayForTest, __clearGatewayForTest } from '../services/payment/PaymentGatewayFactory';
import { changeUserPlan, refundTransaction } from '../services/subscription/subscription.service';
import { PaymentGatewayType } from '../types/payment.types';

let broken = 0;
const exploit = (name: string, didBreak: boolean, detail: string) => {
  if (didBreak) {
    broken++;
    console.error('  EXPLOITED: ' + name + '\n      -> ' + detail);
  } else {
    console.log('  safe: ' + name);
  }
};

const nowUnix = () => Math.floor(Date.now() / 1000);
const IN_30 = () => nowUnix() + 30 * 86400;
const calls = { pricesCreate: [] as any[], subsUpdate: [] as any[], refundsCreate: [] as any[] };

const fakeStripe = {
  subscriptions: {
    retrieve: async (id: string) => ({
      id,
      status: 'active',
      items: { data: [{ id: 'si_1', current_period_end: IN_30() }] },
    }),
    update: async (id: string, params: any) => {
      calls.subsUpdate.push({ id, params });
      return {
        id,
        status: 'active',
        current_period_start: nowUnix(),
        current_period_end: IN_30(),
        items: { data: [{ id: 'si_1', current_period_end: IN_30() }] },
      };
    },
    cancel: async (id: string) => ({
      id,
      status: 'canceled',
      canceled_at: nowUnix(),
      items: { data: [{ id: 'si_1', current_period_end: IN_30() }] },
    }),
  },
  prices: {
    create: async (p: any) => {
      calls.pricesCreate.push(p);
      return { id: 'price_1' };
    },
  },
  refunds: {
    create: async (p: any) => {
      calls.refundsCreate.push(p);
      // Simulate network latency so a concurrent double-call actually overlaps.
      await new Promise((r) => setTimeout(r, 40));
      return { id: 're_' + calls.refundsCreate.length, status: 'succeeded', amount: p.amount ?? 6999 };
    },
  },
  checkout: {
    sessions: {
      retrieve: async (id: string) => ({
        id,
        payment_status: 'paid',
        amount_total: 6999,
        currency: 'usd',
        payment_intent: 'pi_1',
      }),
    },
  },
  paymentIntents: {
    retrieve: async (id: string) => ({ id, status: 'succeeded', amount: 6999, currency: 'usd' }),
  },
} as unknown as Stripe;

const gw = createStripeGateway(fakeStripe);
const TAG = 'hostile-' + Date.now();
const cheapPlan = TAG + '-cheap';
const pricyPlan = TAG + '-pricy';
const hiddenPlan = TAG + '-hidden';
const uFree = TAG + '-freeupgrade';
const uHidden = TAG + '-hiddenplan';
const uRefund = TAG + '-refundrace';
const allUsers = [uFree, uHidden, uRefund];

async function main() {
  await prisma.$connect();
  __setGatewayForTest(PaymentGatewayType.STRIPE, gw);
  try {
    await prisma.subscriptionPlan.createMany({
      data: [
        {
          plan_id: cheapPlan, name: 'Cheap', price_monthly_usd: 10.0, price_annually_usd: 100.0,
          job_post_limit: 1, ai_interview_limit: 1, features_included: 'c',
          is_publicly_available: true, stripe_price_id_monthly: '', stripe_price_id_annually: '',
        },
        {
          plan_id: pricyPlan, name: 'Pricy', price_monthly_usd: 500.0, price_annually_usd: 5000.0,
          job_post_limit: 500, ai_interview_limit: 500, features_included: 'p',
          is_publicly_available: true, stripe_price_id_monthly: '', stripe_price_id_annually: '',
        },
        // A plan the UI must never offer: hidden, unlimited, priced at zero.
        {
          plan_id: hiddenPlan, name: 'INTERNAL Unlimited', price_monthly_usd: 0.0, price_annually_usd: 0.0,
          job_post_limit: 99999, ai_interview_limit: 99999, features_included: 'everything',
          is_publicly_available: false, stripe_price_id_monthly: '', stripe_price_id_annually: '',
        },
      ],
    });
    await prisma.user.createMany({
      data: allUsers.map((uid) => ({
        user_id: uid, email: uid + '@e.com', password_hash: 'x',
        full_name: 'Hostile', role: 'company_admin', is_email_verified: true,
      })),
    });

    const sub = (uid: string, extra: any = {}) => ({
      user_id: uid, plan_id: cheapPlan, payment_gateway: 'stripe',
      gateway_subscription_id: 'sub_' + uid, status: 'active', billing_cycle: 'monthly',
      current_period_start: new Date(), current_period_end: new Date(Date.now() + 30 * 864e5),
      cancel_at_period_end: false, ...extra,
    });
    await prisma.userSubscription.createMany({
      data: [
        // A subscription with NO gateway id — reachable: the column is nullable (schema.prisma:2138).
        sub(uFree, { gateway_subscription_id: null }),
        sub(uHidden),
        sub(uRefund),
      ],
    });

    // == EXPLOIT 1: free upgrade — no gateway id means the gateway is never called ==
    calls.subsUpdate.length = 0;
    calls.pricesCreate.length = 0;
    // uFree currently sits on cheapPlan ($10) with NO gateway id — try to jump to the $500 plan.
    await changeUserPlan(uFree, pricyPlan).catch(() => undefined);
    const freeRow = await prisma.userSubscription.findUnique({ where: { user_id: uFree } });
    exploit(
      'changeUserPlan charges for an upgrade when gateway_subscription_id is null',
      freeRow?.plan_id === pricyPlan && calls.pricesCreate.length === 0 && calls.subsUpdate.length === 0,
      'plan became "' + freeRow?.plan_id + '" status=' + freeRow?.status +
        ' with ZERO Stripe calls (prices.create=' + calls.pricesCreate.length +
        ', subs.update=' + calls.subsUpdate.length + ') — user upgraded for free'
    );
    exploit(
      'null gateway id is preserved (not overwritten with an empty string)',
      freeRow?.gateway_subscription_id === '',
      'gateway_subscription_id persisted as "" (empty string), so every future change-plan also skips the gateway'
    );

    // == EXPLOIT 2: hidden plan reachable through the API ==
    calls.pricesCreate.length = 0;
    await changeUserPlan(uHidden, hiddenPlan).catch(() => undefined);
    const hiddenRow = await prisma.userSubscription.findUnique({
      where: { user_id: uHidden }, include: { plan: true },
    });
    exploit(
      'changeUserPlan rejects a non-public plan',
      hiddenRow?.plan_id === hiddenPlan,
      'switched to is_publicly_available=false plan "' + hiddenRow?.plan_id + '" (job_post_limit ' +
        hiddenRow?.plan?.job_post_limit + ') charged at $' + Number(hiddenRow?.plan?.price_monthly_usd) +
        ' — getAllPlans hides it, findUnique does not'
    );

    // == EXPLOIT 3: concurrent refunds on one transaction ==
    const txn = await prisma.paymentTransaction.create({
      data: {
        user_id: uRefund, amount: 69.99, currency: 'USD', payment_gateway: 'stripe',
        gateway_payment_id: 'cs_r', status: 'succeeded',
      },
    });
    calls.refundsCreate.length = 0;
    // Two concurrent FULL refunds of the same charge. Exactly one may reach the gateway;
    // if both do, the customer is paid out twice for one payment.
    const results = await Promise.allSettled([
      refundTransaction(txn.transaction_id),
      refundTransaction(txn.transaction_id),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const totalRefunded = calls.refundsCreate.reduce((s, c) => s + (c.amount || 0), 0) / 100;
    exploit(
      'refundTransaction is safe against a concurrent double-refund',
      calls.refundsCreate.length > 1 || totalRefunded > 69.99,
      calls.refundsCreate.length + ' refunds.create calls issued for ONE transaction (' + ok +
        ' succeeded) — $' + totalRefunded + ' refunded on a $69.99 charge'
    );

    // == EXPLOIT 4: partial refund marks the whole transaction refunded ==
    const t2 = await prisma.paymentTransaction.create({
      data: {
        user_id: uRefund, amount: 100.0, currency: 'USD', payment_gateway: 'stripe',
        gateway_payment_id: 'cs_r2', status: 'succeeded',
      },
    });
    await refundTransaction(t2.transaction_id, 1).catch(() => undefined);
    const t2After = await prisma.paymentTransaction.findUnique({ where: { transaction_id: t2.transaction_id } });
    exploit(
      'a $1 partial refund on a $100 txn does not mark it fully refunded',
      t2After?.status === 'refunded',
      'status="' + t2After?.status + '" after refunding only $1 of $100 — the remaining $99 can never be refunded (the status gate blocks it)'
    );

    // == EXPLOIT 5: refund more than the transaction amount ==
    const t3 = await prisma.paymentTransaction.create({
      data: {
        user_id: uRefund, amount: 5.0, currency: 'USD', payment_gateway: 'stripe',
        gateway_payment_id: 'cs_r3', status: 'succeeded',
      },
    });
    calls.refundsCreate.length = 0;
    let overOk = false;
    try {
      await refundTransaction(t3.transaction_id, 5000);
      overOk = true;
    } catch {
      /* rejected */
    }
    exploit(
      'refundTransaction caps the refund at the transaction amount',
      overOk && (calls.refundsCreate[0]?.amount ?? 0) > 500,
      'sent amount=' + calls.refundsCreate[0]?.amount +
        ' minor units to Stripe for a $5.00 transaction — no server-side cap, only Stripe would object'
    );
  } finally {
    __clearGatewayForTest(PaymentGatewayType.STRIPE);
    await prisma.user.deleteMany({ where: { user_id: { in: allUsers } } }).catch(() => {});
    await prisma.subscriptionPlan.deleteMany({ where: { plan_id: { in: [cheapPlan, pricyPlan, hiddenPlan] } } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
  if (broken) {
    console.error('\nsubscription-money-safety.probe: ' + broken + ' EXPLOIT(S) CONFIRMED');
    process.exit(1);
  }
  console.log('\nsubscription-money-safety.probe OK — all 6 money attacks blocked.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

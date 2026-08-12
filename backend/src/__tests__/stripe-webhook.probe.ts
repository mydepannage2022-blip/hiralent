// backend/src/__tests__/stripe-webhook.probe.ts
//
// Wave 5 / Session 2 — proof that Stripe webhooks are SIGNATURE-VERIFIED and that a verified
// event ACTIVATES the subscription exactly once (idempotent under Stripe retries).
//
// The signature half needs no DB/network: it uses the Stripe SDK's own
// `generateTestHeaderString` to sign a payload with a local secret and feeds it through the
// REAL `stripe.webhooks.constructEvent` (pure HMAC — the same code path production uses). The
// activation/idempotency half is self-gated on Postgres (SKIP + still report signature).
//
// Fail-provable, non-vacuous:
//   #1 SIGNATURE — a forged/garbage Stripe-Signature must make handleWebhook THROW. Neuter
//      verifyWebhookSignature/handleWebhook (e.g. `return true` / skip constructEvent) and the
//      "forged signature rejected" assertions go RED.
//   #2 IDEMPOTENCY — the same event id processed twice must be a single grant: 2nd call
//      returns {duplicate:true}, exactly ONE ProcessedWebhookEvent row, and the subscription
//      row's updated_at is UNCHANGED. Remove the dedup fast-path in
//      processStripeSubscriptionEvent and the 2nd call re-runs the upsert → updated_at moves
//      (or the create throws) → RED.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/stripe-webhook.probe.ts

import Stripe from 'stripe';

// Env must be set BEFORE the gateway reads it (constructEvent calls requireEnv at call time).
const WEBHOOK_SECRET = 'whsec_probe_secret_do_not_use_in_prod';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_probe_dummy';

import prisma from '../lib/prisma';
import { createStripeGateway } from '../services/payment/StripeGateway';
import { processStripeSubscriptionEvent } from '../services/subscription/subscription.service';

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log('  ok:', name);
  else { failures++; console.error('  FAIL:', name); }
};

// A real (offline) Stripe client — constructEvent/generateTestHeaderString are pure crypto.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const gw = createStripeGateway(stripe);

const TAG = `whprobe-${Date.now()}`;
const userId = `${TAG}-user`;
const planId = `${TAG}-plan`;
const subId = `sub_${TAG}`;
const custId = `cus_${TAG}`;
const checkoutSessionId = `cs_${TAG}`;

const evtCheckoutId = `evt_${TAG}_checkout`;
const evtFailedId = `evt_${TAG}_failed`;
const evtDeletedId = `evt_${TAG}_deleted`;
const allEventIds = [evtCheckoutId, evtFailedId, evtDeletedId];

// Build a signed (payload, header) pair the way Stripe would, using the local secret.
const signed = (event: any): { body: Buffer; header: string } => {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return { body: Buffer.from(payload), header };
};

const checkoutEvent = () => ({
  id: evtCheckoutId,
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: checkoutSessionId,
      object: 'checkout.session',
      subscription: subId,
      customer: custId,
      payment_status: 'paid',
      metadata: { user_id: userId, plan_id: planId, billing_cycle: 'monthly' },
    },
  },
});

async function main() {
  // ============ PART 1 — SIGNATURE VERIFICATION (no DB) ============
  const { body, header } = signed(checkoutEvent());

  // Valid signature → verified, normalized event.
  const result = await gw.handleWebhook(body, header);
  check('valid signature → event_id extracted', result.event_id === evtCheckoutId);
  check('valid signature → event_type is checkout.session.completed',
    result.event_type === 'checkout.session.completed');
  check('normalized data carries user_id/plan_id/billing_cycle from metadata',
    result.data.user_id === userId && result.data.plan_id === planId && result.data.billing_cycle === 'monthly');
  check('normalized data carries subscription/customer/checkout ids',
    result.data.subscription_id === subId &&
    result.data.customer_id === custId &&
    result.data.checkout_session_id === checkoutSessionId);

  // #1 HARD — forged / garbage signature must be rejected (throw).
  let forgedThrew = false;
  try { await gw.handleWebhook(body, 'garbage_signature'); } catch { forgedThrew = true; }
  check('forged signature is rejected (handleWebhook throws)', forgedThrew);

  // Tampered body with a header signed for the ORIGINAL body must also be rejected.
  let tamperThrew = false;
  try {
    const tampered = Buffer.from(JSON.stringify({ ...checkoutEvent(), id: 'evt_tampered' }));
    await gw.handleWebhook(tampered, header);
  } catch { tamperThrew = true; }
  check('tampered payload under a stale signature is rejected', tamperThrew);

  check('verifyWebhookSignature true for a valid signature', gw.verifyWebhookSignature(body, header) === true);
  check('verifyWebhookSignature false for a bad signature', gw.verifyWebhookSignature(body, 'nope') === false);

  // ============ PART 2 + 3 — ACTIVATION + IDEMPOTENCY + LIFECYCLE (DB-gated) ============
  let dbAvailable = true;
  try {
    await prisma.$connect();
    await prisma.processedWebhookEvent.count();
  } catch (e: any) {
    dbAvailable = false;
    console.log('SKIP (DB parts): Postgres not reachable —', (e?.message || '').split('\n')[0]);
  }

  if (dbAvailable) {
    try {
      // Seed a plan (FK Restrict) + user + a PENDING checkout transaction.
      await prisma.subscriptionPlan.create({
        data: {
          plan_id: planId,
          name: 'Probe Plan',
          price_monthly_usd: 9.99,
          price_annually_usd: 99.99,
          job_post_limit: 10,
          ai_interview_limit: 10,
          features_included: 'probe',
          is_publicly_available: false,
          stripe_price_id_monthly: '',
          stripe_price_id_annually: '',
        },
      });
      await prisma.user.create({
        data: {
          user_id: userId, email: `${userId}@e.com`, password_hash: 'x',
          full_name: 'Webhook Probe', role: 'company_admin', is_email_verified: true,
        },
      });
      await prisma.paymentTransaction.create({
        data: {
          user_id: userId, amount: 9.99, currency: 'USD', payment_gateway: 'stripe',
          gateway_payment_id: checkoutSessionId, status: 'pending',
        },
      });

      // ---- ACTIVATION: verified checkout.session.completed → subscription ACTIVE ----
      const first = await processStripeSubscriptionEvent(result);
      check('first process → {processed:true, duplicate:false}',
        first.processed === true && first.duplicate === false);

      const sub1 = await prisma.userSubscription.findUnique({ where: { user_id: userId } });
      check('subscription row created', sub1 !== null);
      check('subscription status is active', sub1?.status === 'active');
      check('gateway_subscription_id persisted', sub1?.gateway_subscription_id === subId);
      check('payment_gateway is stripe', sub1?.payment_gateway === 'stripe');

      const user1 = await prisma.user.findUnique({ where: { user_id: userId } });
      check('User.stripe_customer_id populated from webhook', user1?.stripe_customer_id === custId);

      const txn1 = await prisma.paymentTransaction.findFirst({ where: { gateway_payment_id: checkoutSessionId } });
      check('pending checkout transaction flipped to succeeded', txn1?.status === 'succeeded');

      const evtCount1 = await prisma.processedWebhookEvent.count({ where: { event_id: evtCheckoutId } });
      check('exactly 1 ProcessedWebhookEvent row after first process', evtCount1 === 1);

      // ---- #2 HARD IDEMPOTENCY: same event id again → single grant, no re-write ----
      const updatedAtBefore = sub1?.updated_at?.getTime();
      const second = await processStripeSubscriptionEvent(result);
      check('replay of same event id → {duplicate:true}', second.duplicate === true);

      const evtCount2 = await prisma.processedWebhookEvent.count({ where: { event_id: evtCheckoutId } });
      check('still exactly 1 ProcessedWebhookEvent row after replay', evtCount2 === 1);

      const sub2 = await prisma.userSubscription.findUnique({ where: { user_id: userId } });
      check('replay did NOT re-write the subscription (updated_at unchanged)',
        sub2?.updated_at?.getTime() === updatedAtBefore);

      // ---- LIFECYCLE (light): payment_failed → past_due, subscription.deleted → canceled ----
      const failedEvent = signed({
        id: evtFailedId, object: 'event', type: 'invoice.payment_failed',
        data: { object: { id: 'in_probe', object: 'invoice', status: 'open', customer: custId,
          parent: { subscription_details: { subscription: subId } } } },
      });
      const failedResult = await gw.handleWebhook(failedEvent.body, failedEvent.header);
      check('invoice.payment_failed normalizes subscription_id from parent.subscription_details',
        failedResult.data.subscription_id === subId);
      await processStripeSubscriptionEvent(failedResult);
      const subFailed = await prisma.userSubscription.findUnique({ where: { user_id: userId } });
      check('invoice.payment_failed → status past_due', subFailed?.status === 'past_due');

      const deletedEvent = signed({
        id: evtDeletedId, object: 'event', type: 'customer.subscription.deleted',
        data: { object: { id: subId, object: 'subscription', status: 'canceled', customer: custId, metadata: {} } },
      });
      const deletedResult = await gw.handleWebhook(deletedEvent.body, deletedEvent.header);
      await processStripeSubscriptionEvent(deletedResult);
      const subCanceled = await prisma.userSubscription.findUnique({ where: { user_id: userId } });
      check('customer.subscription.deleted → status canceled', subCanceled?.status === 'canceled');
    } finally {
      await prisma.processedWebhookEvent.deleteMany({ where: { event_id: { in: allEventIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { user_id: userId } }).catch(() => {}); // cascades sub + txn
      await prisma.subscriptionPlan.deleteMany({ where: { plan_id: planId } }).catch(() => {});
      await prisma.$disconnect().catch(() => {});
    }
  } else {
    await prisma.$disconnect().catch(() => {});
  }

  if (failures) { console.error(`\nstripe-webhook.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log(`\nstripe-webhook.probe OK — signatures verified${dbAvailable ? ', activation + idempotency proven' : ' (DB parts skipped)'}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

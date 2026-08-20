// backend/src/__tests__/payment-records.probe.ts
//
// Wave 5 / Session 4 — Phase 5.4 safety & records.
//
// Three properties that have to hold for the payment trail to be worth anything:
//   1. a receipt cannot be altered after it is written (DB trigger, not app convention)
//   2. reconciliation REPORTS a gateway/DB disagreement and never silently "fixes" it
//   3. card data never reaches the event log, whatever the gateway hands us
//
// Fail-provable: drop the trigger
//   (`DROP TRIGGER payment_receipt_no_update_or_delete ON "PaymentReceipt"`)
//   → the immutability cases go RED. Make scrubPaymentDetail return its input unchanged
//   → the card-data cases go RED.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/payment-records.probe.ts
import type Stripe from 'stripe';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_probe_dummy';

import prisma from '../lib/prisma';
import { createStripeGateway } from '../services/payment/StripeGateway';
import { __setGatewayForTest, __clearGatewayForTest } from '../services/payment/PaymentGatewayFactory';
import { issueReceipt } from '../services/payment/receipts.service';
import { logPaymentEvent, scrubPaymentDetail } from '../services/payment/paymentEvents.service';
import { reconcilePayments } from '../services/payment/reconciliation.service';
import { PaymentGatewayType, PaymentStatus } from '../types/payment.types';

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (ok) {
    console.log('  ok: ' + name);
  } else {
    failed++;
    console.error('  FAIL: ' + name + '\n      -> ' + detail);
  }
};

const SUFFIX = Date.now().toString(36);
const userId = `rec-user-${SUFFIX}`;

/** Stripe stub: reports every payment as succeeded, whatever our DB believes. */
const makeFakeStripe = (reported: string) =>
  ({
    checkout: {
      sessions: {
        retrieve: async (id: string) => ({
          id,
          status: reported === 'succeeded' ? 'complete' : 'open',
          payment_status: reported === 'succeeded' ? 'paid' : 'unpaid',
          amount_total: 6999,
          currency: 'usd',
          payment_intent: 'pi_probe_1',
        }),
      },
    },
    paymentIntents: {
      retrieve: async (id: string) => ({ id, status: reported, amount: 6999, currency: 'usd' }),
    },
  } as unknown as Stripe);

const cleanup = async () => {
  const txns = await prisma.paymentTransaction.findMany({ where: { user_id: userId }, select: { transaction_id: true } });
  const ids = txns.map((t) => t.transaction_id);
  if (ids.length) {
    // Receipts block deletion of their transaction (onDelete: Restrict) and cannot themselves be
    // deleted through Prisma — the trigger refuses. Drop them with the trigger disabled.
    await prisma.$executeRawUnsafe('ALTER TABLE "PaymentReceipt" DISABLE TRIGGER payment_receipt_no_update_or_delete').catch(() => {});
    await prisma.paymentReceipt.deleteMany({ where: { transaction_id: { in: ids } } }).catch(() => {});
    await prisma.$executeRawUnsafe('ALTER TABLE "PaymentReceipt" ENABLE TRIGGER payment_receipt_no_update_or_delete').catch(() => {});
  }
  await prisma.paymentEventLog.deleteMany({ where: { user_id: userId } });
  await prisma.paymentTransaction.deleteMany({ where: { user_id: userId } });
  await prisma.user.deleteMany({ where: { user_id: userId } });
};

const main = async () => {
  await cleanup();

  await prisma.user.create({
    data: { user_id: userId, email: `rec-${SUFFIX}@probe.test`, full_name: 'Rec Probe', role: 'company_admin', is_email_verified: true },
  });

  const settled = await prisma.paymentTransaction.create({
    data: {
      user_id: userId,
      amount: 69.99,
      currency: 'USD',
      payment_gateway: PaymentGatewayType.STRIPE,
      gateway_payment_id: `cs_probe_${SUFFIX}`,
      status: PaymentStatus.SUCCEEDED,
      metadata: { plan_id: 'plan_standard', billing_cycle: 'monthly' },
    },
  });

  // === 1. Receipts are issued once, for settled money only =================================
  const pending = await prisma.paymentTransaction.create({
    data: {
      user_id: userId,
      amount: 10.0,
      currency: 'USD',
      payment_gateway: PaymentGatewayType.STRIPE,
      gateway_payment_id: `cs_pending_${SUFFIX}`,
      status: PaymentStatus.PENDING,
    },
  });

  const pendingReceipt = await issueReceipt(pending.transaction_id);
  check(
    'a pending transaction gets no receipt',
    pendingReceipt.issued === false && String(pendingReceipt.reason).startsWith('status_not_receiptable'),
    `issued=${pendingReceipt.issued} reason=${pendingReceipt.reason}`
  );

  const first = await issueReceipt(settled.transaction_id);
  check('a settled transaction gets a receipt', first.issued === true && !!first.receipt_number, JSON.stringify(first));

  const second = await issueReceipt(settled.transaction_id);
  const receiptCount = await prisma.paymentReceipt.count({ where: { transaction_id: settled.transaction_id } });
  check(
    'issuing twice is idempotent (webhook retries do not duplicate)',
    second.issued === false && receiptCount === 1,
    `second.issued=${second.issued} rows=${receiptCount}`
  );

  // The scrubber must not eat the audit trail either. This half was missing at first, and an
  // over-broad `number` rule was silently deleting `receipt_number` from the issue event — the
  // one field support would quote — while every card-data assertion still passed.
  const issuedEvent = await prisma.paymentEventLog.findFirst({
    where: { transaction_id: settled.transaction_id, event_type: 'receipt.issued' },
  });
  check(
    'the receipt.issued event keeps its receipt_number',
    (issuedEvent?.detail as any)?.receipt_number === first.receipt_number,
    `detail=${JSON.stringify(issuedEvent?.detail ?? null)} (expected receipt_number=${first.receipt_number})`
  );

  // === 2. Immutability is enforced by the database ==========================================
  let updateThrew = false;
  let updateError = '';
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "PaymentReceipt" SET amount = 0.01 WHERE transaction_id = '${settled.transaction_id}'`
    );
  } catch (err) {
    updateThrew = true;
    updateError = (err as Error).message.split('\n')[0];
  }
  check('raw SQL UPDATE on a receipt is rejected by the DB', updateThrew, `no error raised — receipt was rewritten. ${updateError}`);

  let deleteThrew = false;
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "PaymentReceipt" WHERE transaction_id = '${settled.transaction_id}'`
    );
  } catch {
    deleteThrew = true;
  }
  check('raw SQL DELETE on a receipt is rejected by the DB', deleteThrew, 'no error raised — receipt was destroyed');

  const stillThere = await prisma.paymentReceipt.findUnique({ where: { transaction_id: settled.transaction_id } });
  check(
    'the receipt survived both attempts with its amount intact',
    !!stillThere && Number(stillThere.amount) === 69.99,
    `row=${stillThere ? Number(stillThere.amount) : 'gone'}`
  );

  // === 3. Reconciliation reports, and only reports ==========================================
  // DB says pending; Stripe says succeeded — exactly the shape of a missed webhook.
  __setGatewayForTest(PaymentGatewayType.STRIPE, createStripeGateway(makeFakeStripe('succeeded')));

  const report = await reconcilePayments({ since: new Date(Date.now() - 86400_000), limit: 50 });
  const flagged = report.mismatches.find((m) => m.transaction_id === pending.transaction_id);

  check(
    'a DB/gateway status disagreement is flagged',
    !!flagged && flagged.db_status === PaymentStatus.PENDING && flagged.gateway_status === PaymentStatus.SUCCEEDED,
    flagged ? JSON.stringify(flagged) : `not flagged. mismatches=${JSON.stringify(report.mismatches.map((m) => m.transaction_id))}`
  );

  const afterReconcile = await prisma.paymentTransaction.findUnique({ where: { transaction_id: pending.transaction_id } });
  check(
    'reconciliation did NOT rewrite payment state',
    afterReconcile?.status === PaymentStatus.PENDING,
    `status is now ${afterReconcile?.status} — reconciliation must report, never repair`
  );

  const mismatchEvent = await prisma.paymentEventLog.findFirst({
    where: { transaction_id: pending.transaction_id, event_type: 'reconcile.mismatch' },
  });
  check('the mismatch is recorded in the payment event log', !!mismatchEvent, 'no reconcile.mismatch row');

  // A settled transaction that agrees with the gateway must NOT be flagged — otherwise the
  // "mismatch found" result above would be meaningless.
  const settledFlagged = report.mismatches.some((m) => m.transaction_id === settled.transaction_id);
  check('an agreeing transaction is not flagged (no false positives)', settledFlagged === false, 'agreeing transaction was flagged');

  __clearGatewayForTest(PaymentGatewayType.STRIPE);

  // === 4. Card data never reaches the log ===================================================
  const hostile = {
    number: '4242424242424242',
    card: { number: '4111 1111 1111 1111', cvc: '123', exp_month: 12, exp_year: 2030, last4: '4242' },
    payment_method_details: { card: { last4: '4242', brand: 'visa' } },
    note: 'customer said their card 4242 4242 4242 4242 was declined',
    plan_id: 'plan_standard',
    amount: 6999,
  };

  const scrubbed = JSON.stringify(scrubPaymentDetail(hostile));
  for (const forbidden of ['4242424242424242', '4111 1111 1111 1111', '"cvc"', '"exp_month"', '"last4"']) {
    check(`scrubber drops ${forbidden}`, !scrubbed.includes(forbidden), `still present in: ${scrubbed}`);
  }
  check(
    'scrubber keeps the non-sensitive fields that make the log useful',
    scrubbed.includes('plan_standard') && scrubbed.includes('6999'),
    scrubbed
  );

  // Guard teeth for the narrowed key rule: innocent *_number fields must survive.
  const innocent = JSON.stringify(
    scrubPaymentDetail({ receipt_number: 'HIR-202608-ABCD1234', registration_number: 'RC-99', number: '4242424242424242' })
  );
  check(
    'scrubber keeps receipt_number / registration_number but still drops a bare number',
    innocent.includes('HIR-202608-ABCD1234') && innocent.includes('RC-99') && !innocent.includes('4242424242424242'),
    innocent
  );

  await logPaymentEvent({
    source: 'stripe_webhook',
    event_type: 'probe.cardsafety',
    user_id: userId,
    detail: hostile,
  });

  const logged = await prisma.paymentEventLog.findFirst({
    where: { user_id: userId, event_type: 'probe.cardsafety' },
  });
  const loggedJson = JSON.stringify(logged?.detail ?? {});
  check(
    'the persisted row contains no PAN, CVC or expiry',
    !!logged && !/4242424242424242|4111|cvc|exp_month|exp_year|last4/i.test(loggedJson),
    `persisted: ${loggedJson}`
  );

  // === 5. Logging never breaks the money path ==============================================
  let threw = false;
  try {
    // transaction_id that does not exist, plus an unserialisable value
    await logPaymentEvent({
      source: 'checkout',
      event_type: 'probe.resilience',
      user_id: userId,
      detail: { circular: (() => { const o: any = {}; o.self = o; return o; })() },
    });
  } catch {
    threw = true;
  }
  check('a bad log write never throws into the caller', threw === false, 'logPaymentEvent propagated an error');
};

main()
  .catch((e) => {
    failed++;
    console.error('PROBE ERROR:', e);
  })
  .finally(async () => {
    __clearGatewayForTest(PaymentGatewayType.STRIPE);
    await cleanup().catch(() => {});
    await prisma.$disconnect();
    console.log(failed === 0 ? '\nPASS — payment records are immutable, reconciled and card-safe' : `\nFAIL — ${failed} check(s)`);
    process.exit(failed === 0 ? 0 : 1);
  });

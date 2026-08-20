import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logPaymentEvent } from './paymentEvents.service';
import { scrubPaymentDetail } from './paymentEvents.service';

/**
 * Immutable payment receipts.
 *
 * A receipt is issued once, when a transaction settles, and is never edited: the database
 * rejects UPDATE and DELETE on `PaymentReceipt` via a trigger, so this module deliberately
 * exposes no update path at all. Corrections are made by issuing a new record, the way ledgers
 * do it — not by rewriting the old one.
 *
 * `transaction_id` is UNIQUE, which doubles as the idempotency key: a webhook Stripe delivers
 * twice produces one receipt, and the second attempt is a silent no-op rather than an error.
 */

/** `HIR-<yyyymm>-<short id>` — quotable in a support ticket, no sequence to contend on. */
const buildReceiptNumber = (transactionId: string, issuedAt: Date): string => {
  const stamp = `${issuedAt.getUTCFullYear()}${String(issuedAt.getUTCMonth() + 1).padStart(2, '0')}`;
  const short = transactionId.replace(/-/g, '').slice(-8).toUpperCase();
  return `HIR-${stamp}-${short}`;
};

export interface IssueReceiptResult {
  issued: boolean;
  receipt_id?: string;
  receipt_number?: string;
  reason?: string;
}

/**
 * Issue the receipt for a settled transaction. Safe to call repeatedly.
 *
 * Only settled money gets a receipt — issuing one for a pending or failed transaction would put
 * a permanent, unamendable record behind something that has not actually been paid.
 */
export const issueReceipt = async (transactionId: string): Promise<IssueReceiptResult> => {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { transaction_id: transactionId },
    include: {
      subscription: { include: { plan: true } },
    },
  });

  if (!transaction) return { issued: false, reason: 'transaction_not_found' };

  const RECEIPTABLE = ['succeeded', 'refunded'];
  if (!RECEIPTABLE.includes(transaction.status)) {
    return { issued: false, reason: `status_not_receiptable:${transaction.status}` };
  }

  const existing = await prisma.paymentReceipt.findUnique({ where: { transaction_id: transactionId } });
  if (existing) {
    return { issued: false, receipt_id: existing.receipt_id, receipt_number: existing.receipt_number, reason: 'already_issued' };
  }

  const issuedAt = new Date();
  const receiptNumber = buildReceiptNumber(transactionId, issuedAt);

  // Frozen snapshot. Built field by field (and scrubbed) so no gateway blob — and no card
  // data inside one — can ever be sealed into an unamendable row.
  const payload = scrubPaymentDetail({
    transaction_id: transaction.transaction_id,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    status: transaction.status,
    gateway: transaction.payment_gateway,
    gateway_payment_id: transaction.gateway_payment_id,
    payment_method: transaction.payment_method,
    plan_name: transaction.subscription?.plan?.name ?? null,
    billing_cycle: transaction.subscription?.billing_cycle ?? null,
    period_start: transaction.subscription?.current_period_start?.toISOString() ?? null,
    period_end: transaction.subscription?.current_period_end?.toISOString() ?? null,
    issued_at: issuedAt.toISOString(),
  });

  try {
    const receipt = await prisma.paymentReceipt.create({
      data: {
        receipt_number: receiptNumber,
        transaction_id: transaction.transaction_id,
        user_id: transaction.user_id,
        amount: transaction.amount,
        currency: transaction.currency,
        status_at_issue: transaction.status,
        gateway: transaction.payment_gateway,
        gateway_payment_id: transaction.gateway_payment_id,
        plan_name: transaction.subscription?.plan?.name ?? null,
        billing_cycle: transaction.subscription?.billing_cycle ?? null,
        period_start: transaction.subscription?.current_period_start ?? null,
        period_end: transaction.subscription?.current_period_end ?? null,
        issued_at: issuedAt,
        payload: payload as any,
      },
    });

    await logPaymentEvent({
      source: 'checkout',
      event_type: 'receipt.issued',
      user_id: transaction.user_id,
      transaction_id: transaction.transaction_id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      detail: { receipt_number: receipt.receipt_number },
    });

    return { issued: true, receipt_id: receipt.receipt_id, receipt_number: receipt.receipt_number };
  } catch (error) {
    // Two concurrent settlements of the same transaction both passed the findUnique above;
    // the UNIQUE constraint picks one winner and the loser reports the existing receipt.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await prisma.paymentReceipt.findUnique({ where: { transaction_id: transactionId } });
      return {
        issued: false,
        receipt_id: winner?.receipt_id,
        receipt_number: winner?.receipt_number,
        reason: 'already_issued',
      };
    }
    throw error;
  }
};

/**
 * Issue receipts for every settled transaction on a subscription that does not have one yet.
 * Used from the webhook path, where the transaction that just settled is identified by the
 * gateway rather than by our id.
 */
export const issueReceiptsForSubscription = async (subscriptionId: string): Promise<number> => {
  const settled = await prisma.paymentTransaction.findMany({
    where: { subscription_id: subscriptionId, status: 'succeeded', receipt: null },
    select: { transaction_id: true },
  });

  let issued = 0;
  for (const t of settled) {
    const result = await issueReceipt(t.transaction_id).catch((err) => {
      console.error('[receipts] issue failed for', t.transaction_id, (err as Error).message);
      return { issued: false } as IssueReceiptResult;
    });
    if (result.issued) issued++;
  }
  return issued;
};

/** Issue the receipt for the transaction behind a checkout session. */
export const issueReceiptForCheckoutSession = async (checkoutSessionId: string): Promise<number> => {
  const transactions = await prisma.paymentTransaction.findMany({
    where: { gateway_payment_id: checkoutSessionId, status: 'succeeded', receipt: null },
    select: { transaction_id: true },
  });

  let issued = 0;
  for (const t of transactions) {
    const result = await issueReceipt(t.transaction_id).catch(() => ({ issued: false } as IssueReceiptResult));
    if (result.issued) issued++;
  }
  return issued;
};

export const listReceiptsForUser = async (userId: string, take = 50, skip = 0) => {
  const [items, total] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where: { user_id: userId },
      orderBy: { issued_at: 'desc' },
      take: Math.min(Math.max(take, 1), 200),
      skip: Math.max(skip, 0),
    }),
    prisma.paymentReceipt.count({ where: { user_id: userId } }),
  ]);
  return { items, total };
};

export const getReceipt = async (receiptId: string) =>
  prisma.paymentReceipt.findUnique({ where: { receipt_id: receiptId } });

export const getReceiptByTransaction = async (transactionId: string) =>
  prisma.paymentReceipt.findUnique({ where: { transaction_id: transactionId } });

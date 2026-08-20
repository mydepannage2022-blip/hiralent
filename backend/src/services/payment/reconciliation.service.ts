import prisma from '../../lib/prisma';
import { getPaymentGateway } from './PaymentGatewayFactory';
import { PaymentGatewayType, PaymentStatus } from '../../types/payment.types';
import { logPaymentEvent } from './paymentEvents.service';

/**
 * Reconcile our payment records against the gateway.
 *
 * Deliberately **read-only**: it reports disagreements and never repairs them. An automated
 * writer here would be a money-moving process running unattended against data we already know
 * to be untrustworthy — if our row says `pending` and Stripe says `succeeded`, the right next
 * step is a human deciding whether the customer was charged, not a job silently granting access.
 *
 * Webhooks remain the only thing that changes subscription state (Wave 5 S2). This is the
 * safety net that proves they did.
 */

export interface Mismatch {
  transaction_id: string;
  user_id: string;
  gateway_payment_id: string | null;
  db_status: string;
  gateway_status: string;
  amount: string;
  currency: string;
  created_at: Date;
  kind: 'status_mismatch' | 'unresolvable';
  note?: string;
}

export interface ReconciliationReport {
  checked: number;
  skipped: number;
  mismatches: Mismatch[];
  started_at: Date;
  finished_at: Date;
  gateway_configured: boolean;
}

export interface ReconcileOptions {
  /** Only look at transactions created on/after this instant. */
  since?: Date;
  /** Hard cap on how many transactions to inspect in one run. */
  limit?: number;
}

const DEFAULT_LOOKBACK_DAYS = Number(process.env.RECONCILE_LOOKBACK_DAYS ?? 30);
const DEFAULT_LIMIT = 200;

/**
 * Map a gateway status onto ours. Stripe reports PaymentIntent/session states; we store the
 * PaymentStatus enum. Anything unrecognised is reported rather than guessed.
 */
const normalizeGatewayStatus = (raw: string): string => {
  const s = String(raw || '').toLowerCase();
  if (['succeeded', 'paid', 'complete', 'completed'].includes(s)) return PaymentStatus.SUCCEEDED;
  if (['canceled', 'cancelled'].includes(s)) return PaymentStatus.CANCELED;
  if (['processing'].includes(s)) return PaymentStatus.PROCESSING;
  if (['requires_payment_method', 'requires_action', 'requires_confirmation', 'requires_capture', 'open', 'unpaid'].includes(s)) {
    return PaymentStatus.PENDING;
  }
  if (['failed', 'payment_failed'].includes(s)) return PaymentStatus.FAILED;
  return s;
};

/**
 * A refunded transaction legitimately reads as `succeeded` at the gateway — the original charge
 * did succeed, the refund is a separate object. Treating that as a mismatch would flag every
 * refund we have ever issued.
 */
const isExpectedDivergence = (dbStatus: string, gatewayStatus: string): boolean =>
  dbStatus === PaymentStatus.REFUNDED && gatewayStatus === PaymentStatus.SUCCEEDED;

export const reconcilePayments = async (options: ReconcileOptions = {}): Promise<ReconciliationReport> => {
  const startedAt = new Date();
  const since = options.since ?? new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 86400_000);
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 1000);

  const gateway = getPaymentGateway(PaymentGatewayType.STRIPE);
  const configured = gateway.isConfigured();

  if (!configured) {
    // No credentials means we cannot ask the gateway anything. Say so plainly rather than
    // returning an empty mismatch list, which would read as "everything reconciles".
    return {
      checked: 0,
      skipped: 0,
      mismatches: [],
      started_at: startedAt,
      finished_at: new Date(),
      gateway_configured: false,
    };
  }

  const transactions = await prisma.paymentTransaction.findMany({
    where: {
      created_at: { gte: since },
      payment_gateway: PaymentGatewayType.STRIPE,
      gateway_payment_id: { not: null },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  const mismatches: Mismatch[] = [];
  let checked = 0;
  let skipped = 0;

  for (const t of transactions) {
    if (!t.gateway_payment_id) {
      skipped++;
      continue;
    }

    let gatewayStatus: string;
    try {
      const status = await gateway.getPaymentStatus(t.gateway_payment_id);
      gatewayStatus = normalizeGatewayStatus(status.status);
    } catch (err) {
      mismatches.push({
        transaction_id: t.transaction_id,
        user_id: t.user_id,
        gateway_payment_id: t.gateway_payment_id,
        db_status: t.status,
        gateway_status: 'unreachable',
        amount: t.amount.toString(),
        currency: t.currency,
        created_at: t.created_at,
        kind: 'unresolvable',
        note: (err as Error).message,
      });
      checked++;
      continue;
    }

    checked++;

    if (gatewayStatus !== t.status && !isExpectedDivergence(t.status, gatewayStatus)) {
      const mismatch: Mismatch = {
        transaction_id: t.transaction_id,
        user_id: t.user_id,
        gateway_payment_id: t.gateway_payment_id,
        db_status: t.status,
        gateway_status: gatewayStatus,
        amount: t.amount.toString(),
        currency: t.currency,
        created_at: t.created_at,
        kind: 'status_mismatch',
      };
      mismatches.push(mismatch);

      await logPaymentEvent({
        source: 'reconcile',
        event_type: 'reconcile.mismatch',
        user_id: t.user_id,
        transaction_id: t.transaction_id,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        detail: { db_status: t.status, gateway_status: gatewayStatus, gateway_payment_id: t.gateway_payment_id },
      });
    }
  }

  const report: ReconciliationReport = {
    checked,
    skipped,
    mismatches,
    started_at: startedAt,
    finished_at: new Date(),
    gateway_configured: true,
  };

  await logPaymentEvent({
    source: 'reconcile',
    event_type: 'reconcile.completed',
    detail: { checked, skipped, mismatch_count: mismatches.length, since: since.toISOString() },
  });

  return report;
};

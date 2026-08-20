import prisma from '../../lib/prisma';

/**
 * Append-only log of payment activity, for support and reconciliation.
 *
 * Two rules:
 *  1. **Never blocks the money path.** Every write is best-effort, exactly like the admin audit
 *     helper — a logging failure must not fail a charge, a refund, or a webhook (which Stripe
 *     would then retry).
 *  2. **Never stores card data.** `detail` is assembled from an explicit allow-list rather than
 *     by spreading whatever the gateway handed us, and anything that looks like a PAN/CVC/expiry
 *     is dropped even if it arrives under an allow-listed key.
 */

export type PaymentEventSource = 'checkout' | 'stripe_webhook' | 'admin_refund' | 'reconcile';

export interface PaymentEventInput {
  source: PaymentEventSource;
  event_type: string;
  gateway_event_id?: string | null;
  user_id?: string | null;
  transaction_id?: string | null;
  subscription_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  detail?: Record<string, unknown> | null;
}

/**
 * Key names that must never be persisted.
 *
 * Matched on the key with separators removed, so `exp_month`, `expMonth` and `EXP-MONTH` are one
 * entry. An earlier substring rule also swallowed innocent keys — `receipt_number` matched the
 * `number` token and was silently dropped, which quietly gutted the `receipt.issued` audit line
 * of the only field support would quote. Exact-token matching keeps `receipt_number` and
 * `registration_number` while still dropping a bare `number`.
 */
const FORBIDDEN_KEYS = new Set([
  'number',
  'cardnumber',
  'ccnumber',
  'accountnumber',
  'pan',
  'cvc',
  'cvv',
  'csc',
  'securitycode',
  'expmonth',
  'expyear',
  'expirationmonth',
  'expirationyear',
  'expiry',
  'expirationdate',
  'last4',
  'iin',
  'bin',
]);

/** Any key naming a card object or field — `card`, `card_number`, `payment_method.card`. */
const CARD_KEY_PATTERN = /(^|[^a-z])card([^a-z]|$)/i;

const normaliseKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const isForbiddenKey = (key: string): boolean =>
  FORBIDDEN_KEYS.has(normaliseKey(key)) || CARD_KEY_PATTERN.test(key);

/** Long digit runs are treated as a card number wherever they appear. */
const PAN_LIKE = /\b(?:\d[ -]*?){13,19}\b/;

const MAX_DEPTH = 4;
const MAX_KEYS = 40;

/**
 * Copy a plain object, dropping any key that names card data and any value that looks like a
 * card number. Unknown nested shapes are walked rather than trusted.
 */
export const scrubPaymentDetail = (input: unknown, depth = 0): unknown => {
  if (input === null || input === undefined) return input;
  if (depth > MAX_DEPTH) return '[truncated]';

  if (typeof input === 'string') {
    return PAN_LIKE.test(input) ? '[redacted]' : input;
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return PAN_LIKE.test(String(input)) ? '[redacted]' : input;
  }
  if (Array.isArray(input)) {
    return input.slice(0, MAX_KEYS).map((v) => scrubPaymentDetail(v, depth + 1));
  }
  if (typeof input !== 'object') return undefined;

  const out: Record<string, unknown> = {};
  let kept = 0;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (kept >= MAX_KEYS) break;
    if (isForbiddenKey(key)) continue; // dropped entirely — not even redacted-in-place
    const scrubbed = scrubPaymentDetail(value, depth + 1);
    if (scrubbed !== undefined) {
      out[key] = scrubbed;
      kept++;
    }
  }
  return out;
};

/** Record a payment event. Returns silently on failure — see rule 1 above. */
export const logPaymentEvent = async (input: PaymentEventInput): Promise<void> => {
  try {
    await prisma.paymentEventLog.create({
      data: {
        event_source: input.source,
        event_type: input.event_type,
        gateway_event_id: input.gateway_event_id ?? null,
        user_id: input.user_id ?? null,
        transaction_id: input.transaction_id ?? null,
        subscription_id: input.subscription_id ?? null,
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        status: input.status ?? null,
        detail: (scrubPaymentDetail(input.detail ?? {}) as any) ?? {},
      },
    });
  } catch (err) {
    console.error('[paymentEvents] log write failed:', (err as Error).message);
  }
};

export interface PaymentEventFilters {
  user_id?: string;
  event_type?: string;
  source?: string;
  skip?: number;
  take?: number;
}

export const listPaymentEvents = async (filters: PaymentEventFilters = {}) => {
  const take = Math.min(Math.max(filters.take ?? 50, 1), 200);
  const skip = Math.max(filters.skip ?? 0, 0);

  const where = {
    ...(filters.user_id ? { user_id: filters.user_id } : {}),
    ...(filters.event_type ? { event_type: filters.event_type } : {}),
    ...(filters.source ? { event_source: filters.source } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.paymentEventLog.findMany({ where, orderBy: { created_at: 'desc' }, skip, take }),
    prisma.paymentEventLog.count({ where }),
  ]);

  return { items, total, skip, take };
};

import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { getPaymentGateway } from '../payment/PaymentGatewayFactory';
import { WebhookResult, formatAmountForGateway } from '../payment/BaseGateway';
import {
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  UserSubscription,
  SubscriptionStatus,
  BillingCycle
} from '../../types/subscription.types';
import {
  PaymentGatewayType,
  PaymentStatus,
  CreatePaymentSessionData
} from '../../types/payment.types';

export const createCheckoutSession = async (
  userId: string, 
  request: CreateCheckoutSessionRequest
): Promise<CheckoutSessionResponse> => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { plan_id: request.plan_id }
  });

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  const amount = request.billing_cycle === BillingCycle.MONTHLY
    ? Number(plan.price_monthly_usd)
    : Number(plan.price_annually_usd);

  const gateway = getPaymentGateway(request.payment_gateway as PaymentGatewayType);

  // Pre-fill the gateway checkout with the buyer's email when we have it.
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { email: true }
  });

  const sessionData: CreatePaymentSessionData = {
    user_id: userId,
    plan_id: request.plan_id,
    billing_cycle: request.billing_cycle,
    amount,
    currency: 'USD',
    success_url: request.success_url || `${process.env.FRONTEND_URL}/payment/success`,
    cancel_url: request.cancel_url || `${process.env.FRONTEND_URL}/payment/cancel`,
    customer_email: user?.email,
    metadata: {
      plan_name: plan.name,
      billing_cycle: request.billing_cycle
    }
  };

  const result = await gateway.createCheckoutSession(sessionData);

  await prisma.paymentTransaction.create({
    data: {
      user_id: userId,
      amount,
      currency: 'USD',
      payment_gateway: request.payment_gateway,
      gateway_payment_id: result.session_id,
      status: PaymentStatus.PENDING,
      metadata: {
        plan_id: request.plan_id,
        billing_cycle: request.billing_cycle
      }
    }
  });

  return {
    session_id: result.session_id,
    checkout_url: result.checkout_url,
    payment_gateway: result.payment_gateway
  };
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: { plan: true }
  });

  if (!subscription) return null;

  // Enforce a lapsed period lazily on read (nothing else does — there is no scheduled sweep).
  const resolved = await resolveExpiry(subscription);
  return resolved as UserSubscription | null;
};

// Lazy expiry: the row carries current_period_end but nothing flips the status when the period
// lapses. On read, move a lapsed subscription to its terminal status so the UI/entitlements see
// the truth. Active auto-renewing subs are untouched — Stripe renews them via invoice.paid.
const resolveExpiry = async (sub: any): Promise<any> => {
  const now = new Date();
  if (!sub?.current_period_end || new Date(sub.current_period_end) >= now) return sub;

  let newStatus: string | null = null;
  if (sub.cancel_at_period_end && sub.status === SubscriptionStatus.ACTIVE) {
    newStatus = SubscriptionStatus.CANCELED; // scheduled cancellation reached its end date
  } else if (sub.status === SubscriptionStatus.PAST_DUE) {
    newStatus = SubscriptionStatus.EXPIRED;  // dunning grace ran out
  }
  if (!newStatus) return sub;

  return prisma.userSubscription.update({
    where: { subscription_id: sub.subscription_id },
    data: {
      status: newStatus,
      ...(newStatus === SubscriptionStatus.CANCELED && !sub.canceled_at ? { canceled_at: now } : {})
    },
    include: { plan: true }
  });
};

// Batch equivalent of resolveExpiry for a future scheduled job. No scheduler is wired yet —
// this is the pure operation a cron/worker would call.
export const sweepExpiredSubscriptions = async (): Promise<{ canceled: number; expired: number }> => {
  const now = new Date();
  const canceled = await prisma.userSubscription.updateMany({
    where: {
      current_period_end: { lt: now },
      cancel_at_period_end: true,
      status: SubscriptionStatus.ACTIVE
    },
    data: { status: SubscriptionStatus.CANCELED, canceled_at: now }
  });
  const expired = await prisma.userSubscription.updateMany({
    where: { current_period_end: { lt: now }, status: SubscriptionStatus.PAST_DUE },
    data: { status: SubscriptionStatus.EXPIRED }
  });
  return { canceled: canceled.count, expired: expired.count };
};

export const createOrUpdateSubscription = async (
  userId: string,
  planId: string,
  gatewaySubscriptionId: string,
  paymentGateway: string,
  billingCycle: BillingCycle,
  // When the gateway reports the authoritative period (e.g. after a plan change), use it
  // instead of guessing +1 month/year. Existing callers pass nothing and keep the fallback.
  currentPeriodStart?: Date,
  currentPeriodEnd?: Date
): Promise<UserSubscription> => {
  const now = currentPeriodStart ?? new Date();
  let periodEnd: Date;
  if (currentPeriodEnd) {
    periodEnd = currentPeriodEnd;
  } else {
    periodEnd = new Date(now);
    if (billingCycle === BillingCycle.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
  }

  const existingSubscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId }
  });

  if (existingSubscription) {
    const updated = await prisma.userSubscription.update({
      where: { user_id: userId },
      data: {
        plan_id: planId,
        payment_gateway: paymentGateway,
        gateway_subscription_id: gatewaySubscriptionId,
        status: SubscriptionStatus.ACTIVE,
        billing_cycle: billingCycle,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        canceled_at: null
      },
      include: { plan: true }
    });
    return updated as UserSubscription;
  }

  const created = await prisma.userSubscription.create({
    data: {
      user_id: userId,
      plan_id: planId,
      payment_gateway: paymentGateway,
      gateway_subscription_id: gatewaySubscriptionId,
      status: SubscriptionStatus.ACTIVE,
      billing_cycle: billingCycle,
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false
    },
    include: { plan: true }
  });

  return created as UserSubscription;
};

// Extend an existing subscription's period on a renewal payment. Looked up by the gateway
// subscription id (effectively unique per user). Missing row → no-op: on the very first
// charge `invoice.paid` can arrive before `checkout.session.completed` has created the row.
const renewSubscriptionByGatewayId = async (gatewaySubscriptionId: string): Promise<void> => {
  const sub = await prisma.userSubscription.findFirst({
    where: { gateway_subscription_id: gatewaySubscriptionId }
  });
  if (!sub) return;

  const now = new Date();
  const periodEnd = new Date(now);
  if (sub.billing_cycle === BillingCycle.MONTHLY) {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  await prisma.userSubscription.update({
    where: { subscription_id: sub.subscription_id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      current_period_start: now,
      current_period_end: periodEnd
    }
  });
};

/**
 * The idempotent event-router for verified Stripe webhooks. It is the single place that
 * turns a signed gateway event into a subscription state change. Every event is recorded in
 * ProcessedWebhookEvent so a Stripe retry/replay of the same event id is a no-op — this is
 * what guarantees exactly-once activation (no double-grant).
 *
 * The caller must only pass a result produced by a signature-verified `handleWebhook`.
 */
export const processStripeSubscriptionEvent = async (
  result: WebhookResult
): Promise<{ processed: boolean; duplicate: boolean }> => {
  const { event_id, event_type, data } = result;

  // Fast-path dedup: already recorded → do nothing (and, crucially, do NOT re-run the
  // activation below, so a replay never re-writes the subscription row).
  const already = await prisma.processedWebhookEvent.findUnique({ where: { event_id } });
  if (already) {
    return { processed: false, duplicate: true };
  }

  switch (event_type) {
    case 'checkout.session.completed': {
      // Activate only when the trusted metadata we set at checkout is all present.
      if (data.user_id && data.plan_id && data.billing_cycle && data.subscription_id) {
        await createOrUpdateSubscription(
          data.user_id,
          data.plan_id,
          data.subscription_id,
          PaymentGatewayType.STRIPE,
          data.billing_cycle as BillingCycle
        );

        // Persist the Stripe customer handle for later lifecycle ops. Best-effort: a unique
        // clash (same customer already on another row) must not fail the whole webhook.
        if (data.customer_id) {
          await prisma.user
            .update({
              where: { user_id: data.user_id },
              data: { stripe_customer_id: data.customer_id }
            })
            .catch(() => undefined);
        }

        // Flip the pending checkout transaction (keyed by the checkout session id we stored
        // as gateway_payment_id) to succeeded.
        if (data.checkout_session_id) {
          await prisma.paymentTransaction.updateMany({
            where: { gateway_payment_id: data.checkout_session_id },
            data: { status: PaymentStatus.SUCCEEDED, updated_at: new Date() }
          });
        }
      } else {
        // A verified checkout.session.completed that we CANNOT activate (missing the metadata
        // we set at checkout, or no subscription attached yet). We still record it below so
        // Stripe's identical retries don't loop, but that means activation won't self-heal —
        // so make it loud for reconciliation instead of swallowing it silently.
        console.warn(
          `[webhook] checkout.session.completed ${event_id} not activatable — ` +
          `user_id=${data.user_id ?? '∅'} plan_id=${data.plan_id ?? '∅'} ` +
          `billing_cycle=${data.billing_cycle ?? '∅'} subscription_id=${data.subscription_id ?? '∅'}`
        );
      }
      break;
    }

    case 'invoice.paid': {
      if (data.subscription_id) {
        await renewSubscriptionByGatewayId(data.subscription_id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      if (data.subscription_id) {
        await prisma.userSubscription.updateMany({
          where: { gateway_subscription_id: data.subscription_id },
          data: { status: SubscriptionStatus.PAST_DUE }
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      if (data.subscription_id) {
        await prisma.userSubscription.updateMany({
          where: { gateway_subscription_id: data.subscription_id },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceled_at: new Date(),
            cancel_at_period_end: false
          }
        });
      }
      break;
    }

    default:
      // Verified but not a subscription-lifecycle event — recorded below so retries are cheap.
      break;
  }

  // Record the event id. The UNIQUE constraint also closes the check-then-act race: two
  // concurrent copies of the same event both pass the findUnique above, but only one
  // create() wins — the loser is a P2002 and is reported as a duplicate no-op.
  try {
    await prisma.processedWebhookEvent.create({
      data: { event_id, gateway: PaymentGatewayType.STRIPE, event_type }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { processed: false, duplicate: true };
    }
    throw error;
  }

  return { processed: true, duplicate: false };
};

export const cancelUserSubscription = async (
  userId: string, 
  cancelImmediately: boolean = false
): Promise<{ success: boolean; message: string }> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId }
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new Error('Subscription is not active');
  }

  let gatewayPeriodEnd: Date | undefined;
  if (subscription.gateway_subscription_id) {
    const gateway = getPaymentGateway(subscription.payment_gateway as PaymentGatewayType);
    const result = await gateway.cancelSubscription(subscription.gateway_subscription_id, cancelImmediately);
    gatewayPeriodEnd = result.current_period_end;
  }

  if (cancelImmediately) {
    await prisma.userSubscription.update({
      where: { user_id: userId },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceled_at: new Date(),
        cancel_at_period_end: false
      }
    });

    return {
      success: true,
      message: 'Subscription canceled immediately'
    };
  }

  // Scheduled cancellation: keep the subscription ACTIVE (access continues) but flag it to end
  // at the period boundary. Persist the gateway's authoritative period end when we have it so
  // the lazy-expiry check flips it to canceled on the right date.
  await prisma.userSubscription.update({
    where: { user_id: userId },
    data: {
      cancel_at_period_end: true,
      canceled_at: new Date(),
      ...(gatewayPeriodEnd ? { current_period_end: gatewayPeriodEnd } : {})
    }
  });

  return {
    success: true,
    message: 'Subscription will be canceled at period end'
  };
};

// Upgrade/downgrade the caller's active subscription to a different plan (and/or billing
// cycle). The gateway swaps the subscription item to a Price built from our DB amount with
// proration; we then reflect the new plan (and gateway period) in our row.
export const changeUserPlan = async (
  userId: string,
  newPlanId: string,
  newBillingCycle?: BillingCycle
): Promise<UserSubscription> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId }
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }
  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new Error('Only an active subscription can change plan');
  }

  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { plan_id: newPlanId }
  });
  if (!newPlan) {
    throw new Error('Subscription plan not found');
  }

  const billingCycle = (newBillingCycle ?? subscription.billing_cycle) as BillingCycle;
  if (newPlanId === subscription.plan_id && billingCycle === subscription.billing_cycle) {
    throw new Error('Already on this plan');
  }

  const priceUsd = billingCycle === BillingCycle.MONTHLY
    ? Number(newPlan.price_monthly_usd)
    : Number(newPlan.price_annually_usd);
  const unitAmount = formatAmountForGateway(priceUsd, 'USD');
  const interval = billingCycle === BillingCycle.YEARLY ? 'year' : 'month';

  let gatewayPeriodStart: Date | undefined;
  let gatewayPeriodEnd: Date | undefined;

  if (subscription.gateway_subscription_id) {
    const gateway = getPaymentGateway(subscription.payment_gateway as PaymentGatewayType);
    const result = await gateway.changeSubscriptionPlan(subscription.gateway_subscription_id, {
      unitAmount,
      currency: 'USD',
      interval,
      planName: newPlan.name,
      metadata: { user_id: userId, plan_id: newPlanId, billing_cycle: billingCycle }
    });
    gatewayPeriodStart = result.current_period_start;
    gatewayPeriodEnd = result.current_period_end;
  }

  // Reuse createOrUpdateSubscription (same gateway subscription id) so the row stays ACTIVE,
  // clears any pending cancellation, and adopts the gateway's period when reported.
  return createOrUpdateSubscription(
    userId,
    newPlanId,
    subscription.gateway_subscription_id ?? '',
    subscription.payment_gateway,
    billingCycle,
    gatewayPeriodStart,
    gatewayPeriodEnd
  );
};

// Admin-triggered refund of a succeeded Stripe transaction. Resolves the PaymentIntent from
// the stored checkout session (a session id cannot be refunded directly), issues the refund,
// and marks the transaction refunded. Returns refund details for the audit trail.
export const refundTransaction = async (
  transactionId: string,
  amount?: number,
  reason?: string
): Promise<{ refund_id: string; amount: number }> => {
  const txn = await prisma.paymentTransaction.findUnique({
    where: { transaction_id: transactionId }
  });

  if (!txn) {
    throw new Error('Transaction not found');
  }
  if (txn.payment_gateway !== PaymentGatewayType.STRIPE) {
    throw new Error('Only Stripe transactions can be refunded');
  }
  if (txn.status !== PaymentStatus.SUCCEEDED) {
    throw new Error('Only a succeeded transaction can be refunded');
  }
  if (!txn.gateway_payment_id) {
    throw new Error('Transaction has no gateway payment id');
  }

  const gateway = getPaymentGateway(PaymentGatewayType.STRIPE);
  const status = await gateway.getPaymentStatus(txn.gateway_payment_id);
  const paymentIntent = status.metadata?.payment_intent as string | undefined;
  if (!paymentIntent) {
    throw new Error('Could not resolve a PaymentIntent to refund');
  }

  const amountMinor = amount ? formatAmountForGateway(amount, txn.currency) : undefined;
  const refund = await gateway.refundPayment({
    transaction_id: transactionId,
    payment_intent: paymentIntent,
    amount: amountMinor,
    reason
  });
  if (refund.status !== 'succeeded') {
    throw new Error('Refund did not succeed');
  }

  await prisma.paymentTransaction.update({
    where: { transaction_id: transactionId },
    data: { status: PaymentStatus.REFUNDED, updated_at: new Date() }
  });

  return { refund_id: refund.refund_id, amount: refund.amount };
};

export const getAllPlans = async () => {
  return await prisma.subscriptionPlan.findMany({
    where: { is_publicly_available: true },
    orderBy: { price_monthly_usd: 'asc' }
  });
};

export const getPlanById = async (planId: string) => {
  return await prisma.subscriptionPlan.findUnique({
    where: { plan_id: planId }
  });
};

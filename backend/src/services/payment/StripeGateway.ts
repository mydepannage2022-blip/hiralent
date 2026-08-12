import Stripe from 'stripe';
import {
  IPaymentGateway,
  WebhookResult,
  CancelResult,
  ChangePlanRequest,
  ChangePlanResult,
  PaymentStatusResult,
  formatAmountForGateway
} from './BaseGateway';
import {
  CreatePaymentSessionData,
  PaymentSessionResult,
  RefundRequest,
  RefundResult,
  PaymentGatewayType
} from '../../types/payment.types';
import { requireEnv } from '../../config/requireEnv';

/**
 * Stripe gateway. Wave 5 / Session 1 makes `createCheckoutSession` REAL — it opens a
 * genuine Stripe-hosted Checkout Session (subscription mode, inline price_data sourced
 * from our own DB so our DB stays the price source of truth). When STRIPE_SECRET_KEY is
 * absent the gateway is honestly unavailable (throws) — it never fabricates a session.
 *
 * The Stripe client is injectable purely so unit tests can drive the code path without a
 * network call; production/dev always uses the real client built from STRIPE_SECRET_KEY.
 *
 * Webhook verification + activation are real (S2). Subscription lifecycle — cancel,
 * plan change (upgrade/downgrade with proration), payment-status lookup and refund — is real
 * (S3): each calls the Stripe SDK and, when the key is absent, throws instead of fabricating a
 * result. Plan changes create a Price on the fly (S1 checkout used inline ad-hoc price_data,
 * so no Stripe Price is stored) from our DB-derived amount, keeping our DB the price truth.
 */
export const createStripeGateway = (injectedClient?: Stripe): IPaymentGateway => {
  const gatewayName = PaymentGatewayType.STRIPE;

  const isConfigured = (): boolean => {
    // Checkout capability needs only the secret key. The webhook secret is validated on
    // the webhook path (Wave 5 S2), not here.
    return !!injectedClient || !!process.env.STRIPE_SECRET_KEY;
  };

  // Lazily build + cache the real client so importing this module never throws when the
  // key is unset (honest-disable), and so requireEnv reads after dotenv has populated env.
  let client: Stripe | undefined = injectedClient;
  const getClient = (): Stripe => {
    if (!client) {
      client = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    }
    return client;
  };

  const createCheckoutSession = async (data: CreatePaymentSessionData): Promise<PaymentSessionResult> => {
    if (!isConfigured()) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing) — checkout unavailable.');
    }

    try {
      const stripe = getClient();
      const unitAmount = formatAmountForGateway(data.amount, data.currency); // integer minor units
      const interval = data.billing_cycle === 'yearly' ? 'year' : 'month';

      // `{CHECKOUT_SESSION_ID}` is a Stripe placeholder it substitutes on redirect; the
      // success page (S2) verifies the resulting session with the backend.
      const successUrl = data.success_url.includes('?')
        ? `${data.success_url}&session_id={CHECKOUT_SESSION_ID}`
        : `${data.success_url}?session_id={CHECKOUT_SESSION_ID}`;

      const metadata = {
        user_id: data.user_id,
        plan_id: data.plan_id,
        billing_cycle: data.billing_cycle,
      };

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        client_reference_id: data.user_id,
        customer_email: data.customer_email || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: data.currency.toLowerCase(),
              unit_amount: unitAmount,
              recurring: { interval },
              product_data: {
                name: String(data.metadata?.plan_name ?? 'Subscription'),
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: data.cancel_url,
        metadata,
        subscription_data: { metadata },
      });

      if (!session.url) {
        throw new Error('Stripe returned a session without a checkout URL.');
      }

      return {
        session_id: session.id,
        checkout_url: session.url,
        payment_gateway: gatewayName
      };
    } catch (error: any) {
      throw new Error(`Stripe checkout session failed: ${error.message}`);
    }
  };

  // Verify the raw body against the Stripe-Signature header using STRIPE_WEBHOOK_SECRET.
  // constructEvent recomputes the HMAC over the exact bytes Stripe signed and throws on any
  // mismatch (forged/tampered/replayed-with-stale-timestamp), so a returned event is trusted.
  const constructEvent = (payload: Buffer | string, signature: string): Stripe.Event => {
    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    return getClient().webhooks.constructEvent(payload, signature, webhookSecret);
  };

  const handleWebhook = async (payload: any, signature?: string): Promise<WebhookResult> => {
    if (!signature) {
      throw new Error('Webhook signature is required for Stripe');
    }
    if (!isConfigured()) {
      // No fabricated success: if Stripe isn't configured there is no trustworthy way to
      // verify an inbound webhook, so we refuse it (the controller turns this into a 400).
      throw new Error('Stripe is not configured — webhook cannot be verified.');
    }

    let event: Stripe.Event;
    try {
      event = constructEvent(payload, signature);
    } catch (error: any) {
      // Signature verification failure — bubble up so the controller answers 400.
      throw new Error(`Stripe webhook signature verification failed: ${error.message}`);
    }

    // Normalize the handful of events we act on into a gateway-agnostic shape so the
    // controller/service never has to know Stripe's object layout. Unknown types return an
    // empty data payload and are recorded-but-ignored downstream.
    const data: WebhookResult['data'] = {};

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        data.checkout_session_id = session.id;
        data.subscription_id = typeof session.subscription === 'string' ? session.subscription : undefined;
        data.customer_id = typeof session.customer === 'string' ? session.customer : undefined;
        data.status = session.payment_status ?? undefined;
        data.user_id = session.metadata?.user_id;
        data.plan_id = session.metadata?.plan_id;
        data.billing_cycle = session.metadata?.billing_cycle;
        data.metadata = session.metadata ?? undefined;
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // In the current Stripe API the subscription reference lives under
        // parent.subscription_details (the top-level `invoice.subscription` was removed).
        const sub = invoice.parent?.subscription_details?.subscription;
        data.subscription_id = typeof sub === 'string' ? sub : sub?.id;
        data.customer_id = typeof invoice.customer === 'string' ? invoice.customer : undefined;
        data.status = invoice.status ?? undefined;
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        data.subscription_id = subscription.id;
        data.customer_id = typeof subscription.customer === 'string' ? subscription.customer : undefined;
        data.status = subscription.status ?? undefined;
        data.metadata = subscription.metadata ?? undefined;
        break;
      }
      default:
        // Unhandled event type — verified but not acted on.
        break;
    }

    return {
      success: true,
      event_id: event.id,
      event_type: event.type,
      data
    };
  };

  const verifyWebhookSignature = (payload: any, signature: string): boolean => {
    try {
      constructEvent(payload, signature);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Stripe timestamps are unix seconds; normalize to Date. In Stripe API v22 the period
  // fields moved from the subscription top-level onto the subscription item, so read both.
  const toDate = (unixSeconds?: number | null): Date | undefined =>
    typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000) : undefined;

  const periodEndOf = (sub: any): Date | undefined =>
    toDate(sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end);
  const periodStartOf = (sub: any): Date | undefined =>
    toDate(sub?.current_period_start ?? sub?.items?.data?.[0]?.current_period_start);

  const cancelSubscription = async (subscriptionId: string, cancelImmediately: boolean = false): Promise<CancelResult> => {
    if (!isConfigured()) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing) — cancellation unavailable.');
    }

    try {
      const stripe = getClient();

      if (cancelImmediately) {
        const sub = await stripe.subscriptions.cancel(subscriptionId);
        return {
          success: true,
          message: 'Subscription canceled immediately',
          canceled_at: toDate((sub as any).canceled_at) ?? new Date(),
          cancel_at_period_end: false,
          current_period_end: periodEndOf(sub)
        };
      }

      const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      return {
        success: true,
        message: 'Subscription will be canceled at period end',
        canceled_at: new Date(),
        cancel_at_period_end: true,
        current_period_end: periodEndOf(sub)
      };
    } catch (error: any) {
      throw new Error(`Stripe subscription cancellation failed: ${error.message}`);
    }
  };

  // Upgrade/downgrade: swap the subscription's single billable item to a new Price built from
  // our DB amount (see class note — no Stripe Price is stored), prorating the difference.
  const changeSubscriptionPlan = async (
    subscriptionId: string,
    request: ChangePlanRequest
  ): Promise<ChangePlanResult> => {
    if (!isConfigured()) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing) — plan change unavailable.');
    }

    try {
      const stripe = getClient();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const itemId = (sub as any).items?.data?.[0]?.id;
      if (!itemId) {
        throw new Error('Subscription has no billable item to update.');
      }

      const price = await stripe.prices.create({
        currency: request.currency.toLowerCase(),
        unit_amount: request.unitAmount,
        recurring: { interval: request.interval },
        product_data: { name: request.planName }
      });

      const updated = await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: price.id }],
        proration_behavior: 'create_prorations',
        ...(request.metadata ? { metadata: request.metadata } : {})
      });

      return {
        subscription_id: updated.id,
        status: updated.status,
        current_period_start: periodStartOf(updated),
        current_period_end: periodEndOf(updated)
      };
    } catch (error: any) {
      throw new Error(`Stripe plan change failed: ${error.message}`);
    }
  };

  const getPaymentStatus = async (paymentId: string): Promise<PaymentStatusResult> => {
    if (!isConfigured()) {
      throw new Error('Stripe is not configured — payment status unavailable.');
    }

    try {
      const stripe = getClient();

      // A stored gateway_payment_id is a checkout session (`cs_...`); resolve it to the
      // PaymentIntent the refund path needs. A `pi_...` id is retrieved directly.
      if (paymentId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(paymentId);
        const pi = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
        return {
          status: session.payment_status ?? 'unknown',
          amount: typeof session.amount_total === 'number' ? session.amount_total : undefined,
          currency: session.currency ?? undefined,
          metadata: { payment_intent: pi }
        };
      }

      const intent = await stripe.paymentIntents.retrieve(paymentId);
      return {
        status: intent.status,
        amount: intent.amount,
        currency: intent.currency,
        metadata: { payment_intent: intent.id }
      };
    } catch (error: any) {
      throw new Error(`Stripe payment status fetch failed: ${error.message}`);
    }
  };

  const refundPayment = async (request: RefundRequest): Promise<RefundResult> => {
    if (!isConfigured()) {
      throw new Error('Stripe is not configured — refund unavailable.');
    }
    if (!request.payment_intent) {
      // A checkout session id cannot be refunded directly — the service must resolve the
      // PaymentIntent first (via getPaymentStatus) and pass it here.
      throw new Error('Refund requires a resolved payment_intent.');
    }

    try {
      const stripe = getClient();
      const refund = await stripe.refunds.create({
        payment_intent: request.payment_intent,
        // Partial refund when an amount (minor units) is given; otherwise a full refund.
        ...(request.amount ? { amount: request.amount } : {}),
        // Stripe's `reason` is a fixed enum, so keep our free-text reason in metadata.
        ...(request.reason ? { metadata: { reason: request.reason } } : {})
      });

      const failed = refund.status === 'failed' || refund.status === 'canceled';
      return {
        refund_id: refund.id,
        status: failed ? 'failed' : 'succeeded',
        amount: typeof refund.amount === 'number' ? refund.amount : (request.amount || 0),
        message: `Refund ${refund.status}`
      };
    } catch (error: any) {
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  };

  return {
    gatewayName,
    createCheckoutSession,
    handleWebhook,
    verifyWebhookSignature,
    cancelSubscription,
    changeSubscriptionPlan,
    getPaymentStatus,
    refundPayment,
    isConfigured
  };
};

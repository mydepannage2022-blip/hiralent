import Stripe from 'stripe';
import {
  IPaymentGateway,
  WebhookResult,
  CancelResult,
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
 * NOTE: webhook verification + subscription activation (handleWebhook /
 * verifyWebhookSignature) and cancel/refund/status are still the pre-Wave-5 stubs and are
 * made real in S2 (webhooks) / S3 (lifecycle). They are not wired live as "real" yet.
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

  const handleWebhook = async (payload: any, signature?: string): Promise<WebhookResult> => {
    if (!signature) {
      throw new Error('Webhook signature is required for Stripe');
    }

    if (!isConfigured()) {
      return {
        success: true,
        event_type: 'mock.payment.succeeded',
        data: {
          payment_id: payload.payment_id || `mock_payment_${Date.now()}`,
          subscription_id: payload.subscription_id,
          status: 'succeeded',
          amount: payload.amount || 0,
          currency: payload.currency || 'USD'
        }
      };
    }

    try {
      const event = payload;
      
      return {
        success: true,
        event_type: event.type || 'unknown',
        data: {
          payment_id: event.data?.object?.id,
          subscription_id: event.data?.object?.subscription,
          customer_id: event.data?.object?.customer,
          amount: event.data?.object?.amount,
          currency: event.data?.object?.currency,
          status: event.data?.object?.status,
          metadata: event.data?.object?.metadata
        }
      };
    } catch (error: any) {
      throw new Error(`Stripe webhook processing failed: ${error.message}`);
    }
  };

  const verifyWebhookSignature = (payload: any, signature: string): boolean => {
    if (!isConfigured()) {
      return true;
    }

    try {
      return signature.startsWith('whsec_');
    } catch (error) {
      return false;
    }
  };

  const cancelSubscription = async (subscriptionId: string, cancelImmediately: boolean = false): Promise<CancelResult> => {
    if (!isConfigured()) {
      return {
        success: true,
        message: 'Mock: Subscription canceled successfully',
        canceled_at: new Date()
      };
    }

    try {
      return {
        success: true,
        message: 'Subscription canceled successfully',
        canceled_at: new Date()
      };
    } catch (error: any) {
      throw new Error(`Stripe subscription cancellation failed: ${error.message}`);
    }
  };

  const getPaymentStatus = async (paymentId: string): Promise<PaymentStatusResult> => {
    if (!isConfigured()) {
      return {
        status: 'succeeded',
        amount: 5000,
        currency: 'USD',
        metadata: { mock: true }
      };
    }

    try {
      return {
        status: 'succeeded',
        amount: 0,
        currency: 'USD'
      };
    } catch (error: any) {
      throw new Error(`Stripe payment status fetch failed: ${error.message}`);
    }
  };

  const refundPayment = async (request: RefundRequest): Promise<RefundResult> => {
    if (!isConfigured()) {
      return {
        refund_id: `mock_refund_${Date.now()}`,
        status: 'succeeded',
        amount: request.amount || 0,
        message: 'Mock refund processed successfully'
      };
    }

    try {
      return {
        refund_id: `refund_${Date.now()}`,
        status: 'succeeded',
        amount: request.amount || 0,
        message: 'Refund processed successfully'
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
    getPaymentStatus,
    refundPayment,
    isConfigured
  };
};

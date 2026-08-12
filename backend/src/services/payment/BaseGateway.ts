import { 
  CreatePaymentSessionData, 
  PaymentSessionResult, 
  RefundRequest, 
  RefundResult,
  PaymentGatewayType 
} from '../../types/payment.types';

export interface WebhookResult {
  success: boolean;
  // Gateway's own event id (Stripe `evt_...`). Idempotency key — the event-router records
  // it so a retried/replayed webhook is a no-op instead of a double-grant.
  event_id: string;
  event_type: string;
  data: {
    // Checkout session id (`cs_...`) — matches PaymentTransaction.gateway_payment_id.
    checkout_session_id?: string;
    payment_id?: string;
    subscription_id?: string;
    customer_id?: string;
    // Pulled from the session/subscription metadata we set at checkout creation.
    user_id?: string;
    plan_id?: string;
    billing_cycle?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: any;
  };
}

export interface CancelResult {
  success: boolean;
  message: string;
  canceled_at?: Date;
  // Whether the cancellation is scheduled for period end (true) vs already terminal (false).
  cancel_at_period_end?: boolean;
  // The gateway's authoritative period end — used so the DB reflects when access actually
  // lapses instead of a locally-guessed date.
  current_period_end?: Date;
}

export interface PaymentStatusResult {
  status: string;
  amount?: number;
  currency?: string;
  // For Stripe this carries { payment_intent } resolved from a checkout session, which the
  // refund path needs (a checkout session id cannot be refunded directly).
  metadata?: any;
}

// A plan upgrade/downgrade on an existing subscription. Amount is our DB-derived price (the
// DB stays the price source of truth) in integer minor units; the gateway creates a matching
// Price on the fly and swaps the subscription item to it with proration.
export interface ChangePlanRequest {
  unitAmount: number; // integer minor units (e.g. cents)
  currency: string;
  interval: 'month' | 'year';
  planName: string;
  metadata?: Record<string, string>;
}

export interface ChangePlanResult {
  subscription_id: string;
  status?: string;
  current_period_start?: Date;
  current_period_end?: Date;
}

export interface IPaymentGateway {
  gatewayName: PaymentGatewayType;
  createCheckoutSession: (data: CreatePaymentSessionData) => Promise<PaymentSessionResult>;
  handleWebhook: (payload: any, signature?: string) => Promise<WebhookResult>;
  verifyWebhookSignature: (payload: any, signature: string) => boolean;
  cancelSubscription: (subscriptionId: string, cancelImmediately?: boolean) => Promise<CancelResult>;
  changeSubscriptionPlan: (subscriptionId: string, request: ChangePlanRequest) => Promise<ChangePlanResult>;
  getPaymentStatus: (paymentId: string) => Promise<PaymentStatusResult>;
  refundPayment: (request: RefundRequest) => Promise<RefundResult>;
  isConfigured: () => boolean;
}

export const validateGatewayConfig = (requiredEnvVars: string[]): boolean => {
  return requiredEnvVars.every(envVar => !!process.env[envVar]);
};

export const formatAmountForGateway = (amount: number, currency: string): number => {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
  return zeroDecimalCurrencies.includes(currency.toUpperCase()) 
    ? Math.round(amount) 
    : Math.round(amount * 100);
};

export const formatAmountFromGateway = (amount: number, currency: string): number => {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
  return zeroDecimalCurrencies.includes(currency.toUpperCase()) 
    ? amount 
    : amount / 100;
};

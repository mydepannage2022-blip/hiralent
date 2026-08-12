// Payment gateway related types

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded'
}

export enum PaymentGatewayType {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  RAZORPAY = 'razorpay',
  PAYTABS = 'paytabs',
  MANUAL = 'manual'
}

export interface PaymentTransaction {
  transaction_id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_gateway: PaymentGatewayType;
  gateway_payment_id?: string;
  gateway_customer_id?: string;
  status: PaymentStatus;
  payment_method?: string;
  failure_reason?: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentSessionData {
  user_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  customer_email?: string; // pre-fills the gateway checkout for the buyer
  metadata?: Record<string, any>;
}

export interface PaymentSessionResult {
  session_id: string;
  checkout_url: string;
  payment_gateway: string;
}

export interface WebhookPayload {
  gateway: PaymentGatewayType;
  event_type: string;
  payment_id?: string;
  subscription_id?: string;
  customer_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  metadata?: any;
  raw_data: any;
}

export interface RefundRequest {
  transaction_id: string;
  amount?: number; // Partial refund (integer minor units) if specified
  reason?: string;
  // The Stripe PaymentIntent to refund, resolved by the service from the stored checkout
  // session id (a checkout session cannot be refunded directly). Required for a real refund.
  payment_intent?: string;
}

export interface RefundResult {
  refund_id: string;
  status: 'succeeded' | 'failed';
  amount: number;
  message?: string;
}

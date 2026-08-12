import {
  IPaymentGateway,
  WebhookResult,
  CancelResult,
  ChangePlanRequest,
  ChangePlanResult,
  PaymentStatusResult
} from './BaseGateway';
import {
  CreatePaymentSessionData,
  PaymentSessionResult,
  RefundRequest,
  RefundResult,
  PaymentGatewayType
} from '../../types/payment.types';

/**
 * PayPal is out of scope for the current launch (Stripe-only). Rather than fabricate
 * fake sessions/webhooks (the pre-Wave-5 behaviour), the gateway is honestly disabled:
 * every operation throws a clear "not available" error and `isConfigured()` is false, so
 * the UI never offers it and no code path can produce a fake success. Implement for real
 * in a later wave if PayPal is brought into scope.
 */
const UNAVAILABLE = 'PayPal payments are not available.';

export const createPayPalGateway = (): IPaymentGateway => {
  const gatewayName = PaymentGatewayType.PAYPAL;

  const isConfigured = (): boolean => false;

  const createCheckoutSession = async (_data: CreatePaymentSessionData): Promise<PaymentSessionResult> => {
    throw new Error(UNAVAILABLE);
  };

  const handleWebhook = async (_payload: any, _signature?: string): Promise<WebhookResult> => {
    throw new Error(UNAVAILABLE);
  };

  const verifyWebhookSignature = (_payload: any, _signature: string): boolean => false;

  const cancelSubscription = async (_subscriptionId: string, _cancelImmediately?: boolean): Promise<CancelResult> => {
    throw new Error(UNAVAILABLE);
  };

  const changeSubscriptionPlan = async (_subscriptionId: string, _request: ChangePlanRequest): Promise<ChangePlanResult> => {
    throw new Error(UNAVAILABLE);
  };

  const getPaymentStatus = async (_paymentId: string): Promise<PaymentStatusResult> => {
    throw new Error(UNAVAILABLE);
  };

  const refundPayment = async (_request: RefundRequest): Promise<RefundResult> => {
    throw new Error(UNAVAILABLE);
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

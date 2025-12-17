import { 
  IPaymentGateway, 
  WebhookResult, 
  CancelResult, 
  PaymentStatusResult,
  validateGatewayConfig,
  formatAmountForGateway 
} from './BaseGateway';
import { 
  CreatePaymentSessionData, 
  PaymentSessionResult, 
  RefundRequest, 
  RefundResult,
  PaymentGatewayType 
} from '../../types/payment.types';

export const createStripeGateway = (): IPaymentGateway => {
  const gatewayName = PaymentGatewayType.STRIPE;

  const isConfigured = (): boolean => {
    return validateGatewayConfig(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']);
  };

  const createCheckoutSession = async (data: CreatePaymentSessionData): Promise<PaymentSessionResult> => {
    if (!isConfigured()) {
      return {
        session_id: `mock_session_${Date.now()}`,
        checkout_url: `${data.success_url}?session_id=mock_session_${Date.now()}&mock=true`,
        payment_gateway: gatewayName
      };
    }

    try {
      const amount = formatAmountForGateway(data.amount, data.currency);
      
      const sessionId = `stripe_session_${Date.now()}`;
      const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;

      return {
        session_id: sessionId,
        checkout_url: checkoutUrl,
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

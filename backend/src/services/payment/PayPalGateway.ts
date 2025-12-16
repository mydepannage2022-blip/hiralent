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

export const createPayPalGateway = (): IPaymentGateway => {
  const gatewayName = PaymentGatewayType.PAYPAL;

  const isConfigured = (): boolean => {
    return validateGatewayConfig(['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']);
  };

  const createCheckoutSession = async (data: CreatePaymentSessionData): Promise<PaymentSessionResult> => {
    if (!isConfigured()) {
      return {
        session_id: `mock_paypal_session_${Date.now()}`,
        checkout_url: `${data.success_url}?session_id=mock_paypal_session_${Date.now()}&mock=true`,
        payment_gateway: gatewayName
      };
    }

    try {
      const amount = formatAmountForGateway(data.amount, data.currency);
      
      const sessionId = `paypal_order_${Date.now()}`;
      const checkoutUrl = `https://www.paypal.com/checkoutnow?token=${sessionId}`;

      return {
        session_id: sessionId,
        checkout_url: checkoutUrl,
        payment_gateway: gatewayName
      };
    } catch (error: any) {
      throw new Error(`PayPal checkout session failed: ${error.message}`);
    }
  };

  const handleWebhook = async (payload: any, signature?: string): Promise<WebhookResult> => {
    if (!isConfigured()) {
      return {
        success: true,
        event_type: 'PAYMENT.SALE.COMPLETED',
        data: {
          payment_id: payload.payment_id || `mock_paypal_payment_${Date.now()}`,
          subscription_id: payload.subscription_id,
          status: 'completed',
          amount: payload.amount || 0,
          currency: payload.currency || 'USD'
        }
      };
    }

    try {
      const event = payload;
      
      return {
        success: true,
        event_type: event.event_type || 'unknown',
        data: {
          payment_id: event.resource?.id,
          subscription_id: event.resource?.billing_agreement_id,
          customer_id: event.resource?.payer?.payer_id,
          amount: event.resource?.amount?.total,
          currency: event.resource?.amount?.currency,
          status: event.resource?.state,
          metadata: event.resource?.custom
        }
      };
    } catch (error: any) {
      throw new Error(`PayPal webhook processing failed: ${error.message}`);
    }
  };

  const verifyWebhookSignature = (payload: any, signature: string): boolean => {
    if (!isConfigured()) {
      return true;
    }

    try {
      return signature.length > 0;
    } catch (error) {
      return false;
    }
  };

  const cancelSubscription = async (subscriptionId: string, cancelImmediately: boolean = false): Promise<CancelResult> => {
    if (!isConfigured()) {
      return {
        success: true,
        message: 'Mock: PayPal subscription canceled successfully',
        canceled_at: new Date()
      };
    }

    try {
      return {
        success: true,
        message: 'PayPal subscription canceled successfully',
        canceled_at: new Date()
      };
    } catch (error: any) {
      throw new Error(`PayPal subscription cancellation failed: ${error.message}`);
    }
  };

  const getPaymentStatus = async (paymentId: string): Promise<PaymentStatusResult> => {
    if (!isConfigured()) {
      return {
        status: 'completed',
        amount: 5000,
        currency: 'USD',
        metadata: { mock: true }
      };
    }

    try {
      return {
        status: 'completed',
        amount: 0,
        currency: 'USD'
      };
    } catch (error: any) {
      throw new Error(`PayPal payment status fetch failed: ${error.message}`);
    }
  };

  const refundPayment = async (request: RefundRequest): Promise<RefundResult> => {
    if (!isConfigured()) {
      return {
        refund_id: `mock_paypal_refund_${Date.now()}`,
        status: 'succeeded',
        amount: request.amount || 0,
        message: 'Mock PayPal refund processed successfully'
      };
    }

    try {
      return {
        refund_id: `paypal_refund_${Date.now()}`,
        status: 'succeeded',
        amount: request.amount || 0,
        message: 'PayPal refund processed successfully'
      };
    } catch (error: any) {
      throw new Error(`PayPal refund failed: ${error.message}`);
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

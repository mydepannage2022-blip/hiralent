import { IPaymentGateway } from './BaseGateway';
import { createStripeGateway } from './StripeGateway';
import { createPayPalGateway } from './PayPalGateway';
import { PaymentGatewayType } from '../../types/payment.types';

const gatewayCache: Map<PaymentGatewayType, IPaymentGateway> = new Map();

export const getPaymentGateway = (gatewayType: PaymentGatewayType): IPaymentGateway => {
  if (gatewayCache.has(gatewayType)) {
    return gatewayCache.get(gatewayType)!;
  }

  let gateway: IPaymentGateway;

  switch (gatewayType) {
    case PaymentGatewayType.STRIPE:
      gateway = createStripeGateway();
      break;

    case PaymentGatewayType.PAYPAL:
      gateway = createPayPalGateway();
      break;

    case PaymentGatewayType.MANUAL:
      gateway = createManualGateway();
      break;

    default:
      throw new Error(`Unsupported payment gateway: ${gatewayType}`);
  }

  gatewayCache.set(gatewayType, gateway);
  return gateway;
};

const createManualGateway = (): IPaymentGateway => {
  return {
    gatewayName: PaymentGatewayType.MANUAL,
    
    createCheckoutSession: async (data) => ({
      session_id: `manual_${Date.now()}`,
      checkout_url: `${data.success_url}?manual=true`,
      payment_gateway: PaymentGatewayType.MANUAL
    }),

    handleWebhook: async (payload) => ({
      success: true,
      event_type: 'manual.payment.completed',
      data: {
        payment_id: payload.payment_id,
        status: 'succeeded'
      }
    }),

    verifyWebhookSignature: () => true,

    cancelSubscription: async () => ({
      success: true,
      message: 'Manual subscription canceled',
      canceled_at: new Date()
    }),

    getPaymentStatus: async () => ({
      status: 'succeeded',
      amount: 0,
      currency: 'USD'
    }),

    refundPayment: async (request) => ({
      refund_id: `manual_refund_${Date.now()}`,
      status: 'succeeded',
      amount: request.amount || 0
    }),

    isConfigured: () => true
  };
};

export const getSupportedGateways = (): PaymentGatewayType[] => {
  return [
    PaymentGatewayType.STRIPE,
    PaymentGatewayType.PAYPAL,
    PaymentGatewayType.MANUAL
  ];
};

export const isGatewayConfigured = (gatewayType: PaymentGatewayType): boolean => {
  try {
    const gateway = getPaymentGateway(gatewayType);
    return gateway.isConfigured();
  } catch {
    return false;
  }
};

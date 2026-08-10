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

// The "manual" gateway used to fabricate fake sessions/webhooks. It is not reachable
// from any real flow and has no genuine implementation, so it is honestly disabled:
// every operation throws and isConfigured() is false. If admin-comped manual
// subscriptions are ever needed, implement this for real then.
const MANUAL_UNAVAILABLE = 'Manual payment gateway is not available.';

const createManualGateway = (): IPaymentGateway => {
  return {
    gatewayName: PaymentGatewayType.MANUAL,

    createCheckoutSession: async () => {
      throw new Error(MANUAL_UNAVAILABLE);
    },

    handleWebhook: async () => {
      throw new Error(MANUAL_UNAVAILABLE);
    },

    verifyWebhookSignature: () => false,

    cancelSubscription: async () => {
      throw new Error(MANUAL_UNAVAILABLE);
    },

    getPaymentStatus: async () => {
      throw new Error(MANUAL_UNAVAILABLE);
    },

    refundPayment: async () => {
      throw new Error(MANUAL_UNAVAILABLE);
    },

    isConfigured: () => false
  };
};

// Only gateways that are actually configured are "supported" — with just Stripe keys
// set this returns ['stripe'], so the UI never offers an unavailable gateway.
export const getSupportedGateways = (): PaymentGatewayType[] => {
  return [
    PaymentGatewayType.STRIPE,
    PaymentGatewayType.PAYPAL,
    PaymentGatewayType.MANUAL
  ].filter(isGatewayConfigured);
};

export const isGatewayConfigured = (gatewayType: PaymentGatewayType): boolean => {
  try {
    const gateway = getPaymentGateway(gatewayType);
    return gateway.isConfigured();
  } catch {
    return false;
  }
};

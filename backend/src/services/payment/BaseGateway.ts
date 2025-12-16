import { 
  CreatePaymentSessionData, 
  PaymentSessionResult, 
  RefundRequest, 
  RefundResult,
  PaymentGatewayType 
} from '../../types/payment.types';

export interface WebhookResult {
  success: boolean;
  event_type: string;
  data: {
    payment_id?: string;
    subscription_id?: string;
    customer_id?: string;
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
}

export interface PaymentStatusResult {
  status: string;
  amount?: number;
  currency?: string;
  metadata?: any;
}

export interface IPaymentGateway {
  gatewayName: PaymentGatewayType;
  createCheckoutSession: (data: CreatePaymentSessionData) => Promise<PaymentSessionResult>;
  handleWebhook: (payload: any, signature?: string) => Promise<WebhookResult>;
  verifyWebhookSignature: (payload: any, signature: string) => boolean;
  cancelSubscription: (subscriptionId: string, cancelImmediately?: boolean) => Promise<CancelResult>;
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

import { PaymentStatus } from '../types/payment.types';
import { SubscriptionStatus } from '../types/subscription.types';

export const mapGatewayStatusToPaymentStatus = (
  gateway: string,
  gatewayStatus: string
): PaymentStatus => {
  const statusMap: Record<string, Record<string, PaymentStatus>> = {
    stripe: {
      'succeeded': PaymentStatus.SUCCEEDED,
      'processing': PaymentStatus.PROCESSING,
      'requires_payment_method': PaymentStatus.FAILED,
      'requires_confirmation': PaymentStatus.PENDING,
      'requires_action': PaymentStatus.PENDING,
      'canceled': PaymentStatus.CANCELED,
      'refunded': PaymentStatus.REFUNDED
    },
    paypal: {
      'COMPLETED': PaymentStatus.SUCCEEDED,
      'APPROVED': PaymentStatus.SUCCEEDED,
      'PENDING': PaymentStatus.PENDING,
      'FAILED': PaymentStatus.FAILED,
      'CANCELLED': PaymentStatus.CANCELED,
      'REFUNDED': PaymentStatus.REFUNDED
    }
  };

  return statusMap[gateway]?.[gatewayStatus] || PaymentStatus.PENDING;
};

export const mapGatewayStatusToSubscriptionStatus = (
  gateway: string,
  gatewayStatus: string
): SubscriptionStatus => {
  const statusMap: Record<string, Record<string, SubscriptionStatus>> = {
    stripe: {
      'active': SubscriptionStatus.ACTIVE,
      'canceled': SubscriptionStatus.CANCELED,
      'incomplete': SubscriptionStatus.PAST_DUE,
      'incomplete_expired': SubscriptionStatus.EXPIRED,
      'past_due': SubscriptionStatus.PAST_DUE,
      'trialing': SubscriptionStatus.TRIALING,
      'unpaid': SubscriptionStatus.PAST_DUE
    },
    paypal: {
      'ACTIVE': SubscriptionStatus.ACTIVE,
      'CANCELLED': SubscriptionStatus.CANCELED,
      'SUSPENDED': SubscriptionStatus.PAST_DUE,
      'EXPIRED': SubscriptionStatus.EXPIRED
    }
  };

  return statusMap[gateway]?.[gatewayStatus] || SubscriptionStatus.ACTIVE;
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const calculateProration = (
  currentPlanPrice: number,
  newPlanPrice: number,
  daysRemaining: number,
  totalDays: number
): number => {
  const unusedAmount = (currentPlanPrice / totalDays) * daysRemaining;
  const newPlanDailyRate = newPlanPrice / totalDays;
  const amountForNewPlan = newPlanDailyRate * daysRemaining;
  
  return Math.max(0, amountForNewPlan - unusedAmount);
};

export const calculateNextBillingDate = (
  currentDate: Date,
  billingCycle: 'monthly' | 'yearly'
): Date => {
  const nextDate = new Date(currentDate);
  
  if (billingCycle === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  
  return nextDate;
};

export const isSubscriptionExpired = (endDate: Date): boolean => {
  return new Date() > endDate;
};

export const getDaysUntilExpiry = (endDate: Date): number => {
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const generateInvoiceNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `INV-${timestamp}-${random}`;
};

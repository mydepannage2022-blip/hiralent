import prisma from '../../lib/prisma';
import { getPaymentGateway } from '../payment/PaymentGatewayFactory';
import { 
  CreateCheckoutSessionRequest, 
  CheckoutSessionResponse, 
  UserSubscription,
  SubscriptionStatus,
  BillingCycle 
} from '../../types/subscription.types';
import { 
  PaymentGatewayType, 
  PaymentStatus,
  CreatePaymentSessionData 
} from '../../types/payment.types';

export const createCheckoutSession = async (
  userId: string, 
  request: CreateCheckoutSessionRequest
): Promise<CheckoutSessionResponse> => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { plan_id: request.plan_id }
  });

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  const amount = request.billing_cycle === BillingCycle.MONTHLY 
    ? Number(plan.price_monthly_usd) 
    : Number(plan.price_annually_usd);

  const gateway = getPaymentGateway(request.payment_gateway as PaymentGatewayType);

  const sessionData: CreatePaymentSessionData = {
    user_id: userId,
    plan_id: request.plan_id,
    billing_cycle: request.billing_cycle,
    amount,
    currency: 'USD',
    success_url: request.success_url || `${process.env.FRONTEND_URL}/payment/success`,
    cancel_url: request.cancel_url || `${process.env.FRONTEND_URL}/payment/cancel`,
    metadata: {
      plan_name: plan.name,
      billing_cycle: request.billing_cycle
    }
  };

  const result = await gateway.createCheckoutSession(sessionData);

  await prisma.paymentTransaction.create({
    data: {
      user_id: userId,
      amount,
      currency: 'USD',
      payment_gateway: request.payment_gateway,
      gateway_payment_id: result.session_id,
      status: PaymentStatus.PENDING,
      metadata: {
        plan_id: request.plan_id,
        billing_cycle: request.billing_cycle
      }
    }
  });

  return {
    session_id: result.session_id,
    checkout_url: result.checkout_url,
    payment_gateway: result.payment_gateway
  };
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: { plan: true }
  });

  return subscription as UserSubscription | null;
};

export const createOrUpdateSubscription = async (
  userId: string,
  planId: string,
  gatewaySubscriptionId: string,
  paymentGateway: string,
  billingCycle: BillingCycle
): Promise<UserSubscription> => {
  const now = new Date();
  const periodEnd = new Date(now);
  
  if (billingCycle === BillingCycle.MONTHLY) {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const existingSubscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId }
  });

  if (existingSubscription) {
    const updated = await prisma.userSubscription.update({
      where: { user_id: userId },
      data: {
        plan_id: planId,
        payment_gateway: paymentGateway,
        gateway_subscription_id: gatewaySubscriptionId,
        status: SubscriptionStatus.ACTIVE,
        billing_cycle: billingCycle,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        canceled_at: null
      },
      include: { plan: true }
    });
    return updated as UserSubscription;
  }

  const created = await prisma.userSubscription.create({
    data: {
      user_id: userId,
      plan_id: planId,
      payment_gateway: paymentGateway,
      gateway_subscription_id: gatewaySubscriptionId,
      status: SubscriptionStatus.ACTIVE,
      billing_cycle: billingCycle,
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false
    },
    include: { plan: true }
  });

  return created as UserSubscription;
};

export const cancelUserSubscription = async (
  userId: string, 
  cancelImmediately: boolean = false
): Promise<{ success: boolean; message: string }> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId }
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new Error('Subscription is not active');
  }

  if (subscription.gateway_subscription_id) {
    const gateway = getPaymentGateway(subscription.payment_gateway as PaymentGatewayType);
    await gateway.cancelSubscription(subscription.gateway_subscription_id, cancelImmediately);
  }

  if (cancelImmediately) {
    await prisma.userSubscription.update({
      where: { user_id: userId },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceled_at: new Date(),
        cancel_at_period_end: false
      }
    });

    return {
      success: true,
      message: 'Subscription canceled immediately'
    };
  }

  await prisma.userSubscription.update({
    where: { user_id: userId },
    data: {
      cancel_at_period_end: true,
      canceled_at: new Date()
    }
  });

  return {
    success: true,
    message: 'Subscription will be canceled at period end'
  };
};

export const getAllPlans = async () => {
  return await prisma.subscriptionPlan.findMany({
    where: { is_publicly_available: true },
    orderBy: { price_monthly_usd: 'asc' }
  });
};

export const getPlanById = async (planId: string) => {
  return await prisma.subscriptionPlan.findUnique({
    where: { plan_id: planId }
  });
};

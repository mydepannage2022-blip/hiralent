// Subscription related types

import { Decimal } from "../generated/prisma/runtime/index-browser";

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  price_monthly_usd: Decimal;
  price_annually_usd: Decimal;
  job_post_limit: number;
  ai_interview_limit: number;
  features_included: string; // JSON string
  is_publicly_available: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_annually?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscription {
  subscription_id: string;
  user_id: string;
  plan_id: string;
  payment_gateway: string;
  gateway_subscription_id?: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: Date;
  current_period_end: Date;
  trial_ends_at?: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  created_at: Date;
  updated_at: Date;
  plan?: SubscriptionPlan;
}

export interface CreateCheckoutSessionRequest {
  plan_id: string;
  billing_cycle: BillingCycle;
  payment_gateway: 'stripe' | 'paypal' | 'manual';
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutSessionResponse {
  session_id: string;
  checkout_url: string;
  payment_gateway: string;
}

export interface FeatureAccess {
  feature_name: string;
  is_allowed: boolean;
  current_usage?: number;
  limit?: number;
  plan_required?: string;
}

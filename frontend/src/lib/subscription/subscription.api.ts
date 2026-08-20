import axios from 'axios';
import { API_V1_BASE } from '@/src/lib/config/api';

export const subscriptionApi = axios.create({
  baseURL: API_V1_BASE,
  headers: { 'Content-Type': 'application/json' },
});


// Add auth token to requests
subscriptionApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface Plan {
  plan_id: string;
  name: string;
  price_monthly_usd: number;
  price_annually_usd: number;
  job_post_limit: number;
  ai_interview_limit: number;
  features_included: string;
  is_publicly_available: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_annually?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckoutData {
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  payment_gateway: 'stripe' | 'paypal' | 'manual';
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutResponse {
  success: boolean;
  data: {
    session_id: string;
    checkout_url: string;
    payment_gateway: string;
  };
}

export interface Subscription {
  subscription_id: string;
  user_id: string;
  plan_id: string;
  payment_gateway: string;
  gateway_subscription_id?: string;
  status: 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

// API Functions

// Get all available plans
export const getAllPlans = async (): Promise<Plan[]> => {
  const response = await subscriptionApi.get('/subscription/plans');
  return response.data.data;
};

// Get single plan by ID
export const getPlanById = async (planId: string): Promise<Plan> => {
  const response = await subscriptionApi.get(`/subscription/plans/${planId}`);
  return response.data.data;
};

// Create checkout session
export const createCheckoutSession = async (
  data: CreateCheckoutData
): Promise<CheckoutResponse> => {
  const response = await subscriptionApi.post('/subscription/checkout', data);
  return response.data;
};

// Get user's current subscription
export const getMySubscription = async (): Promise<Subscription | null> => {
  const response = await subscriptionApi.get('/subscription/my-subscription');
  return response.data.data;
};

// Cancel subscription
export const cancelSubscription = async (data: {
  subscription_id: string;
  cancel_immediately?: boolean;
  reason?: string;
}): Promise<{ success: boolean; message: string }> => {
  const response = await subscriptionApi.post('/subscription/cancel', data);
  return response.data;
};

// Change plan (upgrade/downgrade). Proration is handled by the gateway; the response carries
// the updated subscription.
export const changePlan = async (data: {
  plan_id: string;
  billing_cycle?: 'monthly' | 'yearly';
}): Promise<{ success: boolean; data: Subscription }> => {
  const response = await subscriptionApi.post('/subscription/change-plan', data);
  return response.data;
};

// Get user's plan features
export const getMyFeatures = async () => {
  const response = await subscriptionApi.get('/subscription/my-features');
  return response.data.data;
};

// Plan limits alongside what the company has actually consumed.
// `limit: -1` means unlimited. `source` says where the entitlement came from:
// 'subscription' (a live paid plan), 'free_fallback' (the seeded Free tier), or 'none'.
export interface UsageSummary {
  plan: { plan_id: string | null; name: string; features: string[] };
  source: 'subscription' | 'free_fallback' | 'none';
  status: string | null;
  limits: { job_posts: number; ai_interviews: number };
  usage: { job_posts: number; ai_interviews: number };
  period: { start: string; end: string | null };
}

export const getUsage = async (): Promise<UsageSummary> => {
  const response = await subscriptionApi.get('/subscription/usage');
  return response.data.data;
};

// Check specific feature access
export const checkFeatureAccess = async (featureName: string) => {
  const response = await subscriptionApi.post('/subscription/check-feature', {
    feature_name: featureName,
  });
  return response.data.data;
};
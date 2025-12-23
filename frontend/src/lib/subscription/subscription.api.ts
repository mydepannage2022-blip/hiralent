import axios from 'axios';

export const subscriptionApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
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

// Get user's plan features
export const getMyFeatures = async () => {
  const response = await subscriptionApi.get('/subscription/my-features');
  return response.data.data;
};

// Check specific feature access
export const checkFeatureAccess = async (featureName: string) => {
  const response = await subscriptionApi.post('/subscription/check-feature', {
    feature_name: featureName,
  });
  return response.data.data;
};
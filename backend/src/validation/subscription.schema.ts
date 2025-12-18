import { z } from 'zod';

// Create checkout session validation
export const createCheckoutSessionSchema = z.object({
  plan_id: z.string().uuid({ message: 'Invalid plan ID format' }),
  billing_cycle: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Billing cycle must be monthly or yearly' })
  }),
  payment_gateway: z.enum(['stripe', 'paypal', 'manual'], {
    errorMap: () => ({ message: 'Invalid payment gateway' })
  }),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional()
});

// Cancel subscription validation
export const cancelSubscriptionSchema = z.object({
  subscription_id: z.string().uuid({ message: 'Invalid subscription ID' }),
  cancel_immediately: z.boolean().optional().default(false),
  reason: z.string().max(500).optional()
});

// Update subscription validation
export const updateSubscriptionSchema = z.object({
  plan_id: z.string().uuid().optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  cancel_at_period_end: z.boolean().optional()
});

// Webhook validation (generic)
export const webhookSchema = z.object({
  gateway: z.enum(['stripe', 'paypal', 'razorpay', 'paytabs']),
  signature: z.string().optional(),
  payload: z.any()
});

// Feature access check validation
export const checkFeatureAccessSchema = z.object({
  feature_name: z.string().min(1, { message: 'Feature name is required' }),
  user_id: z.string().uuid().optional() // Optional, can get from auth
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type CheckFeatureAccessInput = z.infer<typeof checkFeatureAccessSchema>;

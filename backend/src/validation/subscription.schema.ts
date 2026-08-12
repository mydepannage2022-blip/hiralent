import { z } from 'zod';

// Create checkout session validation
export const createCheckoutSessionSchema = z.object({
  // plan_id is our own SubscriptionPlan identifier. It is NOT a UUID — the seed assigns
  // deterministic ids ('plan_free'/'plan_standard'/'plan_starter'), so a `.uuid()` check
  // rejected every real plan and 400'd checkout before it reached the controller.
  // An unknown id is safely rejected at the DB lookup ("Subscription plan not found").
  plan_id: z.string().min(1, { message: 'Plan ID is required' }),
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
  plan_id: z.string().min(1).optional(), // our own plan id, not a UUID (see checkout schema)
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  cancel_at_period_end: z.boolean().optional()
});

// Change plan (upgrade/downgrade) validation. plan_id is required here (unlike the generic
// update above) and is our own non-UUID plan id — see the checkout schema note.
export const changePlanSchema = z.object({
  plan_id: z.string().min(1, { message: 'Plan ID is required' }),
  billing_cycle: z.enum(['monthly', 'yearly']).optional()
});

// Admin refund validation. transaction_id is our own PaymentTransaction UUID; amount (when
// given) is a partial refund in the transaction's currency (dollars, not minor units).
export const refundTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional()
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
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type RefundTransactionInput = z.infer<typeof refundTransactionSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type CheckFeatureAccessInput = z.infer<typeof checkFeatureAccessSchema>;

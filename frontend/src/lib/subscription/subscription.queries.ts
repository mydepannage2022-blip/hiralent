import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  getAllPlans,
  getPlanById,
  createCheckoutSession,
  getMySubscription,
  cancelSubscription,
  changePlan,
  getMyFeatures,
  getUsage,
  checkFeatureAccess,
  CreateCheckoutData,
} from './subscription.api';

// Query Keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
  plan: (id: string) => [...subscriptionKeys.all, 'plan', id] as const,
  mySubscription: () => [...subscriptionKeys.all, 'my-subscription'] as const,
  myFeatures: () => [...subscriptionKeys.all, 'my-features'] as const,
  usage: () => [...subscriptionKeys.all, 'usage'] as const,
};

// Get all plans
export const usePlans = () => {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: getAllPlans,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single plan
export const usePlan = (planId: string) => {
  return useQuery({
    queryKey: subscriptionKeys.plan(planId),
    queryFn: () => getPlanById(planId),
    enabled: !!planId,
  });
};

// Get user's subscription. Accepts a narrow set of react-query options so callers such as
// the post-checkout success page can poll (refetchInterval) while the Stripe webhook
// activates the subscription asynchronously. Non-breaking: existing call sites pass nothing.
type MySubscriptionOptions = {
  refetchInterval?: number | false | ((query: any) => number | false);
  enabled?: boolean;
};

export const useMySubscription = (options?: MySubscriptionOptions) => {
  return useQuery({
    queryKey: subscriptionKeys.mySubscription(),
    queryFn: getMySubscription,
    ...options,
  });
};

// Get user's features
export const useMyFeatures = () => {
  return useQuery({
    queryKey: subscriptionKeys.myFeatures(),
    queryFn: getMyFeatures,
  });
};

// Plan limits + live usage. Returns 403 when the account has no live subscription (the
// endpoint is part of the paid product), so callers should treat an error as "not subscribed"
// rather than "broken".
export const useUsage = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: subscriptionKeys.usage(),
    queryFn: getUsage,
    retry: false,
    staleTime: 30 * 1000,
    ...options,
  });
};

// Create checkout session
export const useCreateCheckout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Redirecting to payment...');
        
        // Redirect to payment gateway
        if (data.data.checkout_url) {
          window.location.href = data.data.checkout_url;
        }
      } else {
        toast.error('Failed to create checkout session');
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.error ||
        error.message ||
        'Failed to create checkout session';
      console.error('Checkout error:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// Cancel subscription
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Subscription cancelled successfully');
        
        // Invalidate subscription queries
        queryClient.invalidateQueries({
          queryKey: subscriptionKeys.mySubscription(),
        });
      } else {
        toast.error('Failed to cancel subscription');
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.error ||
        error.message ||
        'Failed to cancel subscription';
      console.error('Cancel subscription error:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// Change plan (upgrade/downgrade)
export const useChangePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changePlan,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Plan updated successfully');
        queryClient.invalidateQueries({
          queryKey: subscriptionKeys.mySubscription(),
        });
        queryClient.invalidateQueries({
          queryKey: subscriptionKeys.myFeatures(),
        });
      } else {
        toast.error('Failed to update plan');
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.error ||
        error.message ||
        'Failed to update plan';
      console.error('Change plan error:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// Check feature access (non-hook utility)
export const useCheckFeatureAccess = (featureName: string) => {
  return useQuery({
    queryKey: [...subscriptionKeys.all, 'feature', featureName],
    queryFn: () => checkFeatureAccess(featureName),
    enabled: !!featureName,
  });
};

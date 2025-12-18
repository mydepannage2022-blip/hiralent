import prisma from '../../lib/prisma';
import { FeatureAccess, SubscriptionStatus } from '../../types/subscription.types';

export const checkFeatureAccess = async (
  userId: string, 
  featureName: string
): Promise<FeatureAccess> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: { plan: true }
  });

  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    const freeFeatures = getFreeFeatures();
    const isFreeFeature = freeFeatures.includes(featureName);

    return {
      feature_name: featureName,
      is_allowed: isFreeFeature,
      plan_required: isFreeFeature ? 'FREE' : 'PRO'
    };
  }

  if (new Date() > subscription.current_period_end) {
    return {
      feature_name: featureName,
      is_allowed: false,
      plan_required: 'ACTIVE_SUBSCRIPTION'
    };
  }

  const planFeatures = getPlanFeatures(subscription.plan.name);
  const isAllowed = planFeatures.includes(featureName) || planFeatures.includes('*');

  return {
    feature_name: featureName,
    is_allowed: isAllowed,
    plan_required: isAllowed ? subscription.plan.name : 'PRO'
  };
};

export const checkFeatureLimit = async (
  userId: string,
  featureName: string,
  currentUsage: number
): Promise<FeatureAccess> => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: { plan: true }
  });

  if (!subscription) {
    const freeLimit = getFeatureLimit('FREE', featureName);
    return {
      feature_name: featureName,
      is_allowed: currentUsage < freeLimit,
      current_usage: currentUsage,
      limit: freeLimit,
      plan_required: currentUsage >= freeLimit ? 'PRO' : 'FREE'
    };
  }

  const limit = getFeatureLimit(subscription.plan.name, featureName);
  
  return {
    feature_name: featureName,
    is_allowed: limit === -1 || currentUsage < limit,
    current_usage: currentUsage,
    limit: limit === -1 ? undefined : limit,
    plan_required: subscription.plan.name
  };
};

const getFreeFeatures = (): string[] => {
  return [
    'basic_profile',
    'job_search',
    'apply_to_jobs',
    'basic_assessments',
    'view_jobs'
  ];
};

const getPlanFeatures = (planName: string): string[] => {
  const featureMap: Record<string, string[]> = {
    'FREE': getFreeFeatures(),
    'PRO': [
      ...getFreeFeatures(),
      'unlimited_assessments',
      'advanced_analytics',
      'priority_support',
      'ai_interviews',
      'custom_branding',
      'api_access'
    ],
    'ENTERPRISE': ['*']
  };

  return featureMap[planName] || getFreeFeatures();
};

const getFeatureLimit = (planName: string, featureName: string): number => {
  const limitMap: Record<string, Record<string, number>> = {
    'FREE': {
      'assessments': 5,
      'job_posts': 2,
      'ai_interviews': 0,
      'candidates_view': 10
    },
    'PRO': {
      'assessments': -1,
      'job_posts': -1,
      'ai_interviews': 100,
      'candidates_view': -1
    },
    'ENTERPRISE': {
      'assessments': -1,
      'job_posts': -1,
      'ai_interviews': -1,
      'candidates_view': -1
    }
  };

  return limitMap[planName]?.[featureName] ?? 0;
};

export const getUserPlanFeatures = async (userId: string) => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: { plan: true }
  });

  if (!subscription) {
    return {
      plan_name: 'FREE',
      features: getFreeFeatures(),
      limits: {
        assessments: 5,
        job_posts: 2,
        ai_interviews: 0,
        candidates_view: 10
      }
    };
  }

  return {
    plan_name: subscription.plan.name,
    features: getPlanFeatures(subscription.plan.name),
    limits: {
      assessments: getFeatureLimit(subscription.plan.name, 'assessments'),
      job_posts: getFeatureLimit(subscription.plan.name, 'job_posts'),
      ai_interviews: getFeatureLimit(subscription.plan.name, 'ai_interviews'),
      candidates_view: getFeatureLimit(subscription.plan.name, 'candidates_view')
    },
    subscription_status: subscription.status,
    current_period_end: subscription.current_period_end
  };
};

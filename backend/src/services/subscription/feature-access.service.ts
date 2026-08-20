import { FeatureAccess } from '../../types/subscription.types';
import {
  QuotaKey,
  UNLIMITED,
  checkQuota,
  getEntitlementSummary,
  getEntitlements,
  getUsage,
} from './entitlements.service';

/**
 * Thin compatibility layer over `entitlements.service`.
 *
 * This module used to *be* the entitlement rules, as three hardcoded maps keyed by
 * `'FREE' | 'PRO' | 'ENTERPRISE'`. The seeded catalogue is named `Free` / `Starter` / `Standard`,
 * so every lookup missed: `getFeatureLimit('Standard', 'job_posts')` returned `0` via `?? 0`, and
 * `getPlanFeatures('Standard')` returned the free feature list. The plan columns that hold the
 * real numbers — `job_post_limit`, `ai_interview_limit` — were never read at all.
 *
 * All of that now comes from the DB. What is left here is the shape the subscription controller
 * already returns to the frontend.
 *
 * `accountId` is a **billing account** (a company), not a user id — see billingAccount.ts.
 */

/** Feature names the API accepts, mapped to the metered quota behind them. */
const QUOTA_ALIASES: Record<string, QuotaKey> = {
  job_posts: 'job_posts',
  job_post: 'job_posts',
  jobs: 'job_posts',
  ai_interviews: 'ai_interviews',
  ai_interview: 'ai_interviews',
  interviews: 'ai_interviews',
};

const resolveQuotaKey = (featureName: string): QuotaKey | null =>
  QUOTA_ALIASES[String(featureName || '').trim().toLowerCase()] ?? null;

/**
 * Is this feature available to the account?
 *
 * For a metered feature the answer is its quota. For anything else the answer is whether the
 * account is on a paid plan — deliberately coarse: `features_included` is marketing copy
 * ("3 active job slots, editable"), not a machine-readable flag set, so it is never used to
 * make an access decision.
 */
export const checkFeatureAccess = async (
  accountId: string,
  featureName: string
): Promise<FeatureAccess> => {
  const quotaKey = resolveQuotaKey(featureName);

  if (quotaKey) {
    const quota = await checkQuota(accountId, quotaKey);
    return {
      feature_name: featureName,
      is_allowed: quota.allowed,
      current_usage: quota.usage,
      limit: quota.limit === UNLIMITED ? undefined : quota.limit,
      plan_required: quota.allowed ? quota.plan_name : 'upgrade',
    };
  }

  const entitlements = await getEntitlements(accountId);
  const onPaidPlan = entitlements.source === 'subscription';

  return {
    feature_name: featureName,
    is_allowed: onPaidPlan,
    plan_required: onPaidPlan ? entitlements.plan_name : 'upgrade',
  };
};

/**
 * Quota answer for a caller that has already counted usage itself.
 * Kept for callers that measure usage in their own terms; the limit still comes from the plan.
 */
export const checkFeatureLimit = async (
  accountId: string,
  featureName: string,
  currentUsage: number
): Promise<FeatureAccess> => {
  const entitlements = await getEntitlements(accountId);
  const quotaKey = resolveQuotaKey(featureName);
  const limit = quotaKey ? entitlements.limits[quotaKey] : 0;

  return {
    feature_name: featureName,
    is_allowed: limit === UNLIMITED || currentUsage < limit,
    current_usage: currentUsage,
    limit: limit === UNLIMITED ? undefined : limit,
    plan_required: entitlements.plan_name,
  };
};

/** Plan + limits + live usage, as the billing screens consume it. */
export const getUserPlanFeatures = async (accountId: string) => {
  const entitlements = await getEntitlements(accountId);
  const usage = await getUsage(accountId, entitlements);

  return {
    plan_name: entitlements.plan_name,
    plan_id: entitlements.plan_id,
    source: entitlements.source,
    // Display copy straight from the plan row, not a code-side list.
    features: entitlements.features,
    limits: entitlements.limits,
    usage,
    subscription_status: entitlements.status,
    current_period_end: entitlements.period_end,
  };
};

export { getEntitlementSummary };

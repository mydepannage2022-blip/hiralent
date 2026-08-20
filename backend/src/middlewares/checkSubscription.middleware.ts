import { Request, Response, NextFunction } from 'express';
import { getUserSubscription } from '../services/subscription/subscription.service';
import { getPlanRanks } from '../services/subscription/entitlements.service';
import {
  resolveBillingAccountId,
  billingAccountError,
  isPlatformStaff,
  isCompanyScopedActor,
} from '../services/subscription/billingAccount';
import { SubscriptionStatus } from '../types/subscription.types';

/**
 * Gates for paid-only endpoints.
 *
 * Both middlewares resolve the **billing account** (the company) rather than the calling user —
 * a team member acting for a subscribed company is entitled to what the company bought. See
 * billingAccount.ts.
 */

/** A trial is a live subscription: S3 already treats TRIALING as active for cancel/change-plan,
 *  and selling a trial then refusing the product would be the obvious bug. */
const LIVE_STATUSES: string[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

/**
 * Two different refusals, deliberately given different statuses.
 *
 * A candidate or agency token on a company feature is an **authorisation** answer — 403. Sending
 * 400 there told the client its request was malformed, which is both wrong and unactionable.
 * A company user whose token simply carries no `company_id` (minted before the claim existed for
 * their role) gets 400 with a re-login instruction, because that one really is fixable by the
 * caller.
 */
const rejectNoAccount = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  if (!isCompanyScopedActor(req.user)) {
    return res.status(403).json({
      success: false,
      error: billingAccountError(req.user),
      code: 'NOT_A_BILLING_ACCOUNT',
    });
  }

  return res.status(400).json({
    success: false,
    error: billingAccountError(req.user),
    code: 'NO_BILLING_ACCOUNT',
  });
};

/**
 * Unlike the quota gate, a paid-only endpoint refuses everyone without a live plan — a candidate
 * or agency token must NOT walk into a premium company feature. The single exception is platform
 * staff, who are operators rather than customers and are already admitted to these routes by
 * their own authorisation (e.g. `requireCompanyMember` lets an admin reach any company).
 */
const isStaffBypass = (req: Request): boolean => isPlatformStaff(req.user);

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (isStaffBypass(req)) return next();

    const accountId = resolveBillingAccountId(req.user);
    if (!accountId) return rejectNoAccount(req, res);

    // getUserSubscription applies S3's lazy expiry, so a lapsed row arrives already moved to its
    // terminal status — an expired subscription can never read as active here.
    const subscription = await getUserSubscription(accountId);

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required',
        code: 'NO_SUBSCRIPTION'
      });
    }

    if (!LIVE_STATUSES.includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        error: 'Your subscription is not active',
        code: 'INACTIVE_SUBSCRIPTION',
        subscription_status: subscription.status
      });
    }

    if (new Date() > new Date(subscription.current_period_end)) {
      return res.status(403).json({
        success: false,
        error: 'Your subscription has expired',
        code: 'EXPIRED_SUBSCRIPTION',
        expired_at: subscription.current_period_end
      });
    }

    req.subscription = subscription;
    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Require a plan at least as high as `requiredPlan`.
 *
 * Ranking comes from the plan catalogue (cheapest first), not a hardcoded name list. The old
 * `['FREE','PRO','ENTERPRISE']` array matched none of the real plans, so `indexOf` returned -1
 * for every actual customer and `-1 < requiredIndex` refused them all — the highest-paying
 * account was the most likely to be blocked.
 */
export const requirePlan = (requiredPlan: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (isStaffBypass(req)) return next();

      const accountId = resolveBillingAccountId(req.user);
      if (!accountId) return rejectNoAccount(req, res);

      const subscription = await getUserSubscription(accountId);
      const ranks = await getPlanRanks();
      const requiredRank = ranks.get(requiredPlan);

      const live =
        !!subscription &&
        LIVE_STATUSES.includes(subscription.status) &&
        new Date(subscription.current_period_end) > new Date();

      const currentRank = live && subscription!.plan ? ranks.get(subscription!.plan!.name) : undefined;

      // An unknown required plan is a configuration error, not an open door.
      const insufficient =
        requiredRank === undefined || currentRank === undefined || currentRank < requiredRank;

      if (insufficient) {
        return res.status(403).json({
          success: false,
          error: `${requiredPlan} plan required`,
          code: 'PLAN_UPGRADE_REQUIRED',
          current_plan: live ? subscription!.plan?.name ?? null : null,
          required_plan: requiredPlan
        });
      }

      req.subscription = subscription;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
};

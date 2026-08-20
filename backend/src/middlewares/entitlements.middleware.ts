import { Request, Response, NextFunction } from 'express';
import { QuotaKey, UNLIMITED, checkQuota } from '../services/subscription/entitlements.service';
import {
  resolveBillingAccountId,
  billingAccountError,
  isPlatformStaff,
  isCompanyScopedActor,
} from '../services/subscription/billingAccount';

/**
 * Enforce a plan quota before a metered action is allowed to happen.
 *
 * Until this session the limits in `SubscriptionPlan` were decorative: nothing read
 * `job_post_limit` or `ai_interview_limit`, and the two subscription middlewares that existed
 * were never mounted on a single route. A free account and a $699/mo account could post the
 * same number of jobs.
 *
 * The quota is counted against the **company**, not the calling user, so a team of five
 * recruiters shares the company's allowance instead of each holding a private one.
 */

const HUMAN_LABEL: Record<QuotaKey, string> = {
  job_posts: 'active job posts',
  ai_interviews: 'AI interviews',
};

export const requireQuota = (key: QuotaKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Platform staff spend nobody's allowance — let the route's own authorisation decide.
      if (isPlatformStaff(req.user)) return next();

      const accountId = resolveBillingAccountId(req.user);

      if (!accountId) {
        // A company user with no resolvable account is refused: a stale token must not become a
        // way to spend an allowance we cannot attribute to anyone.
        if (isCompanyScopedActor(req.user)) {
          return res.status(400).json({
            success: false,
            error: billingAccountError(req.user),
            code: 'NO_BILLING_ACCOUNT',
          });
        }

        // Everyone else (candidate, agency admin — agency billing is a separate product, Wave 5
        // S5) is not metered by this quota. Refusing them here would break flows this gate was
        // never meant to police; whether they may call the route at all is the route's decision.
        return next();
      }

      const quota = await checkQuota(accountId, key);

      if (!quota.allowed) {
        return res.status(403).json({
          success: false,
          error: `Your ${quota.plan_name} plan allows ${quota.limit} ${HUMAN_LABEL[key]}. Upgrade to add more.`,
          code: 'PLAN_UPGRADE_REQUIRED',
          feature: key,
          current_usage: quota.usage,
          limit: quota.limit === UNLIMITED ? null : quota.limit,
          plan_name: quota.plan_name,
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
};

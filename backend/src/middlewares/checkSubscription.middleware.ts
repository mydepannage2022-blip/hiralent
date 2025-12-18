import { Request, Response, NextFunction } from 'express';
import { getUserSubscription } from '../services/subscription/subscription.service';
import { SubscriptionStatus } from '../types/subscription.types';

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required',
        code: 'NO_SUBSCRIPTION'
      });
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        error: 'Your subscription is not active',
        code: 'INACTIVE_SUBSCRIPTION',
        subscription_status: subscription.status
      });
    }

    if (new Date() > subscription.current_period_end) {
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

export const requirePlan = (requiredPlan: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const subscription = await getUserSubscription(userId);

      if (!subscription && requiredPlan !== 'FREE') {
        return res.status(403).json({
          success: false,
          error: `${requiredPlan} plan required`,
          code: 'PLAN_UPGRADE_REQUIRED',
          required_plan: requiredPlan
        });
      }

      if (subscription && subscription.plan.name !== requiredPlan) {
        const planHierarchy = ['FREE', 'PRO', 'ENTERPRISE'];
        const userPlanIndex = planHierarchy.indexOf(subscription.plan.name);
        const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);

        if (userPlanIndex < requiredPlanIndex) {
          return res.status(403).json({
            success: false,
            error: `${requiredPlan} plan required`,
            code: 'PLAN_UPGRADE_REQUIRED',
            current_plan: subscription.plan.name,
            required_plan: requiredPlan
          });
        }
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

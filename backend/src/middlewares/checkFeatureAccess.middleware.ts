import { Request, Response, NextFunction } from 'express';
import { checkFeatureAccess } from '../services/subscription/feature-access.service';

export const requireFeature = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const access = await checkFeatureAccess(userId, featureName);

      if (!access.is_allowed) {
        return res.status(403).json({
          success: false,
          error: `Feature '${featureName}' is not available in your plan`,
          code: 'FEATURE_NOT_ALLOWED',
          feature: featureName,
          plan_required: access.plan_required
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
};

export const checkLimit = (featureName: string, getCurrentUsage: (req: Request) => Promise<number>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const currentUsage = await getCurrentUsage(req);
      const { checkFeatureLimit } = await import('../services/subscription/feature-access.service');
      const access = await checkFeatureLimit(userId, featureName, currentUsage);

      if (!access.is_allowed) {
        return res.status(403).json({
          success: false,
          error: `You have reached the limit for '${featureName}'`,
          code: 'FEATURE_LIMIT_REACHED',
          feature: featureName,
          current_usage: access.current_usage,
          limit: access.limit,
          plan_required: access.plan_required
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
};

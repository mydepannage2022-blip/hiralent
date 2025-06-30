import { Request, Response, NextFunction } from "express";
import { hasPermission } from "../utils/role-permission.util";

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    role: string;
    agency_id: string;
  };
}

/**
 * RBAC Middleware — Role-Based Access Control
 * @param module - e.g. "RecruiterJobs", "Agencies"
 * @param accessLevel - e.g. "read", "write", "admin"
 */
export const rbacMiddleware = (module: string, accessLevel: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized: Missing user payload" });
        return;
      }

      const { role } = req.user;
      const allowed = await hasPermission(role, module, accessLevel);

      if (!allowed) {
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({
        error: "RBAC Middleware Error",
        message: err.message || "Something went wrong",
      });
    }
  };
};

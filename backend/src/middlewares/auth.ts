import type { Request, Response, NextFunction } from 'express';

// Express middleware placeholder for auth (dev-only). Attaches a dummy admin user.
export async function authHook(req: Request, _res: Response, next: NextFunction) {
  // Replace this with your JWT/session logic and RBAC checks.
  // Attach user to `req.user`.
  (req as any).user = { user_id: "ADMIN_OR_REQUESTER_USER_ID", role: "admin" };
  next();
}

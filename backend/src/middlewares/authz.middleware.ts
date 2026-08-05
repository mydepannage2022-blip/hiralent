// src/middlewares/authz.middleware.ts   <-- ou src/middleware/authz.ts
import { Request, Response, NextFunction } from 'express';
import { checkAuth } from './checkAuth.middleware'; 

export const requireAuth = checkAuth;

export function requireCompanyMember(req: Request, res: Response, next: NextFunction) {
  const user: any = (req as any).user;
  const { companyId } = req.params as { companyId: string };

  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Platform-level admins may reach any company. NOTE: company_admin is intentionally
  // NOT here — it is a per-company role, so it must still match the requested company
  // below (otherwise one company's admin could read/recompute another company's data).
  if (['admin', 'super_admin'].includes(user.role) || user.is_admin === true) return next();

  // The caller's own company. checkAuth puts it on `company_id` (snake_case); older
  // callers also used `companyId` / `company_ids`, so accept those as fallbacks.
  const memberships: string[] = [
    ...(user.company_id != null ? [String(user.company_id)] : []),
    ...(Array.isArray(user.company_ids) ? user.company_ids.map(String) : []),
    ...(user.companyId != null ? [String(user.companyId)] : []),
  ];

  if (memberships.includes(String(companyId))) return next();
  return res.status(403).json({ error: 'Forbidden' });
}

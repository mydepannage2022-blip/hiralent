// src/middlewares/authz.middleware.ts   <-- ou src/middleware/authz.ts
import { Request, Response, NextFunction } from 'express';
import { checkAuth } from './checkAuth.middleware'; 

export const requireAuth = checkAuth;

export function requireCompanyMember(req: Request, res: Response, next: NextFunction) {
  const user: any = (req as any).user;
  const { companyId } = req.params as { companyId: string };

  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (['admin','super_admin','company_admin'].includes(user.role) || user.is_admin) return next();

  // Combine company_ids (array) + companyId (single) sans utiliser ?? inutile
  const memberships: string[] = [
    ...(Array.isArray(user.company_ids) ? user.company_ids.map(String) : []),
    ...(user.companyId != null ? [String(user.companyId)] : []),
  ];

  if (memberships.includes(String(companyId))) return next();
  return res.status(403).json({ error: 'Forbidden' });
}

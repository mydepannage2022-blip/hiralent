import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { hasPermission } from '../utils/team-permission.util';
import type { Module, ModulePermission, CompanyContext } from '../types/team.types';

type Action = 'view' | 'create' | 'edit' | 'delete' | 'manage';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      companyContext?: CompanyContext;
    }
  }
}

export const checkTeamPermission = (module: Module, action: Action) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.user_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check 1: Is user the company owner directly?
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { company_id: userId },
      });

      if (companyProfile) {
        // User is the company owner - full access
        req.companyContext = {
          company_id: userId,
          member_id: null,
          role: 'owner',
          is_owner: true,
        };
        return next();
      }

      // Check 2: Is user a team member?
      const membership = await prisma.companyTeamMember.findFirst({
        where: {
          user_id: userId,
          is_active: true,
        },
        include: {
          permissions: true,
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not a company member' });
      }

      // Check permission
      const permissions: ModulePermission[] = membership.permissions.map(p => ({
        module: p.module as Module,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_manage: p.can_manage,
      }));

      if (!hasPermission(permissions, module, action)) {
        return res.status(403).json({
          error: 'Permission denied',
          required: { module, action },
        });
      }

      req.companyContext = {
        company_id: membership.company_id,
        member_id: membership.member_id,
        role: membership.role as any,
        is_owner: false,
      };

      next();
    } catch (error: any) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// backend/src/controller/superadmin/admin.management.controller.ts
//
// Superadmin self-service + platform management for the admin dashboard (Session 8,
// Phase 4.3-admin). Backs the four previously-dead sidebar pages: Admins, Settings,
// Analytics, Security Log. All routes sit behind `adminSecurityStack` and identify the
// caller via `req.admin` (set by requireSuperAdmin) — NOT `req.user`. Envelope is the
// standard { success:true, data } via sendSuccess; thrown AppErrors become the
// { success:false, error } envelope through the central errorHandler.
//
// Admins are ordinary `User` rows with role='superadmin' (that is what the auth flow
// checks — see admin.auth.service). The orphan `SuperAdmin` table is intentionally NOT
// used. Mutating actions (create/delete admin, settings change) append an AdminAuditLog
// row so the Security Log page has a real, growing trail.

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { sendSuccess } from '../../utils/apiResponse';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../errors/httpErrors';
import { refundTransaction } from '../../services/subscription/subscription.service';

const SUPERADMIN_ROLE = 'superadmin';
const PLATFORM_SETTINGS_ID = 'global';
const MIN_PASSWORD_LENGTH = 8;

// Fields safe to return for an admin user — never the password_hash / mfa_secret.
const ADMIN_PUBLIC_SELECT = {
  user_id: true,
  email: true,
  full_name: true,
  role: true,
  mfa_enabled: true,
  last_login_at: true,
  created_at: true,
} as const;

/** Append an admin-action row to the audit trail (best-effort — never blocks the action). */
async function writeAudit(
  admin_id: string,
  action_type: string,
  target_table: string,
  target_id: string,
  description?: string
) {
  try {
    await prisma.adminAuditLog.create({
      data: { admin_id, action_type, target_table, target_id, description },
    });
  } catch (err) {
    console.error('[admin.management] audit write failed:', (err as Error).message);
  }
}

function requireAdmin(req: Request): { user_id: string; email: string; full_name: string } {
  if (!req.admin?.user_id) throw new UnauthorizedError('Admin not authenticated');
  return req.admin;
}

// ── Admins CRUD ─────────────────────────────────────────────────────────────

// GET /api/v1/admin/admins
export const listAdmins = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: SUPERADMIN_ROLE },
      orderBy: { created_at: 'asc' },
      select: ADMIN_PUBLIC_SELECT,
    });
    return sendSuccess(res, admins);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/admin/admins   { email, full_name, password }
export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const full_name = String(req.body?.full_name ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!email || !full_name || !password) {
      throw new BadRequestError('email, full_name and password are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError('A valid email address is required');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Never silently escalate an existing non-admin account (would be a takeover).
      throw new ConflictError('An account with this email already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);
    let created;
    try {
      created = await prisma.user.create({
        data: {
          email,
          password_hash,
          full_name,
          role: SUPERADMIN_ROLE,
          is_email_verified: true,
        },
        select: ADMIN_PUBLIC_SELECT,
      });
    } catch (err) {
      // findUnique above is not atomic with create — a concurrent create of the same email
      // slips past it and trips the unique constraint. Map it to the same 409 rather than a 500.
      if ((err as { code?: string })?.code === 'P2002') {
        throw new ConflictError('An account with this email already exists');
      }
      throw err;
    }

    await writeAudit(
      actor.user_id,
      'CREATE_ADMIN',
      'User',
      created.user_id,
      `Created superadmin ${created.email}`
    );

    return sendSuccess(res, created, 201);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/admin/admins/:id
export const deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);
    const { id } = req.params;

    if (id === actor.user_id) {
      throw new BadRequestError('You cannot delete your own admin account');
    }

    const target = await prisma.user.findFirst({
      where: { user_id: id, role: SUPERADMIN_ROLE },
      select: ADMIN_PUBLIC_SELECT,
    });
    if (!target) throw new NotFoundError('Admin not found');

    // Never leave the platform with zero admins (irrecoverable lockout). Count-then-delete is a
    // check-then-act race: two concurrent deletes of two *different* admins would each see >1
    // remaining and both commit → 0 admins left. Do the "would ≥1 admin survive?" check and the
    // delete in ONE Serializable transaction: Postgres SSI detects the write-skew (each tx reads
    // the admin set the other writes) and aborts one, so the invariant holds under concurrency.
    try {
      await prisma.$transaction(
        async (tx) => {
          const remaining = await tx.user.count({
            where: { role: SUPERADMIN_ROLE, user_id: { not: id } },
          });
          if (remaining < 1) throw new BadRequestError('Cannot delete the last remaining admin');
          await tx.user.delete({ where: { user_id: id } });
        },
        { isolationLevel: 'Serializable' }
      );
    } catch (err) {
      // A losing SSI transaction surfaces as a write-conflict — ask the caller to retry rather
      // than leaking a raw 500. (BadRequestError from inside the tx propagates unchanged.)
      if ((err as { code?: string })?.code === 'P2034') {
        throw new ConflictError('Concurrent admin change detected — please retry.');
      }
      throw err;
    }

    await writeAudit(
      actor.user_id,
      'DELETE_ADMIN',
      'User',
      id,
      `Deleted superadmin ${target.email}`
    );

    return sendSuccess(res, { deleted: true, user_id: id });
  } catch (error) {
    return next(error);
  }
};

// ── Own profile / password (Settings page, section A) ─────────────────────────

// GET /api/v1/admin/me
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);
    const me = await prisma.user.findUnique({
      where: { user_id: actor.user_id },
      select: ADMIN_PUBLIC_SELECT,
    });
    if (!me) throw new NotFoundError('Admin not found');
    return sendSuccess(res, me);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/admin/me   { full_name }
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);
    const full_name = String(req.body?.full_name ?? '').trim();
    if (!full_name) throw new BadRequestError('full_name is required');

    let updated;
    try {
      updated = await prisma.user.update({
        where: { user_id: actor.user_id },
        data: { full_name },
        select: ADMIN_PUBLIC_SELECT,
      });
    } catch (err) {
      // Stale/stateless admin token whose user row is gone (e.g. the admin was deleted while a
      // still-valid ~8h JWT lingers). Prisma throws P2025 (record-to-update not found) — surface a
      // clean 404 like getMe / changePassword rather than leaking a raw 500.
      if ((err as { code?: string })?.code === 'P2025') throw new NotFoundError('Admin not found');
      throw err;
    }
    return sendSuccess(res, updated);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/admin/me/password   { currentPassword, newPassword }
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('currentPassword and newPassword are required');
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const user = await prisma.user.findUnique({ where: { user_id: actor.user_id } });
    if (!user || !user.password_hash) throw new NotFoundError('Admin not found');

    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { user_id: actor.user_id },
      data: { password_hash },
    });

    await writeAudit(actor.user_id, 'CHANGE_PASSWORD', 'User', actor.user_id, 'Changed own password');

    return sendSuccess(res, { updated: true });
  } catch (error) {
    return next(error);
  }
};

// ── Platform settings (Settings page, section B) ──────────────────────────────

/** Read the singleton settings row, creating it with defaults on first access. */
async function getOrCreateSettings() {
  return prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    update: {},
    create: { id: PLATFORM_SETTINGS_ID },
  });
}

// GET /api/v1/admin/settings/platform
export const getPlatformSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getOrCreateSettings();
    return sendSuccess(res, settings);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/admin/settings/platform
//   { allow_new_registrations?, maintenance_mode?, support_email? }
export const updatePlatformSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);

    const data: {
      allow_new_registrations?: boolean;
      maintenance_mode?: boolean;
      support_email?: string | null;
      updated_by: string;
    } = { updated_by: actor.user_id };

    // Track which fields actually changed so (a) an empty / junk-only body is rejected instead of
    // silently bumping updated_by + writing a meaningless audit row, and (b) the audit trail records
    // WHAT changed — critical for the security-sensitive kill-switch, not just "settings updated".
    const changes: string[] = [];

    if (req.body?.allow_new_registrations !== undefined) {
      if (typeof req.body.allow_new_registrations !== 'boolean') {
        throw new BadRequestError('allow_new_registrations must be a boolean');
      }
      data.allow_new_registrations = req.body.allow_new_registrations;
      changes.push(`allow_new_registrations=${data.allow_new_registrations}`);
    }
    if (req.body?.maintenance_mode !== undefined) {
      if (typeof req.body.maintenance_mode !== 'boolean') {
        throw new BadRequestError('maintenance_mode must be a boolean');
      }
      data.maintenance_mode = req.body.maintenance_mode;
      changes.push(`maintenance_mode=${data.maintenance_mode}`);
    }
    if (req.body?.support_email !== undefined) {
      const raw = String(req.body.support_email ?? '').trim();
      if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        throw new BadRequestError('support_email must be a valid email or empty');
      }
      data.support_email = raw || null;
      changes.push(`support_email=${data.support_email ?? '(cleared)'}`);
    }

    if (changes.length === 0) {
      throw new BadRequestError(
        'Provide at least one of: allow_new_registrations, maintenance_mode, support_email'
      );
    }

    const settings = await prisma.platformSettings.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      update: data,
      create: { id: PLATFORM_SETTINGS_ID, ...data },
    });

    await writeAudit(
      actor.user_id,
      'UPDATE_PLATFORM_SETTINGS',
      'PlatformSettings',
      PLATFORM_SETTINGS_ID,
      `Updated platform settings: ${changes.join(', ')}`
    );

    return sendSuccess(res, settings);
  } catch (error) {
    return next(error);
  }
};

// ── Analytics overview (Analytics page) ───────────────────────────────────────

// GET /api/v1/admin/analytics/overview
// Real aggregate counts only — no fabricated trends.
export const getAnalyticsOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersByRole,
      totalUsers,
      agenciesByStatus,
      totalJobs,
      totalApplications,
      totalAssessments,
      signups7d,
      signups30d,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count(),
      prisma.agency.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.companyJob.count(),
      prisma.jobApplication.count(),
      prisma.skillAssessment.count(),
      prisma.user.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
    ]);

    const usersByRoleMap: Record<string, number> = {};
    for (const row of usersByRole) usersByRoleMap[row.role] = row._count._all;

    const agenciesByStatusMap: Record<string, number> = {};
    for (const row of agenciesByStatus) agenciesByStatusMap[String(row.status)] = row._count._all;

    return sendSuccess(res, {
      totalUsers,
      usersByRole: usersByRoleMap,
      agenciesByStatus: agenciesByStatusMap,
      totalJobs,
      totalApplications,
      totalAssessments,
      signups: { last7Days: signups7d, last30Days: signups30d },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
};

// ── Security Log / audit trail (Security Log page) ────────────────────────────

// GET /api/v1/admin/audit-logs?limit=&offset=
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
        include: { admin: { select: { user_id: true, full_name: true, email: true } } },
      }),
      prisma.adminAuditLog.count(),
    ]);

    const items = rows.map((r) => ({
      log_id: r.log_id,
      action_type: r.action_type,
      target_table: r.target_table,
      target_id: r.target_id,
      description: r.description,
      created_at: r.created_at,
      admin: r.admin
        ? { user_id: r.admin.user_id, full_name: r.admin.full_name, email: r.admin.email }
        : null,
    }));

    return sendSuccess(res, { items, total, limit, offset });
  } catch (error) {
    return next(error);
  }
};

// ── Billing: refund a transaction ─────────────────────────────────────────────

// POST /api/v1/admin/transactions/:id/refund   { amount?, reason? }
// Refunds a succeeded Stripe transaction (full or partial) and records it in the audit trail.
export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = requireAdmin(req);
    const transactionId = String(req.params.id ?? '').trim();
    if (!transactionId) {
      throw new BadRequestError('transaction id is required');
    }

    const amount = req.body?.amount as number | undefined;
    const reason = req.body?.reason as string | undefined;

    let result: { refund_id: string; amount: number };
    try {
      result = await refundTransaction(transactionId, amount, reason);
    } catch (err: any) {
      // The service throws plain Errors for domain failures (not found, not refundable,
      // gateway error) — surface them as a 400 rather than a generic 500.
      throw new BadRequestError(err?.message || 'Refund failed');
    }

    await writeAudit(
      actor.user_id,
      'REFUND_PAYMENT',
      'PaymentTransaction',
      transactionId,
      `Refunded ${result.amount} (minor units)${reason ? ` — ${reason}` : ''}. Refund id: ${result.refund_id}`
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

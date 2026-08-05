// prisma/seeds/rolePermissions.seed.ts

import { PrismaClient } from '@prisma/client';

/**
 * Seed the RolePermission RBAC matrix — idempotent via a deterministic primary key
 * (`permission_id = "<role>--<module>"`), so re-runs overwrite in place and never duplicate.
 * (RolePermission has no compound unique on (role_name, module); the synthetic id gives us a
 * clean upsert without a schema migration. Runtime code queries by role_name+module, not id.)
 *
 * NOTE: the RolePermission table is not yet wired to any route (checkPermission.middleware.ts
 * / role-permission.util.ts exist but are mounted nowhere). This seed establishes a sensible,
 * documented BASELINE so a fresh DB has a real RBAC dataset the moment those checks go live.
 * `superadmin` is the only row-set that must be exact today (full manage); the other three are
 * a reasonable default and can be re-tuned when the checks are activated (later wave).
 *
 * access_level values are the `AccessLevel` enum: none | read | write | manage.
 */

type Level = 'none' | 'read' | 'write' | 'manage';

const MODULES = [
  'users', 'candidates', 'jobs', 'applications', 'assessments', 'questions',
  'companies', 'agencies', 'billing', 'notifications', 'analytics', 'admin',
] as const;

// role -> module -> level. Any module omitted for a role defaults to 'none'.
const MATRIX: Record<string, Partial<Record<(typeof MODULES)[number], Level>>> = {
  superadmin: Object.fromEntries(MODULES.map((m) => [m, 'manage' as Level])) as Record<
    (typeof MODULES)[number],
    Level
  >,
  agency_admin: {
    candidates: 'manage', jobs: 'manage', applications: 'manage', assessments: 'manage',
    companies: 'manage', agencies: 'manage', notifications: 'manage',
    questions: 'write', analytics: 'read', billing: 'read', users: 'read', admin: 'none',
  },
  company_admin: {
    jobs: 'manage', applications: 'manage', assessments: 'manage', notifications: 'manage',
    candidates: 'read', questions: 'read', analytics: 'read', companies: 'read',
    agencies: 'none', billing: 'none', users: 'none', admin: 'none',
  },
  candidate: {
    applications: 'write', jobs: 'read', assessments: 'read', notifications: 'read',
    candidates: 'read', questions: 'none', companies: 'none', agencies: 'none',
    billing: 'none', analytics: 'none', users: 'none', admin: 'none',
  },
};

export async function seedRolePermissions(prisma: PrismaClient): Promise<void> {
  const roles = Object.keys(MATRIX);
  let count = 0;

  for (const role of roles) {
    for (const module of MODULES) {
      const access_level: Level = MATRIX[role][module] ?? 'none';
      const permission_id = `${role}--${module}`;
      await prisma.rolePermission.upsert({
        where: { permission_id },
        update: { role_name: role, module, access_level },
        create: { permission_id, role_name: role, module, access_level },
      });
      count++;
    }
  }

  console.log(
    `✅ [rolePermissions] ensured ${count} entries (${roles.length} roles × ${MODULES.length} modules).`
  );
}

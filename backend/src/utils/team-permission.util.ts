import { TeamRole, Module, ModulePermission } from '../types/team.types';

// ==================== DEFAULT PERMISSIONS ====================

const FULL: ModulePermission = {
  module: 'dashboard' as Module,
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: true,
  can_manage: true,
};

const VIEW_ONLY: ModulePermission = {
  module: 'dashboard' as Module,
  can_view: true,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_manage: false,
};

const NO_ACCESS: ModulePermission = {
  module: 'dashboard' as Module,
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_manage: false,
};

const ALL_MODULES: Module[] = [
  'dashboard', 'jobs', 'candidates', 'assessments',
  'questions', 'messages', 'settings', 'team', 'analytics', 'billing'
];

function perm(module: Module, overrides: Partial<ModulePermission> = {}): ModulePermission {
  return { ...NO_ACCESS, module, ...overrides };
}

function fullPerm(module: Module): ModulePermission {
  return { ...FULL, module };
}

function viewPerm(module: Module): ModulePermission {
  return { ...VIEW_ONLY, module };
}

function noPerm(module: Module): ModulePermission {
  return { ...NO_ACCESS, module };
}

// ==================== ROLE DEFAULTS ====================

export const DEFAULT_ROLE_PERMISSIONS: Record<TeamRole, ModulePermission[]> = {
  owner: ALL_MODULES.map(m => fullPerm(m)),

  admin: ALL_MODULES.map(m => fullPerm(m)),

  hr_manager: [
    viewPerm('dashboard'),
    perm('jobs', { can_view: true, can_create: true, can_edit: true, can_delete: true }),
    perm('candidates', { can_view: true, can_create: true, can_edit: true }),
    perm('assessments', { can_view: true, can_create: true, can_edit: true, can_delete: true }),
    perm('questions', { can_view: true, can_create: true, can_edit: true }),
    perm('messages', { can_view: true, can_create: true, can_edit: true }),
    viewPerm('settings'),
    viewPerm('team'),
    viewPerm('analytics'),
    noPerm('billing'),
  ],

  recruiter: [
    viewPerm('dashboard'),
    viewPerm('jobs'),
    viewPerm('candidates'),
    viewPerm('assessments'),
    viewPerm('questions'),
    perm('messages', { can_view: true, can_create: true }),
    noPerm('settings'),
    noPerm('team'),
    viewPerm('analytics'),
    noPerm('billing'),
  ],

  viewer: [
    viewPerm('dashboard'),
    viewPerm('jobs'),
    viewPerm('candidates'),
    viewPerm('assessments'),
    noPerm('questions'),
    viewPerm('messages'),
    noPerm('settings'),
    noPerm('team'),
    viewPerm('analytics'),
    noPerm('billing'),
  ],
};

// ==================== HELPER FUNCTIONS ====================

export function getDefaultPermissions(role: TeamRole): ModulePermission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.viewer;
}

export function hasPermission(
  permissions: ModulePermission[],
  module: Module,
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
): boolean {
  const modulePermission = permissions.find(p => p.module === module);
  if (!modulePermission) return false;

  switch (action) {
    case 'view': return modulePermission.can_view;
    case 'create': return modulePermission.can_create;
    case 'edit': return modulePermission.can_edit;
    case 'delete': return modulePermission.can_delete;
    case 'manage': return modulePermission.can_manage;
    default: return false;
  }
}

export function mergePermissions(
  defaultPerms: ModulePermission[],
  customPerms?: ModulePermission[]
): ModulePermission[] {
  if (!customPerms || customPerms.length === 0) return defaultPerms;

  return defaultPerms.map(defaultPerm => {
    const customPerm = customPerms.find(p => p.module === defaultPerm.module);
    return customPerm || defaultPerm;
  });
}

export function isRoleHigherOrEqual(role1: TeamRole, role2: TeamRole): boolean {
  const hierarchy: Record<TeamRole, number> = {
    owner: 5,
    admin: 4,
    hr_manager: 3,
    recruiter: 2,
    viewer: 1,
  };
  return hierarchy[role1] >= hierarchy[role2];
}

export function canManageRole(managerRole: TeamRole, targetRole: TeamRole): boolean {
  if (targetRole === 'owner') return false;
  return isRoleHigherOrEqual(managerRole, targetRole) && managerRole !== 'viewer' && managerRole !== 'recruiter';
}

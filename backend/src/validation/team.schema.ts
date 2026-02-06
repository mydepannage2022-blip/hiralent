import { z } from 'zod';

// ==================== ENUMS ====================

const teamRoleEnum = z.enum(['owner', 'admin', 'hr_manager', 'recruiter', 'viewer']);
const moduleEnum = z.enum([
  'dashboard', 'jobs', 'candidates', 'assessments',
  'questions', 'messages', 'settings', 'team', 'analytics', 'billing'
]);

// ==================== PERMISSION SCHEMA ====================

const modulePermissionSchema = z.object({
  module: moduleEnum,
  can_view: z.boolean().default(false),
  can_create: z.boolean().default(false),
  can_edit: z.boolean().default(false),
  can_delete: z.boolean().default(false),
  can_manage: z.boolean().default(false),
});

// ==================== INVITE SCHEMA ====================

export const inviteTeamMemberSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),

  role: teamRoleEnum
    .refine(val => val !== 'owner', {
      message: 'Cannot invite someone as owner'
    }),

  job_title: z
    .string()
    .max(100, 'Job title must be less than 100 characters')
    .trim()
    .optional(),

  department: z
    .string()
    .max(100, 'Department must be less than 100 characters')
    .trim()
    .optional(),

  custom_permissions: z
    .array(modulePermissionSchema)
    .optional(),
});

// ==================== ACCEPT INVITATION SCHEMA ====================

export const acceptInvitationSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),

  phone_number: z
    .string()
    .regex(/^[\+]?[0-9\-\(\)\s]+$/, 'Invalid phone number')
    .optional(),
});

// ==================== UPDATE MEMBER SCHEMA ====================

export const updateTeamMemberSchema = z.object({
  role: teamRoleEnum
    .refine(val => val !== 'owner', {
      message: 'Cannot change role to owner'
    })
    .optional(),

  job_title: z
    .string()
    .max(100, 'Job title must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  department: z
    .string()
    .max(100, 'Department must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  is_active: z.boolean().optional(),
});

// ==================== UPDATE PERMISSIONS SCHEMA ====================

export const updateMemberPermissionsSchema = z.object({
  permissions: z
    .array(modulePermissionSchema)
    .min(1, 'At least one permission must be provided')
    .max(10, 'Too many permissions'),
});

// ==================== TRANSFER OWNERSHIP SCHEMA ====================

export const transferOwnershipSchema = z.object({
  new_owner_id: z
    .string()
    .uuid('Invalid user ID'),
});

// ==================== QUERY SCHEMAS ====================

export const teamListQuerySchema = z.object({
  include_inactive: z
    .string()
    .transform(val => val === 'true')
    .optional()
    .default('false'),

  role: teamRoleEnum.optional(),

  search: z
    .string()
    .max(100)
    .optional(),
});

export const activityLogQuerySchema = z.object({
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional()
    .default('1'),

  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default('20'),

  member_id: z
    .string()
    .uuid()
    .optional(),

  action_category: z
    .string()
    .optional(),

  start_date: z
    .string()
    .datetime()
    .optional(),

  end_date: z
    .string()
    .datetime()
    .optional(),
});

// ==================== TYPE EXPORTS ====================

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type UpdateMemberPermissionsInput = z.infer<typeof updateMemberPermissionsSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type TeamListQueryInput = z.infer<typeof teamListQuerySchema>;
export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;

import { CompanyTeamRole, CompanyModule, InvitationStatus } from '@prisma/client';

// ==================== TYPE ALIASES ====================

export type TeamRole = 'owner' | 'admin' | 'hr_manager' | 'recruiter' | 'viewer';
export type Module = 'dashboard' | 'jobs' | 'candidates' | 'assessments' | 'questions' | 'messages' | 'settings' | 'team' | 'analytics' | 'billing';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

// ==================== PERMISSION ====================

export interface ModulePermission {
  module: Module;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

// ==================== REQUEST DTOs ====================

export interface InviteTeamMemberRequest {
  email: string;
  role: TeamRole;
  job_title?: string;
  department?: string;
  custom_permissions?: ModulePermission[];
}

export interface AcceptInvitationRequest {
  full_name: string;
  password: string;
  phone_number?: string;
}

export interface UpdateTeamMemberRequest {
  role?: TeamRole;
  job_title?: string;
  department?: string;
  is_active?: boolean;
}

export interface UpdateMemberPermissionsRequest {
  permissions: ModulePermission[];
}

export interface TransferOwnershipRequest {
  new_owner_id: string;
}

// ==================== RESPONSE DTOs ====================

export interface TeamMemberResponse {
  member_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: TeamRole;
  job_title: string | null;
  department: string | null;
  is_active: boolean;
  joined_at: Date;
  last_login_at: Date | null;
  permissions: ModulePermission[];
  activity_summary?: ActivitySummary;
}

export interface TeamInvitationResponse {
  invitation_id: string;
  email: string;
  role: TeamRole;
  job_title: string | null;
  department: string | null;
  status: InviteStatus;
  invited_by: {
    user_id: string;
    full_name: string;
  };
  expires_at: Date;
  created_at: Date;
  invitation_token?: string;
}

export interface TeamListResponse {
  members: TeamMemberResponse[];
  invitations: TeamInvitationResponse[];
  total_members: number;
  total_pending_invitations: number;
  seats_used: number;
  seats_limit: number | null;
}

export interface ActivitySummary {
  total_actions: number;
  jobs_posted: number;
  candidates_reviewed: number;
  messages_sent: number;
  last_active: Date | null;
}

export interface ActivityLogEntry {
  log_id: string;
  action: string;
  action_category: string;
  resource_type: string | null;
  resource_name: string | null;
  details: Record<string, any> | null;
  created_at: Date;
  actor: {
    user_id: string;
    full_name: string;
    role: TeamRole;
  };
}

export interface ActivityLogResponse {
  logs: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ==================== INTERNAL TYPES ====================

export interface PermissionCheckResult {
  has_permission: boolean;
  member_id: string | null;
  role: TeamRole | null;
  is_owner: boolean;
}

export interface ActivityLogData {
  action_category: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, any>;
}

export interface CompanyContext {
  company_id: string;
  member_id: string | null;
  role: TeamRole | null;
  is_owner: boolean;
}

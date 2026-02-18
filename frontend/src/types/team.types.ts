// ==================== ENUMS ====================

export type TeamRole = 'owner' | 'admin' | 'hr_manager' | 'recruiter' | 'viewer';
export type Module = 'dashboard' | 'jobs' | 'candidates' | 'assessments' | 'questions' | 'messages' | 'settings' | 'team' | 'analytics' | 'billing';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

// ==================== PERMISSION ====================

export interface ModulePermission {
  module: Module;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

// ==================== TEAM MEMBER ====================

export interface TeamMember {
  member_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: TeamRole;
  job_title: string | null;
  department: string | null;
  is_active: boolean;
  joined_at: string;
  last_login_at: string | null;
  permissions: ModulePermission[];
  activity_summary?: ActivitySummary;
}

// ==================== INVITATION ====================

export interface TeamInvitation {
  invitation_id: string;
  email: string;
  role: TeamRole;
  job_title: string | null;
  department: string | null;
  status: InvitationStatus;
  invited_by: {
    user_id: string;
    full_name: string;
  };
  expires_at: string;
  created_at: string;
}

export interface InvitationDetails extends TeamInvitation {
  company_name: string;
  existing_user?: boolean;
}

// ==================== RESPONSES ====================

export interface TeamListResponse {
  members: TeamMember[];
  invitations: TeamInvitation[];
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
  last_active: string | null;
}

export interface ActivityLogEntry {
  log_id: string;
  action: string;
  action_category: string;
  resource_type: string | null;
  resource_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
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

export interface MyPermissionsResponse {
  role: TeamRole;
  is_owner: boolean;
  permissions: ModulePermission[];
  company_id: string;
}

// ==================== REQUEST PAYLOADS ====================

export interface InviteTeamMemberPayload {
  email: string;
  role: TeamRole;
  job_title?: string;
  department?: string;
  custom_permissions?: ModulePermission[];
}

export interface UpdateTeamMemberPayload {
  role?: TeamRole;
  job_title?: string | null;
  department?: string | null;
  is_active?: boolean;
}

export interface UpdatePermissionsPayload {
  permissions: ModulePermission[];
}

export interface AcceptInvitationPayload {
  full_name: string;
  password: string;
  phone_number?: string;
}

export interface TransferOwnershipPayload {
  new_owner_id: string;
}

// ==================== QUERY PARAMS ====================

export interface TeamListParams {
  search?: string;
  role?: TeamRole;
  include_inactive?: boolean;
}

export interface ActivityLogParams {
  page?: number;
  limit?: number;
  member_id?: string;
  action_category?: string;
  start_date?: string;
  end_date?: string;
}

// ==================== UI HELPERS ====================

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  hr_manager: 'HR Manager',
  recruiter: 'Recruiter',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  hr_manager: 'bg-green-100 text-green-800',
  recruiter: 'bg-yellow-100 text-yellow-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  candidates: 'Candidates',
  assessments: 'Assessments',
  questions: 'Questions',
  messages: 'Messages',
  settings: 'Settings',
  team: 'Team',
  analytics: 'Analytics',
  billing: 'Billing',
};

"use client";

import type {
  TeamListResponse,
  TeamMember,
  TeamInvitation,
  InvitationDetails,
  ModulePermission,
  MyPermissionsResponse,
  ActivityLogResponse,
  InviteTeamMemberPayload,
  UpdateTeamMemberPayload,
  UpdatePermissionsPayload,
  AcceptInvitationPayload,
  TransferOwnershipPayload,
  TeamListParams,
  ActivityLogParams,
} from "@/src/types/team.types";

// ==================== HELPERS ====================

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("authToken") || "";
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

async function apiPost<T>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiPatch<T>(path: string, body: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

async function apiPut<T>(path: string, body: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

// ==================== INVITATIONS ====================

export async function inviteTeamMember(
  data: InviteTeamMemberPayload
): Promise<{ success: boolean; invitation: TeamInvitation }> {
  return apiPost("/api/v1/company/team/invitations", data);
}

export async function resendInvitation(
  invitationId: string
): Promise<{ success: boolean; invitation: TeamInvitation }> {
  return apiPost(`/api/v1/company/team/invitations/${invitationId}/resend`);
}

export async function cancelInvitation(
  invitationId: string
): Promise<{ success: boolean }> {
  return apiDelete(`/api/v1/company/team/invitations/${invitationId}`);
}

export async function getInvitationDetails(
  token: string
): Promise<{ success: boolean; invitation: InvitationDetails }> {
  // Public route - no auth needed
  const res = await fetch(
    `${BASE}/api/v1/company/team/invitations/verify/${token}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function acceptInvitation(
  token: string,
  data: AcceptInvitationPayload
): Promise<{ success: boolean; user: any; member: TeamMember }> {
  // Public route - no auth needed
  const res = await fetch(
    `${BASE}/api/v1/company/team/invitations/accept/${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ==================== TEAM MEMBERS ====================

export async function getTeamList(
  params?: TeamListParams
): Promise<TeamListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.role) qs.set("role", params.role);
  if (params?.include_inactive) qs.set("include_inactive", "true");

  const query = qs.toString();
  const path = `/api/v1/company/team${query ? `?${query}` : ""}`;

  const raw = await apiGet<any>(path);

  return {
    members: raw.members || [],
    invitations: raw.invitations || [],
    total_members: raw.total_members || 0,
    total_pending_invitations: raw.total_pending_invitations || 0,
    seats_used: raw.seats_used || 0,
    seats_limit: raw.seats_limit ?? null,
  };
}

export async function getTeamMember(
  memberId: string
): Promise<TeamMember> {
  const raw = await apiGet<any>(`/api/v1/company/team/members/${memberId}`);
  return raw.member;
}

export async function updateTeamMember(
  memberId: string,
  data: UpdateTeamMemberPayload
): Promise<TeamMember> {
  const raw = await apiPatch<any>(
    `/api/v1/company/team/members/${memberId}`,
    data
  );
  return raw.member;
}

export async function removeTeamMember(
  memberId: string
): Promise<{ success: boolean }> {
  return apiDelete(`/api/v1/company/team/members/${memberId}`);
}

export async function transferOwnership(
  data: TransferOwnershipPayload
): Promise<{ success: boolean }> {
  return apiPost("/api/v1/company/team/transfer-ownership", data);
}

// ==================== PERMISSIONS ====================

export async function getMemberPermissions(
  memberId: string
): Promise<ModulePermission[]> {
  const raw = await apiGet<any>(
    `/api/v1/company/team/members/${memberId}/permissions`
  );
  return raw.permissions;
}

export async function updateMemberPermissions(
  memberId: string,
  data: UpdatePermissionsPayload
): Promise<ModulePermission[]> {
  const raw = await apiPut<any>(
    `/api/v1/company/team/members/${memberId}/permissions`,
    data
  );
  return raw.permissions;
}

export async function getMyPermissions(): Promise<MyPermissionsResponse> {
  const raw = await apiGet<any>("/api/v1/company/team/my-permissions");
  return {
    role: raw.role,
    is_owner: raw.is_owner,
    permissions: raw.permissions,
    company_id: raw.company_id,
  };
}

// ==================== ACTIVITY ====================

export async function getActivityLogs(
  params?: ActivityLogParams
): Promise<ActivityLogResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.member_id) qs.set("member_id", params.member_id);
  if (params?.action_category) qs.set("action_category", params.action_category);
  if (params?.start_date) qs.set("start_date", params.start_date);
  if (params?.end_date) qs.set("end_date", params.end_date);

  const query = qs.toString();
  const path = `/api/v1/company/team/activity${query ? `?${query}` : ""}`;

  return apiGet<ActivityLogResponse>(path);
}

export async function getMemberActivity(
  memberId: string,
  params?: ActivityLogParams
): Promise<ActivityLogResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  const path = `/api/v1/company/team/members/${memberId}/activity${query ? `?${query}` : ""}`;

  return apiGet<ActivityLogResponse>(path);
}

export async function getActivitySummary(): Promise<any> {
  return apiGet("/api/v1/company/team/activity/summary");
}

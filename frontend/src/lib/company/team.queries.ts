"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeamList,
  getTeamMember,
  inviteTeamMember,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
  updateTeamMember,
  removeTeamMember,
  transferOwnership,
  getMemberPermissions,
  updateMemberPermissions,
  getMyPermissions,
  getActivityLogs,
  getMemberActivity,
  getActivitySummary,
  getInvitationDetails,
} from "./team.api";

import type {
  TeamListResponse,
  TeamMember,
  TeamListParams,
  ActivityLogParams,
  ActivityLogResponse,
  ModulePermission,
  MyPermissionsResponse,
  InviteTeamMemberPayload,
  UpdateTeamMemberPayload,
  UpdatePermissionsPayload,
  AcceptInvitationPayload,
  TransferOwnershipPayload,
  InvitationDetails,
} from "@/src/types/team.types";

// ==================== QUERY KEYS ====================

export const teamKeys = {
  all: ["company-team"] as const,
  list: (params?: TeamListParams) => [...teamKeys.all, "list", params] as const,
  member: (id: string) => [...teamKeys.all, "member", id] as const,
  permissions: (id: string) => [...teamKeys.all, "permissions", id] as const,
  myPermissions: () => [...teamKeys.all, "my-permissions"] as const,
  activity: (params?: ActivityLogParams) => [...teamKeys.all, "activity", params] as const,
  memberActivity: (id: string, params?: ActivityLogParams) => [...teamKeys.all, "member-activity", id, params] as const,
  activitySummary: () => [...teamKeys.all, "activity-summary"] as const,
  invitation: (token: string) => [...teamKeys.all, "invitation", token] as const,
};

// ==================== QUERIES ====================

export function useTeamList(params?: TeamListParams) {
  return useQuery<TeamListResponse>({
    queryKey: teamKeys.list(params),
    queryFn: () => getTeamList(params),
  });
}

export function useTeamMember(memberId: string) {
  return useQuery<TeamMember>({
    queryKey: teamKeys.member(memberId),
    queryFn: () => getTeamMember(memberId),
    enabled: !!memberId,
  });
}

export function useMemberPermissions(memberId: string) {
  return useQuery<ModulePermission[]>({
    queryKey: teamKeys.permissions(memberId),
    queryFn: () => getMemberPermissions(memberId),
    enabled: !!memberId,
  });
}

export function useMyPermissions() {
  return useQuery<MyPermissionsResponse>({
    queryKey: teamKeys.myPermissions(),
    queryFn: getMyPermissions,
  });
}

export function useActivityLogs(params?: ActivityLogParams) {
  return useQuery<ActivityLogResponse>({
    queryKey: teamKeys.activity(params),
    queryFn: () => getActivityLogs(params),
  });
}

export function useMemberActivity(memberId: string, params?: ActivityLogParams) {
  return useQuery<ActivityLogResponse>({
    queryKey: teamKeys.memberActivity(memberId, params),
    queryFn: () => getMemberActivity(memberId, params),
    enabled: !!memberId,
  });
}

export function useActivitySummary() {
  return useQuery({
    queryKey: teamKeys.activitySummary(),
    queryFn: getActivitySummary,
  });
}

export function useInvitationDetails(token: string) {
  return useQuery<{ success: boolean; invitation: InvitationDetails }>({
    queryKey: teamKeys.invitation(token),
    queryFn: () => getInvitationDetails(token),
    enabled: !!token,
    retry: false,
  });
}

// ==================== MUTATIONS ====================

export function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteTeamMemberPayload) => inviteTeamMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, data }: { token: string; data: AcceptInvitationPayload }) =>
      acceptInvitation(token, data),
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateTeamMemberPayload }) =>
      updateTeamMember(memberId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.member(variables.memberId) });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeTeamMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdatePermissionsPayload }) =>
      updateMemberPermissions(memberId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.permissions(variables.memberId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.member(variables.memberId) });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferOwnershipPayload) => transferOwnership(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

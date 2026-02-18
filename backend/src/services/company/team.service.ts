import prisma from '../../lib/prisma';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  TeamRole,
  Module,
  ModulePermission,
  TeamMemberResponse,
  TeamInvitationResponse,
  TeamListResponse,
  ActivityLogEntry,
  ActivityLogResponse,
  ActivitySummary,
  ActivityLogData,
  PermissionCheckResult,
  InviteTeamMemberRequest,
  AcceptInvitationRequest,
  UpdateTeamMemberRequest,
  UpdateMemberPermissionsRequest,
} from '../../types/team.types';
import {
  getDefaultPermissions,
  mergePermissions,
  canManageRole,
} from '../../utils/team-permission.util';
import type {
  TeamListQueryInput,
  ActivityLogQueryInput,
} from '../../validation/team.schema';

// ==================== HELPERS ====================

export async function getCompanyIdForUser(userId: string): Promise<string | null> {
  // Check if user is company owner
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { company_id: userId },
  });
  if (companyProfile) return userId;

  // Check if user is team member
  const membership = await prisma.companyTeamMember.findFirst({
    where: { user_id: userId, is_active: true },
    select: { company_id: true },
  });

  return membership?.company_id || null;
}

export async function isCompanyOwner(userId: string, companyId: string): Promise<boolean> {
  const profile = await prisma.companyProfile.findUnique({
    where: { company_id: companyId },
  });
  return profile?.company_id === userId;
}

export async function canManageTeam(userId: string, companyId: string): Promise<boolean> {
  // Owner can always manage
  if (await isCompanyOwner(userId, companyId)) return true;

  // Check member role
  const member = await prisma.companyTeamMember.findFirst({
    where: { user_id: userId, company_id: companyId, is_active: true },
    include: { permissions: true },
  });

  if (!member) return false;

  const teamPerm = member.permissions.find(p => p.module === 'team');
  return teamPerm?.can_manage || false;
}

// ==================== INVITATION FUNCTIONS ====================

export async function inviteTeamMember(
  companyId: string,
  inviterId: string,
  data: InviteTeamMemberRequest
): Promise<TeamInvitationResponse> {
  // Check if email already exists as a user
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    // Check if already a member of this company
    const existingMember = await prisma.companyTeamMember.findUnique({
      where: {
        company_id_user_id: {
          company_id: companyId,
          user_id: existingUser.user_id,
        },
      },
    });

    if (existingMember) {
      throw new Error('This user is already a team member');
    }
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.companyTeamInvitation.findFirst({
    where: {
      company_id: companyId,
      email: data.email,
      status: 'pending',
    },
  });

  if (existingInvite) {
    throw new Error('A pending invitation already exists for this email');
  }

  // Generate secure token
  const token = uuidv4();
  const tokenHash = await bcrypt.hash(token, 10);

  // Create invitation
  const invitation = await prisma.companyTeamInvitation.create({
    data: {
      company_id: companyId,
      email: data.email,
      role: data.role as any,
      job_title: data.job_title,
      department: data.department,
      token: token,
      token_hash: tokenHash,
      status: 'pending',
      invited_by: inviterId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      custom_permissions: data.custom_permissions ? JSON.parse(JSON.stringify(data.custom_permissions)) : undefined,
    },
    include: {
      inviter: {
        select: { user_id: true, full_name: true },
      },
    },
  });

  // Log activity
  await logActivity(companyId, inviterId, 'invited_member', {
    action_category: 'team',
    resource_type: 'Invitation',
    resource_id: invitation.invitation_id,
    resource_name: data.email,
    details: { role: data.role, email: data.email },
  });

  return {
    invitation_id: invitation.invitation_id,
    invitation_token: token,
    email: invitation.email,
    role: invitation.role as TeamRole,
    job_title: invitation.job_title,
    department: invitation.department,
    status: invitation.status as any,
    invited_by: {
      user_id: invitation.inviter.user_id,
      full_name: invitation.inviter.full_name,
    },
    expires_at: invitation.expires_at,
    created_at: invitation.created_at,
  };
}

export async function resendInvitation(
  companyId: string,
  invitationId: string
): Promise<TeamInvitationResponse> {
  const invitation = await prisma.companyTeamInvitation.findFirst({
    where: {
      invitation_id: invitationId,
      company_id: companyId,
      status: 'pending',
    },
    include: {
      inviter: {
        select: { user_id: true, full_name: true },
      },
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found or already processed');
  }

  // Generate new token
  const newToken = uuidv4();
  const newTokenHash = await bcrypt.hash(newToken, 10);

  const updated = await prisma.companyTeamInvitation.update({
    where: { invitation_id: invitationId },
    data: {
      token: newToken,
      token_hash: newTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: {
      inviter: {
        select: { user_id: true, full_name: true },
      },
    },
  });
return {
    invitation_id: updated.invitation_id,
    invitation_token: newToken,
    email: updated.email,
    role: updated.role as TeamRole,
    job_title: updated.job_title,
    department: updated.department,
    status: updated.status as any,
    invited_by: {
      user_id: updated.inviter.user_id,
      full_name: updated.inviter.full_name,
    },
    expires_at: updated.expires_at,
    created_at: updated.created_at,
  };
}

export async function cancelInvitation(
  companyId: string,
  invitationId: string,
  cancelledBy: string
): Promise<void> {
  const invitation = await prisma.companyTeamInvitation.findFirst({
    where: {
      invitation_id: invitationId,
      company_id: companyId,
      status: 'pending',
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found or already processed');
  }

  await prisma.companyTeamInvitation.update({
    where: { invitation_id: invitationId },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
    },
  });

  await logActivity(companyId, cancelledBy, 'cancelled_invitation', {
    action_category: 'team',
    resource_type: 'Invitation',
    resource_id: invitationId,
    resource_name: invitation.email,
  });
}

export async function getInvitationByToken(token: string): Promise<{
  valid: boolean;
  invitation?: TeamInvitationResponse & { company_name: string };
  error?: string;
}> {
  const invitation = await prisma.companyTeamInvitation.findFirst({
    where: { token },
    include: {
      inviter: {
        select: { user_id: true, full_name: true },
      },
      company: {
        select: {
          user_id: true,
          full_name: true,
          companyProfile: {
            select: { company_name: true },
          },
        },
      },
    },
  });

  if (!invitation) {
    return { valid: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { valid: false, error: `Invitation already ${invitation.status}` };
  }

  if (new Date() > invitation.expires_at) {
    // Mark as expired
    await prisma.companyTeamInvitation.update({
      where: { invitation_id: invitation.invitation_id },
      data: { status: 'expired' },
    });
    return { valid: false, error: 'Invitation has expired' };
  }

  return {
    valid: true,
    invitation: {
      invitation_id: invitation.invitation_id,
      email: invitation.email,
      role: invitation.role as TeamRole,
      job_title: invitation.job_title,
      department: invitation.department,
      status: invitation.status as any,
      invited_by: {
        user_id: invitation.inviter.user_id,
        full_name: invitation.inviter.full_name,
      },
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      company_name: invitation.company?.companyProfile?.company_name || invitation.company.full_name,
    },
  };
}

export async function acceptInvitation(
  token: string,
  userData: AcceptInvitationRequest
): Promise<{ user: any; member: TeamMemberResponse }> {
  // Validate token
  const validation = await getInvitationByToken(token);

  if (!validation.valid || !validation.invitation) {
    throw new Error(validation.error || 'Invalid invitation');
  }

  const invitation = await prisma.companyTeamInvitation.findFirst({
    where: { token, status: 'pending' },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(userData.password, 10);

  // Get default permissions for role
  const defaultPerms = getDefaultPermissions(invitation.role as TeamRole);
  const customPerms = invitation.custom_permissions as unknown as ModulePermission[] | null;
  const finalPerms = mergePermissions(defaultPerms, customPerms || undefined);

  // Transaction: create user + team member + permissions + update invitation
  const result = await prisma.$transaction(async (tx) => {
    // Check if user already exists
    let user = await tx.user.findUnique({
      where: { email: invitation.email },
    });

    if (user) {
      // User exists - just add as team member
      // Update role to company_member if currently something else
    } else {
      // Create new user
      user = await tx.user.create({
        data: {
          email: invitation.email,
          password_hash: passwordHash,
          full_name: userData.full_name,
          role: 'company_member',
          is_email_verified: true, // Verified via invitation
          phone_number: userData.phone_number,
          company_role: invitation.job_title,
        },
      });
    }

    // Create team member
    const member = await tx.companyTeamMember.create({
      data: {
        company_id: invitation.company_id,
        user_id: user.user_id,
        role: invitation.role,
        job_title: invitation.job_title,
        department: invitation.department,
        invited_by: invitation.invited_by,
      },
    });

    // Create permissions
    await tx.companyMemberPermission.createMany({
      data: finalPerms.map(p => ({
        member_id: member.member_id,
        module: p.module as any,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_manage: p.can_manage,
      })),
    });

    // Update invitation status
    await tx.companyTeamInvitation.update({
      where: { invitation_id: invitation.invitation_id },
      data: {
        status: 'accepted',
        accepted_at: new Date(),
      },
    });

    // Get member with permissions
    const memberWithPerms = await tx.companyTeamMember.findUnique({
      where: { member_id: member.member_id },
      include: {
        permissions: true,
        user: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
            last_login_at: true,
          },
        },
      },
    });

    return { user, member: memberWithPerms! };
  });

  // Log activity
  await logActivity(invitation.company_id, result.user.user_id, 'member_joined', {
    action_category: 'team',
    resource_type: 'TeamMember',
    resource_id: result.member.member_id,
    resource_name: result.user.full_name,
    details: { role: invitation.role },
  });

  return {
    user: {
      user_id: result.user.user_id,
      email: result.user.email,
      full_name: result.user.full_name,
      role: result.user.role,
    },
    member: formatMemberResponse(result.member),
  };
}

// ==================== TEAM MEMBER FUNCTIONS ====================

export async function getTeamList(
  companyId: string,
  query: TeamListQueryInput
): Promise<TeamListResponse> {
  const whereClause: any = { company_id: companyId };

  if (!query.include_inactive) {
    whereClause.is_active = true;
  }

  if (query.role) {
    whereClause.role = query.role;
  }

  if (query.search) {
    whereClause.user = {
      OR: [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ],
    };
  }

  const [members, invitations, totalMembers] = await Promise.all([
    prisma.companyTeamMember.findMany({
      where: whereClause,
      include: {
        permissions: true,
        user: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
            last_login_at: true,
          },
        },
      },
      orderBy: { joined_at: 'asc' },
    }),

    prisma.companyTeamInvitation.findMany({
      where: {
        company_id: companyId,
        status: 'pending',
      },
      include: {
        inviter: {
          select: { user_id: true, full_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    }),

    prisma.companyTeamMember.count({
      where: { company_id: companyId, is_active: true },
    }),
  ]);

  // Get owner info
  const owner = await prisma.user.findUnique({
    where: { user_id: companyId },
    select: {
      user_id: true,
      email: true,
      full_name: true,
      last_login_at: true,
    },
  });

  // Format owner as first member
  const ownerMember: TeamMemberResponse = {
    member_id: 'owner',
    user_id: companyId,
    email: owner?.email || '',
    full_name: owner?.full_name || '',
    role: 'owner',
    job_title: 'Owner',
    department: null,
    is_active: true,
    joined_at: new Date(),
    last_login_at: owner?.last_login_at || null,
    permissions: getDefaultPermissions('owner'),
  };

  const formattedMembers = [ownerMember, ...members.map(formatMemberResponse)];

  const formattedInvitations: TeamInvitationResponse[] = invitations.map(inv => ({
    invitation_id: inv.invitation_id,
    email: inv.email,
    role: inv.role as TeamRole,
    job_title: inv.job_title,
    department: inv.department,
    status: inv.status as any,
    invited_by: {
      user_id: inv.inviter.user_id,
      full_name: inv.inviter.full_name,
    },
    expires_at: inv.expires_at,
    created_at: inv.created_at,
  }));

  return {
    members: formattedMembers,
    invitations: formattedInvitations,
    total_members: totalMembers + 1, // +1 for owner
    total_pending_invitations: formattedInvitations.length,
    seats_used: totalMembers + 1,
    seats_limit: null,
  };
}

export async function getTeamMember(
  companyId: string,
  memberId: string
): Promise<TeamMemberResponse> {
  const member = await prisma.companyTeamMember.findFirst({
    where: {
      member_id: memberId,
      company_id: companyId,
    },
    include: {
      permissions: true,
      user: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
          last_login_at: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  return formatMemberResponse(member);
}

export async function updateTeamMember(
  companyId: string,
  memberId: string,
  data: UpdateTeamMemberRequest,
  updatedBy: string
): Promise<TeamMemberResponse> {
  const member = await prisma.companyTeamMember.findFirst({
    where: {
      member_id: memberId,
      company_id: companyId,
    },
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  // Cannot change owner's role
  if (member.role === 'owner') {
    throw new Error('Cannot modify the owner');
  }

  const updated = await prisma.companyTeamMember.update({
    where: { member_id: memberId },
    data: {
      role: data.role as any,
      job_title: data.job_title,
      department: data.department,
      is_active: data.is_active,
    },
    include: {
      permissions: true,
      user: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
          last_login_at: true,
        },
      },
    },
  });

  // If role changed, update permissions to new role defaults
  if (data.role && data.role !== member.role) {
    const newPerms = getDefaultPermissions(data.role);

    // Delete old permissions
    await prisma.companyMemberPermission.deleteMany({
      where: { member_id: memberId },
    });

    // Create new permissions
    await prisma.companyMemberPermission.createMany({
      data: newPerms.map(p => ({
        member_id: memberId,
        module: p.module as any,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_manage: p.can_manage,
      })),
    });
  }

  await logActivity(companyId, updatedBy, 'updated_member', {
    action_category: 'team',
    resource_type: 'TeamMember',
    resource_id: memberId,
    resource_name: updated.user.full_name,
    details: { changes: data },
  });

  // Re-fetch with updated permissions
  const refreshed = await prisma.companyTeamMember.findUnique({
    where: { member_id: memberId },
    include: {
      permissions: true,
      user: {
        select: {
          user_id: true,
          email: true,
          full_name: true,
          last_login_at: true,
        },
      },
    },
  });

  return formatMemberResponse(refreshed!);
}

export async function removeTeamMember(
  companyId: string,
  memberId: string,
  removedBy: string
): Promise<void> {
  const member = await prisma.companyTeamMember.findFirst({
    where: {
      member_id: memberId,
      company_id: companyId,
    },
    include: {
      user: { select: { full_name: true, email: true } },
    },
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  if (member.role === 'owner') {
    throw new Error('Cannot remove the owner');
  }

  // Soft delete - mark inactive
  await prisma.companyTeamMember.update({
    where: { member_id: memberId },
    data: { is_active: false },
  });

  await logActivity(companyId, removedBy, 'removed_member', {
    action_category: 'team',
    resource_type: 'TeamMember',
    resource_id: memberId,
    resource_name: member.user.full_name,
    details: { email: member.user.email, role: member.role },
  });
}

export async function transferOwnership(
  companyId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  // Verify current user is owner
  const isOwner = await isCompanyOwner(currentOwnerId, companyId);
  if (!isOwner) {
    throw new Error('Only the owner can transfer ownership');
  }

  // Verify new owner is an active admin member
  const newOwnerMember = await prisma.companyTeamMember.findFirst({
    where: {
      company_id: companyId,
      user_id: newOwnerId,
      is_active: true,
      role: 'admin',
    },
  });

  if (!newOwnerMember) {
    throw new Error('New owner must be an active admin team member');
  }

  await prisma.$transaction(async (tx) => {
    // Update new owner's member role
    await tx.companyTeamMember.update({
      where: { member_id: newOwnerMember.member_id },
      data: { role: 'owner' },
    });

    // Add current owner as admin member (if not already a member)
    const currentOwnerMembership = await tx.companyTeamMember.findFirst({
      where: { company_id: companyId, user_id: currentOwnerId },
    });

    if (!currentOwnerMembership) {
      await tx.companyTeamMember.create({
        data: {
          company_id: companyId,
          user_id: currentOwnerId,
          role: 'admin',
          job_title: 'Former Owner',
        },
      });
    } else {
      await tx.companyTeamMember.update({
        where: { member_id: currentOwnerMembership.member_id },
        data: { role: 'admin' },
      });
    }

    // Transfer CompanyProfile ownership
    // Note: This changes the company_id in CompanyProfile which is a big change
    // For now we keep the CompanyProfile as is, ownership is tracked via CompanyTeamMember role
  });

  await logActivity(companyId, currentOwnerId, 'transferred_ownership', {
    action_category: 'team',
    resource_type: 'Company',
    resource_id: companyId,
    details: { new_owner_id: newOwnerId },
  });
}

// ==================== PERMISSION FUNCTIONS ====================

export async function getMemberPermissions(memberId: string): Promise<ModulePermission[]> {
  const permissions = await prisma.companyMemberPermission.findMany({
    where: { member_id: memberId },
  });

  return permissions.map(p => ({
    module: p.module as Module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
    can_manage: p.can_manage,
  }));
}

export async function updateMemberPermissions(
  companyId: string,
  memberId: string,
  permissions: ModulePermission[],
  updatedBy: string
): Promise<ModulePermission[]> {
  const member = await prisma.companyTeamMember.findFirst({
    where: {
      member_id: memberId,
      company_id: companyId,
    },
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  if (member.role === 'owner') {
    throw new Error('Cannot modify owner permissions');
  }

  // Upsert each permission
  for (const perm of permissions) {
    await prisma.companyMemberPermission.upsert({
      where: {
        member_id_module: {
          member_id: memberId,
          module: perm.module as any,
        },
      },
      update: {
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
        can_manage: perm.can_manage,
      },
      create: {
        member_id: memberId,
        module: perm.module as any,
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
        can_manage: perm.can_manage,
      },
    });
  }

  await logActivity(companyId, updatedBy, 'changed_permissions', {
    action_category: 'team',
    resource_type: 'TeamMember',
    resource_id: memberId,
    details: { permissions },
  });

  return getMemberPermissions(memberId);
}

export async function checkMemberPermission(
  userId: string,
  companyId: string,
  module: Module,
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
): Promise<PermissionCheckResult> {
  // Owner has all permissions
  if (await isCompanyOwner(userId, companyId)) {
    return {
      has_permission: true,
      member_id: null,
      role: 'owner',
      is_owner: true,
    };
  }

  const member = await prisma.companyTeamMember.findFirst({
    where: {
      user_id: userId,
      company_id: companyId,
      is_active: true,
    },
    include: { permissions: true },
  });

  if (!member) {
    return {
      has_permission: false,
      member_id: null,
      role: null,
      is_owner: false,
    };
  }

  const permissions: ModulePermission[] = member.permissions.map(p => ({
    module: p.module as Module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
    can_manage: p.can_manage,
  }));

  const modulePerm = permissions.find(p => p.module === module);
  let hasPerm = false;

  if (modulePerm) {
    switch (action) {
      case 'view': hasPerm = modulePerm.can_view; break;
      case 'create': hasPerm = modulePerm.can_create; break;
      case 'edit': hasPerm = modulePerm.can_edit; break;
      case 'delete': hasPerm = modulePerm.can_delete; break;
      case 'manage': hasPerm = modulePerm.can_manage; break;
    }
  }

  return {
    has_permission: hasPerm,
    member_id: member.member_id,
    role: member.role as TeamRole,
    is_owner: false,
  };
}

export async function getMyPermissions(userId: string): Promise<{
  role: TeamRole;
  is_owner: boolean;
  permissions: ModulePermission[];
  company_id: string;
} | null> {
    // Check if owner — either has CompanyProfile or user role is company_admin
    const companyProfile = await prisma.companyProfile.findUnique({
      where: { company_id: userId },
    });

    if (companyProfile) {
      return {
        role: 'owner',
        is_owner: true,
        permissions: getDefaultPermissions('owner'),
        company_id: userId,
      };
    }

    // Fallback: check if user role is company_admin (profile not yet created)
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });

    if (user?.role === 'company_admin') {
      return {
        role: 'owner',
        is_owner: true,
        permissions: getDefaultPermissions('owner'),
        company_id: userId,
      };
    }


  // Check membership
  const member = await prisma.companyTeamMember.findFirst({
    where: { user_id: userId, is_active: true },
    include: { permissions: true },
  });

  if (!member) return null;

  return {
    role: member.role as TeamRole,
    is_owner: false,
    permissions: member.permissions.map(p => ({
      module: p.module as Module,
      can_view: p.can_view,
      can_create: p.can_create,
      can_edit: p.can_edit,
      can_delete: p.can_delete,
      can_manage: p.can_manage,
    })),
    company_id: member.company_id,
  };
}

// ==================== ACTIVITY FUNCTIONS ====================

export async function logActivity(
  companyId: string,
  userId: string,
  action: string,
  data: ActivityLogData
): Promise<void> {
  try {
    // Find member_id if exists
    const member = await prisma.companyTeamMember.findFirst({
      where: { user_id: userId, company_id: companyId },
      select: { member_id: true },
    });

    await prisma.companyActivityLog.create({
      data: {
        company_id: companyId,
        member_id: member?.member_id || null,
        user_id: userId,
        action,
        action_category: data.action_category,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        resource_name: data.resource_name,
        details: data.details ? JSON.parse(JSON.stringify(data.details)) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break main operations
  }
}

export async function getActivityLogs(
  companyId: string,
  query: ActivityLogQueryInput
): Promise<ActivityLogResponse> {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const whereClause: any = { company_id: companyId };

  if (query.member_id) {
    whereClause.member_id = query.member_id;
  }

  if (query.action_category) {
    whereClause.action_category = query.action_category;
  }

  if (query.start_date || query.end_date) {
    whereClause.created_at = {};
    if (query.start_date) whereClause.created_at.gte = new Date(query.start_date);
    if (query.end_date) whereClause.created_at.lte = new Date(query.end_date);
  }

  const [logs, total] = await Promise.all([
    prisma.companyActivityLog.findMany({
      where: whereClause,
      include: {
        actor: {
          select: { user_id: true, full_name: true },
        },
        member: {
          select: { role: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.companyActivityLog.count({ where: whereClause }),
  ]);

  return {
    logs: logs.map(log => ({
      log_id: log.log_id,
      action: log.action,
      action_category: log.action_category,
      resource_type: log.resource_type,
      resource_name: log.resource_name,
      details: log.details as Record<string, any> | null,
      created_at: log.created_at,
      actor: {
        user_id: log.actor.user_id,
        full_name: log.actor.full_name,
        role: (log.member?.role as TeamRole) || 'owner',
      },
    })),
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

export async function getMemberActivitySummary(memberId: string): Promise<ActivitySummary> {
  const [totalActions, jobsPosted, candidatesReviewed, messagesSent, lastLog] = await Promise.all([
    prisma.companyActivityLog.count({ where: { member_id: memberId } }),
    prisma.companyActivityLog.count({ where: { member_id: memberId, action: 'created_job' } }),
    prisma.companyActivityLog.count({ where: { member_id: memberId, action_category: 'candidates' } }),
    prisma.companyActivityLog.count({ where: { member_id: memberId, action: 'sent_message' } }),
    prisma.companyActivityLog.findFirst({
      where: { member_id: memberId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    }),
  ]);

  return {
    total_actions: totalActions,
    jobs_posted: jobsPosted,
    candidates_reviewed: candidatesReviewed,
    messages_sent: messagesSent,
    last_active: lastLog?.created_at || null,
  };
}

// ==================== FORMAT HELPER ====================

function formatMemberResponse(member: any): TeamMemberResponse {
  return {
    member_id: member.member_id,
    user_id: member.user_id,
    email: member.user.email,
    full_name: member.user.full_name,
    role: member.role as TeamRole,
    job_title: member.job_title,
    department: member.department,
    is_active: member.is_active,
    joined_at: member.joined_at,
    last_login_at: member.user.last_login_at,
    permissions: (member.permissions || []).map((p: any) => ({
      module: p.module as Module,
      can_view: p.can_view,
      can_create: p.can_create,
      can_edit: p.can_edit,
      can_delete: p.can_delete,
      can_manage: p.can_manage,
    })),
  };
}

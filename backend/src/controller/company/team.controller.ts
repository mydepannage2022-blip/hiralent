import { Request, Response } from 'express';
import * as teamService from '../../services/company/team.service';
import type { AuthenticatedRequest } from '../../types/session.types';
import { sendEmail } from '../../utils/email.util';
import { getFrontendUrl } from '../../config/appUrls';

// ==================== INVITATION CONTROLLERS ====================

export const inviteTeamMemberController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;
    const companyId = req.companyContext?.company_id;

    if (!userId || !companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const invitation = await teamService.inviteTeamMember(companyId, userId, req.body);

    const inviteLink = `${getFrontendUrl()}/auth/invitation/${invitation.invitation_token}`;

    await sendEmail({
      to: req.body.email,
      subject: `You're invited to join the team on HiRalent`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #005DDC;">You're Invited!</h2>
          <p style="color: #333; font-size: 14px;">
            You have been invited to join as <strong>${req.body.role?.replace('_', ' ')}</strong>.
          </p>
          <p style="color: #333; font-size: 14px;">
            Click the button below to accept your invitation:
          </p>
          <a href="${inviteLink}" 
            style="display: inline-block; background: #005DDC; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin: 16px 0;">
            Accept Invitation
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
          <p style="color: #aaa; font-size: 11px;">
            Or copy this link: ${inviteLink}
          </p>
        </div>
      `,
    });



    const { invitation_token, ...safeInvitation } = invitation;
    res.status(201).json({
      success: true,
      invitation: safeInvitation,
    });
  } catch (error: any) {
    console.error('Invite team member error:', error);
    const status = error.message.includes('already') ? 409 : 400;
    res.status(status).json({ error: true, message: error.message });
  }
};

export const resendInvitationController = async (req: Request, res: Response) => {
  try {
    const companyId = req.companyContext?.company_id;
    const invitationId = req.params.invitationId as string;


    if (!companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const invitation = await teamService.resendInvitation(companyId, invitationId);

    const resendLink = `${getFrontendUrl()}/auth/invitation/${invitation.invitation_token}`;

    await sendEmail({
      to: invitation.email,
      subject: `Reminder: You're invited to join the team on HiRalent`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #005DDC;">Invitation Reminder</h2>
          <p style="color: #333; font-size: 14px;">
            This is a reminder that you have been invited to join as <strong>${invitation.role?.replace('_', ' ')}</strong>.
          </p>
          <a href="${resendLink}" 
            style="display: inline-block; background: #005DDC; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin: 16px 0;">
            Accept Invitation
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            This invitation expires in 7 days.
          </p>
          <p style="color: #aaa; font-size: 11px;">
            Or copy this link: ${resendLink}
          </p>
        </div>
      `,
    });

    const { invitation_token, ...safeInvitation } = invitation;
    res.status(200).json({
      success: true,
      invitation: safeInvitation,
    });
  } catch (error: any) {
    console.error('Resend invitation error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const cancelInvitationController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;
    const companyId = req.companyContext?.company_id;
    const invitationId = req.params.invitationId as string;


    if (!userId || !companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    await teamService.cancelInvitation(companyId, invitationId, userId);

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error: any) {
    console.error('Cancel invitation error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const getInvitationDetailsController = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;


    const result = await teamService.getInvitationByToken(token);

    if (!result.valid) {
      return res.status(400).json({
        error: true,
        message: result.error,
      });
    }

    res.status(200).json({
      success: true,
      invitation: result.invitation,
    });
  } catch (error: any) {
    console.error('Get invitation details error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const acceptInvitationController = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;


    const result = await teamService.acceptInvitation(token, req.body);

    res.status(201).json({
      success: true,
      message: 'Invitation accepted successfully',
      user: result.user,
      member: result.member,
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    const status = error.message.includes('Invalid') || error.message.includes('expired') ? 400 : 500;
    res.status(status).json({ error: true, message: error.message });
  }
};

// ==================== TEAM MEMBER CONTROLLERS ====================

export const getTeamListController = async (req: Request, res: Response) => {
  try {
    const companyId = req.companyContext?.company_id;

    if (!companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const teamList = await teamService.getTeamList(companyId, req.query as any);

    res.status(200).json({
      success: true,
      ...teamList,
    });
  } catch (error: any) {
    console.error('Get team list error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const getTeamMemberController = async (req: Request, res: Response) => {
  try {
    const companyId = req.companyContext?.company_id;
    const memberId = req.params.memberId as string;


    if (!companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const member = await teamService.getTeamMember(companyId, memberId);

    res.status(200).json({
      success: true,
      member,
    });
  } catch (error: any) {
    console.error('Get team member error:', error);
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: true, message: error.message });
  }
};

export const updateTeamMemberController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;
    const companyId = req.companyContext?.company_id;
    const memberId = req.params.memberId as string;


    if (!userId || !companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const member = await teamService.updateTeamMember(companyId, memberId, req.body, userId);

    res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      member,
    });
  } catch (error: any) {
    console.error('Update team member error:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('Cannot') ? 403 : 400;
    res.status(status).json({ error: true, message: error.message });
  }
};

export const removeTeamMemberController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;
    const companyId = req.companyContext?.company_id;
    const memberId = req.params.memberId as string;


    if (!userId || !companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    await teamService.removeTeamMember(companyId, memberId, userId);

    res.status(200).json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error: any) {
    console.error('Remove team member error:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('Cannot') ? 403 : 400;
    res.status(status).json({ error: true, message: error.message });
  }
};

export const transferOwnershipController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;
    const companyId = req.companyContext?.company_id;

    if (!userId || !companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    // Only owner can transfer
    if (!req.companyContext?.is_owner) {
      return res.status(403).json({ error: true, message: 'Only the owner can transfer ownership' });
    }

    await teamService.transferOwnership(companyId, userId, req.body.new_owner_id);

    res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully',
    });
  } catch (error: any) {
    console.error('Transfer ownership error:', error);
    const status = error.message.includes('Only') ? 403 : 400;
    res.status(status).json({ error: true, message: error.message });
  }
};

// ==================== PERMISSION CONTROLLERS ====================

export const getMemberPermissionsController = async (req: Request, res: Response) => {
  try {
    const memberId = req.params.memberId as string;


    const permissions = await teamService.getMemberPermissions(memberId);

    res.status(200).json({
      success: true,
      permissions,
    });
  } catch (error: any) {
    console.error('Get member permissions error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const updateMemberPermissionsController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;
    const companyId = req.companyContext?.company_id;
    const memberId = req.params.memberId as string;


    if (!userId || !companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const permissions = await teamService.updateMemberPermissions(
      companyId,
      memberId,
      req.body.permissions,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      permissions,
    });
  } catch (error: any) {
    console.error('Update member permissions error:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('Cannot') ? 403 : 400;
    res.status(status).json({ error: true, message: error.message });
  }
};

export const getMyPermissionsController = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const result = await teamService.getMyPermissions(userId);

    if (!result) {
      return res.status(404).json({ error: true, message: 'No company membership found' });
    }

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get my permissions error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

// ==================== ACTIVITY CONTROLLERS ====================

export const getActivityLogsController = async (req: Request, res: Response) => {
  try {
    const companyId = req.companyContext?.company_id;

    if (!companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const logs = await teamService.getActivityLogs(companyId, req.query as any);

    res.status(200).json({
      success: true,
      ...logs,
    });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const getMemberActivityController = async (req: Request, res: Response) => {
  try {
    const companyId = req.companyContext?.company_id;
    const memberId = req.params.memberId as string;


    if (!companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const logs = await teamService.getActivityLogs(companyId, {
      ...req.query as any,
      member_id: memberId,
    });

    res.status(200).json({
      success: true,
      ...logs,
    });
  } catch (error: any) {
    console.error('Get member activity error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

export const getActivitySummaryController = async (req: Request, res: Response) => {
  try {
    const companyId = req.companyContext?.company_id;

    if (!companyId) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    // Get all members and their summaries
    const teamList = await teamService.getTeamList(companyId, {});
    const summaries = await Promise.all(
      teamList.members
        .filter(m => m.member_id !== 'owner')
        .map(async (m) => ({
          member_id: m.member_id,
          full_name: m.full_name,
          role: m.role,
          summary: await teamService.getMemberActivitySummary(m.member_id),
        }))
    );

    res.status(200).json({
      success: true,
      total_members: teamList.total_members,
      member_summaries: summaries,
    });
  } catch (error: any) {
    console.error('Get activity summary error:', error);
    res.status(400).json({ error: true, message: error.message });
  }
};

import prisma from '../lib/prisma';
import { sendEmail } from '../utils/email.util';
import {
  CreateAgencyInput,
  InviteRecruiterInput,
  AgencyAdminProfileInput,
  AuthContextResponse,
  ApproveAgencyInput
} from '../types/agencyAuth.types';
import { generateInvitationToken } from '../utils/agencyJWT.util';

// Create new agency (pending approval)
export async function createAgency(owner_user_id: string, input: CreateAgencyInput) {
  try {
    const existingAgency = await prisma.agency.findFirst({
      where: { owner_user_id }
    });

    if (existingAgency) {
      throw new Error('User already has an agency');
    }

    const agency = await prisma.agency.create({
      data: {
        name: input.name,
        website: input.website,
        billing_contact_email: input.billing_contact_email,
        owner_user_id,
        status: 'pending'
      }
    });

    await notifySuperAdminNewAgency(agency);

    return {
      agency_id: agency.agency_id,
      name: agency.name,
      status: agency.status,
      message: 'Agency created successfully. Waiting for admin approval.'
    };
  } catch (error) {
    console.error('Error creating agency:', error);
    throw error;
  }
}

// Approve agency (super admin only)
export async function approveAgency(agency_id: string, admin_id: string, input?: ApproveAgencyInput) {
  try {
    const agency = await prisma.agency.findUnique({ where: { agency_id } });
    if (!agency) throw new Error('Agency not found');
    if (agency.status !== 'pending') throw new Error('Agency is not in pending status');

    const updatedAgency = await prisma.agency.update({
      where: { agency_id },
      data: {
        status: 'active',
        approved_by: admin_id,
        approved_at: new Date(),
        approval_notes: input?.approval_notes
      }
    });

    const owner = await prisma.user.findUnique({
      where: { user_id: updatedAgency.owner_user_id },
      select: { email: true, full_name: true }
    });

    if (owner) {
      await sendApprovalEmail(owner.email, updatedAgency.name, owner.full_name);
    }

    return {
      agency_id: updatedAgency.agency_id,
      name: updatedAgency.name,
      status: updatedAgency.status,
      approved_at: updatedAgency.approved_at,
      message: 'Agency approved successfully'
    };
  } catch (error) {
    console.error('Error approving agency:', error);
    throw error;
  }
}

// Invite recruiter to agency
export async function inviteRecruiter(agency_id: string, inviter_id: string, input: InviteRecruiterInput) {
  try {
    const agency = await prisma.agency.findUnique({ where: { agency_id } });
    if (!agency || agency.status !== 'active') throw new Error('Agency not found or not active');

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const invitation = await prisma.recruiterInvitation.create({
      data: {
        agency_id,
        inviter_id,
        email: input.email,
        full_name: input.full_name,
        position: input.position,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    const token = generateInvitationToken({
      invitation_id: invitation.invitation_id,
      email: input.email,
      agency_id,
      type: 'recruiter_invite'
    });

    await sendInvitationEmail(input.email, input.full_name, agency.name, token);

    return {
      invitation_id: invitation.invitation_id,
      email: input.email,
      full_name: input.full_name,
      status: invitation.status,
      message: 'Recruiter invitation sent successfully'
    };
  } catch (error) {
    console.error('Error inviting recruiter:', error);
    throw error;
  }
}

// Create or update agency admin profile
export async function createAdminProfile(admin_id: string, input: AgencyAdminProfileInput) {
  try {
    const profile = await prisma.agencyAdminProfile.upsert({
      where: { admin_id },
      update: { ...input },
      create: {
        admin_id,
        ...input
      }
    });

    return {
      ...profile,
      message: 'Admin profile updated successfully'
    };
  } catch (error) {
    console.error('Error updating admin profile:', error);
    throw error;
  }
}

// Get auth context (user + agency info)
export async function getAuthContext(user_id: string): Promise<AuthContextResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id },
      include: {
        agency: true,
        agencyAdminProfile: true
      }
    });

    if (!user) throw new Error('User not found');

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        is_email_verified: user.is_email_verified,
        full_name: user.full_name,
        phone_number: user.phone_number ?? null,
        position: user.agencyAdminProfile?.position ?? null,
        linkedin_url: user.agencyAdminProfile?.linkedin_url ?? null,
        company_role: user.agencyAdminProfile?.company_role ?? null,
        branding_notes: user.agencyAdminProfile?.branding_notes ?? null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at ?? null
      },
      agency: user.agency
        ? {
            agency_id: user.agency.agency_id,
            name: user.agency.name,
            website: user.agency.website ?? null,
            billing_contact_email: user.agency.billing_contact_email,
            logo_url: user.agency.logo_url ?? null,
            status: user.agency.status,
            created_at: user.agency.created_at,
            updated_at: user.agency.updated_at
          }
        : null
    };
  } catch (error) {
    console.error('Error getting auth context:', error);
    throw error;
  }
}

// Notify all super admins of new agency
async function notifySuperAdminNewAgency(agency: {
  name: string;
  website?: string | null;
  billing_contact_email: string;
}) {
  const superAdmins = await prisma.user.findMany({
    where: { role: 'super_admin' },
    select: { email: true }
  });

  const emailContent = `
    <h2>New Agency Registration</h2>
    <p>A new agency requires approval:</p>
    <ul>
      <li><strong>Name:</strong> ${agency.name}</li>
      <li><strong>Website:</strong> ${agency.website || 'N/A'}</li>
      <li><strong>Billing Email:</strong> ${agency.billing_contact_email}</li>
    </ul>
  `;

  await Promise.all(
    superAdmins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: 'New Agency Requires Approval',
        html: emailContent
      })
    )
  );
}

// Send approval email to agency owner
async function sendApprovalEmail(email: string, agencyName: string, userName: string) {
  await sendEmail({
    to: email,
    subject: 'Your Agency is Approved',
    html: `
      <h2>Welcome!</h2>
      <p>Dear ${userName}, your agency <strong>${agencyName}</strong> is now approved.</p>
      <p>You can now invite recruiters and start posting jobs.</p>
    `
  });
}

// Send recruiter invitation email
async function sendInvitationEmail(email: string, fullName: string, agencyName: string, token: string) {
  const url = `${process.env.FRONTEND_URL}/recruiter/accept-invitation?token=${token}`;
  await sendEmail({
    to: email,
    subject: `Join ${agencyName} as Recruiter`,
    html: `
      <p>Hi ${fullName},</p>
      <p>You’re invited to join <strong>${agencyName}</strong> as a recruiter.</p>
      <a href="${url}">Accept Invitation</a>
    `
  });
}

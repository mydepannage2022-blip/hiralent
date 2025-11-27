import { generateTokenWithSession } from "../../utils/jwt.util";
import { createSession } from "./session.service";
import { getClientIP } from "../../utils/locationDetector.util";
import { v4 as uuidv4 } from 'uuid';
import prisma from "../../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../utils/email.util";
import { generateToken } from "../../utils/jwt.util";
import { getWelcomeEmailTemplate, getLegacyCheckEmailTemplate } from "../emailTemplates.service";
import fs from 'fs/promises';
import path from 'path';
import {
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  UserWithProfiles, 
  CleanUser,
  LoginResponse,
} from "../../types/auth.types";
import { DeleteAccountRequest } from "../../validation/auth.schema";


// export const signup = async (input: SignupInput) => {
//   try {
//     const { email, password, full_name, role } = input;

//     const exists = await prisma.user.findUnique({ where: { email } });
//     if (exists) throw new Error("Email already exists");

//     const password_hash = await bcrypt.hash(password, 10);
//     const user = await prisma.user.create({
//       data: {
//         email,
//         password_hash,
//         full_name,
//         role,
//         agency_id: null, 
//         is_email_verified: false,
//       },
//     });

//     const token = generateToken({ user_id: user.user_id, role: user.role });
//     await sendVerificationEmail(user.email, user.user_id);

//     // Send company-specific welcome + legacy-check emails immediately for company signups.
//     try {
//       // Accept both 'company' and 'company_admin' roles as company signups
//       if (user.role === 'company' || user.role === 'company_admin') {
//         // Use token payload key 'userId' for verify flow compatibility
//         const verificationToken = generateToken({ userId: user.user_id }, '7d');
//         const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
//         const welcomeHtml = getWelcomeEmailTemplate(verificationLink, user.full_name || user.email);
//         console.log('[post-signup-email] Sending welcome email to', user.email);
//         await sendEmail({ to: user.email, subject: 'Welcome to Hiralent — verify your email', html: welcomeHtml });
//         console.log('[post-signup-email] Welcome email send attempted for', user.email);

//         // Legacy / upload link should point to the company's upload page (frontend)
//         const uploadLink = `${process.env.FRONTEND_URL}${process.env.FRONTEND_UPLOAD_PATH || '/company/upload'}?companyId=${user.user_id}`;
//         const legacyHtml = getLegacyCheckEmailTemplate(uploadLink, user.full_name || user.email);
//         console.log('[post-signup-email] Sending legacy-check (upload) email to', user.email, 'with uploadLink=', uploadLink);
//         await sendEmail({ to: user.email, subject: 'Please upload company documents for verification', html: legacyHtml });
//         console.log('[post-signup-email] Legacy-check email send attempted for', user.email);
//       }
//     } catch (err) {
//       console.error('Error sending post-signup company emails:', err);
//     }

//     return { user, token };
//   } catch (error: any) {
//     console.error("Signup Error:", error);
//     return {
//       error: true,
//       message: error.message || "Signup failed",
//     };
//   }
// };

export const signup = async (input: SignupInput, req?: any) => {
  try {
    const { email, password, full_name, role } = input;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error("Email already exists");

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        full_name,
        role,
        agency_id: null, 
        is_email_verified: false,
      },
    });

    const sessionId = uuidv4();
    const companyId = user.role === "company_admin" ? user.user_id : undefined;

    const token = generateTokenWithSession(
      user.user_id,
      user.role,
      sessionId,
      user.agency_id || undefined,
      undefined,
      companyId
    );

    await createSession({
      userId: user.user_id,
      jwtToken: token,
      userAgent: req?.headers['user-agent'] || 'Unknown',
      ipAddress: req ? getClientIP(req) : '127.0.0.1',
      screenResolution: req?.body?.screenResolution,
      timezone: req?.body?.timezone,
      language: req?.body?.language
    });

    await sendVerificationEmail(user.email, user.user_id);

    try {
      if (user.role === 'company' || user.role === 'company_admin') {
        const verificationToken = generateToken({ userId: user.user_id }, '7d');
        const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        const welcomeHtml = getWelcomeEmailTemplate(verificationLink, user.full_name || user.email);
        console.log('[post-signup-email] Sending welcome email to', user.email);
        await sendEmail({ to: user.email, subject: 'Welcome to Hiralent — verify your email', html: welcomeHtml });
        console.log('[post-signup-email] Welcome email send attempted for', user.email);

        const uploadLink = `${process.env.FRONTEND_URL}${process.env.FRONTEND_UPLOAD_PATH || '/company/upload'}?companyId=${user.user_id}`;
        const legacyHtml = getLegacyCheckEmailTemplate(uploadLink, user.full_name || user.email);
        console.log('[post-signup-email] Sending legacy-check (upload) email to', user.email, 'with uploadLink=', uploadLink);
        await sendEmail({ to: user.email, subject: 'Please upload company documents for verification', html: legacyHtml });
        console.log('[post-signup-email] Legacy-check email send attempted for', user.email);
      }
    } catch (err) {
      console.error('Error sending post-signup company emails:', err);
    }

    return { user, token };
  } catch (error: any) {
    console.error("Signup Error:", error);
    return {
      error: true,
      message: error.message || "Signup failed",
    };
  }
};



export const login = async ({ email, password }: LoginInput, req?: any): Promise<LoginResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        candidateProfile: true,
        candidateSkills: { orderBy: [{ is_verified: 'desc' }, { created_at: 'desc' }] },
        companyProfile: true,             // only profile we have
        agencyAdminProfile: true,
        agency: { select: { agency_id: true, name: true, website: true, logo_url: true, status: true } }
      }
    }) as UserWithProfiles | null;

    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error("Invalid credentials");

    const sessionId = uuidv4();

    // ✅ for both company & company_admin
    const companyId =
      (user.role === "company" || user.role === "company_admin")
        ? (user.companyProfile?.company_id ?? user.user_id)
        : undefined;

    if ((user.role === "company" || user.role === "company_admin") && !companyId) {
      throw new Error("Company account is not initialized (missing company_id).");
    }

    const token = generateTokenWithSession(
      user.user_id,
      user.role,
      sessionId,
      user.agency_id || undefined,
      undefined,     // deviceHash optional
      companyId      // 👈 now included for both roles
    );

    // DEV sanity check
    // console.log("JWT payload on login:", jwt.decode(token));

    await createSession({
      userId: user.user_id,
      jwtToken: token,
      userAgent: req?.headers['user-agent'] || 'Unknown',
      ipAddress: req ? getClientIP(req) : '127.0.0.1',
      screenResolution: req?.body?.screenResolution,
      timezone: req?.body?.timezone,
      language: req?.body?.language
    });

    const cleanUser: CleanUser = {
      user_id: user.user_id,
      email: user.email,
      is_email_verified: user.is_email_verified,
      full_name: user.full_name,
      role: user.role,
      phone_number: user.phone_number,
      position: user.position,
      linkedin_url: user.linkedin_url,
      agency_id: user.agency_id,
      agency: user.agency,
    };

    let profileData: any = null;

    if (user.role === 'candidate') {
      const skills = user.candidateSkills.map(s => ({
        skill_id: s.skill_id,
        skill_name: s.skill_name,
        skill_category: s.skill_category,
        proficiency: s.proficiency,
        years_experience: s.years_experience,
        confidence_score: s.confidence_score,
        source_type: s.source_type,
        is_verified: s.is_verified
      }));

      profileData = user.candidateProfile
        ? { ...user.candidateProfile,
            created_at: user.candidateProfile.created_at.toISOString(),
            updated_at: user.candidateProfile.updated_at.toISOString(),
            skills }
        : {
            candidate_id: user.user_id,
            about_me: null,
            city: null,
            created_at: new Date().toISOString(),
            education: null,
            experience: null,
            headline: null,
            job_benefits: null,
            languages: null,
            links: null,
            location: null,
            minimum_salary_amount: null,
            payment_period: null,
            postal_code: null,
            preferred_locations: null,
            profile_picture_url: null,
            resume_url: null,
            skills,
            updated_at: new Date().toISOString(),
            video_intro_url: null,
          };
    } else if (user.role === 'company' || user.role === 'company_admin') {
      profileData = user.companyProfile
        ? {
            ...user.companyProfile,
            created_at: user.companyProfile.created_at.toISOString(),
            updated_at: user.companyProfile.updated_at.toISOString()
          }
        : null;
    } else if (user.role === 'agency') {
      profileData = user.agencyAdminProfile
        ? {
            ...user.agencyAdminProfile,
            created_at: user.agencyAdminProfile.created_at.toISOString(),
            updated_at: user.agencyAdminProfile.updated_at.toISOString()
          }
        : null;
    }

    return { user: cleanUser, profile: profileData, token };
  } catch (error: any) {
    console.error("Login Error:", error);
    return { error: true, message: error.message || "Login failed" };
  }
};



export const resendVerificationEmail = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { user_id: userId },
      select: { 
        email: true, 
        is_email_verified: true, 
        user_id: true,
        full_name: true 
      }
    });

    if (!user) {
      return {
        error: true,
        message: "User not found"
      };
    }

    if (user.is_email_verified) {
      return {
        error: true,
        message: "Email is already verified"
      };
    }

    await sendVerificationEmail(user.email, user.user_id);

    return { 
      success: true, 
      message: "Verification email sent successfully" 
    };
  } catch (error: any) {
    console.error("Resend Verification Email Error:", error);
    return {
      error: true,
      message: error.message || "Failed to resend verification email"
    };
  }
};

export const sendVerificationEmail = async (email: string, userId: string) => {
  try {
    const token = generateToken({ userId }, "15m");
    const link = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
      <div style="font-family: 'Segoe UI', sans-serif; background: #f9fafb; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 32px;">
          <h2 style="color: #3b82f6; margin-bottom: 24px;">Welcome to <span style="color:#111827;">Talenta</span></h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Thanks for signing up! You're just one click away from activating your account.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${link}" style="background-color: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Verify Your Email
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            &copy; ${new Date().getFullYear()} Talenta. All rights reserved.
          </p>
        </div>
      </div>
      `,
    });
  } catch (error: any) {
      console.error("Send Verification Email Error:", error);
      // In development we don't want email delivery failures to break signup flows.
      // When ENABLE_DEV_MINT=1 we log the error and continue so developers can
      // create accounts without a working SMTP. In production we re-throw.
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
        throw new Error("Failed to send verification email");
      } else {
        console.warn('DEV MODE: continuing despite email send failure');
        return;
      }
  }
};

export const verifyEmail = async ({ token }: VerifyEmailInput) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.update({
      where: { user_id: decoded.userId },
      data: { is_email_verified: true },
    });

    const authToken = generateToken({
      user_id: user.user_id,
      role: user.role,
      agency_id: user.agency_id,
    });

    return { user, token: authToken };
  } catch (error: any) {
    console.error("Verify Email Error:", error);
    return {
      error: true,
      message: error.message || "Verification failed",
    };
  }
};

export const forgotPassword = async ({ email }: ForgotPasswordInput) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`Forgot Password: Attempt for non-existent email: ${email}`);
      return { success: true };
    }

    const token = generateToken({ userId: user.user_id }, "15m");
    const resetLink = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', sans-serif; background: #f9fafb; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 0 8px rgba(0,0,0,0.05);">
          <h2 style="color: #ef4444;">Reset Your Password</h2>
          <p style="color: #374151;">We've received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetLink}" style="background-color: #ef4444; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #9ca3af;">This link will expire in 15 minutes for security reasons.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: "Reset your Talenta password",
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return {
      error: true,
      message: error.message || "Forgot password failed",
    };
  }
};

export const resetPassword = async ({ token, newPassword }: ResetPasswordInput) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { user_id: decoded.userId },
      data: { password_hash: hash },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return {
      error: true,
      message: error.message || "Reset password failed",
    };
  }
};


export const deleteAccount = async (userId: string, body?: DeleteAccountRequest) => {
  try {
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: true,
        email: true,
        full_name: true,
        candidateProfile: {
          select: {
            profile_picture_url: true,
            resume_url: true,
            video_intro_url: true,
            resume_application_url: true
          }
        },
        companyProfile: {
          select: {
            logo_url: true,
            banner_url: true
          }
        },
        agencyAdminProfile: {
          select: {
            admin_id: true
          }
        },
        candidateDocuments: {
          select: {
            file_path: true,
            document_id: true
          }
        },
        uploadedDocuments: {
          select: {
            storage_key: true,
            preview_key: true,
            document_id: true
          }
        },
        jobsPosted: {
          select: {
            job_id: true
          }
        },
        relocationCases: {
          select: {
            case_id: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`[DELETE ACCOUNT] Starting deletion for User ID: ${userId}, Role: ${user.role}, Email: ${user.email}`);

    // Collect all file paths that need to be deleted
    const filesToDelete: string[] = [];

    // Candidate profile files
    if (user.candidateProfile) {
      const profile = user.candidateProfile;
      if (profile.profile_picture_url) filesToDelete.push(profile.profile_picture_url);
      if (profile.resume_url) filesToDelete.push(profile.resume_url);
      if (profile.video_intro_url) filesToDelete.push(profile.video_intro_url);
      if (profile.resume_application_url) filesToDelete.push(profile.resume_application_url);
    }

    // Company profile files
    if (user.companyProfile) {
      const profile = user.companyProfile;
      if (profile.logo_url) filesToDelete.push(profile.logo_url);
      if (profile.banner_url) filesToDelete.push(profile.banner_url);
    }

    // Candidate document files
    if (user.candidateDocuments?.length > 0) {
      user.candidateDocuments.forEach(doc => {
        if (doc.file_path) filesToDelete.push(doc.file_path);
      });
    }

    // Uploaded document files
    if (user.uploadedDocuments?.length > 0) {
      user.uploadedDocuments.forEach(doc => {
        if (doc.storage_key) filesToDelete.push(doc.storage_key);
        if (doc.preview_key) filesToDelete.push(doc.preview_key);
      });
    }

    // Count related records before deletion
    const relatedCounts = {
      candidateDocuments: user.candidateDocuments?.length || 0,
      uploadedDocuments: user.uploadedDocuments?.length || 0,
      jobsPosted: user.jobsPosted?.length || 0,
      relocationCases: user.relocationCases?.length || 0,
      filesToDelete: filesToDelete.length
    };

    console.log(`[DELETE ACCOUNT] Related records count:`, relatedCounts);

    // Perform database deletion with transaction
    await prisma.$transaction(async (tx) => {
      console.log(`[DELETE ACCOUNT] Starting database transaction for user: ${userId}`);
      
      // Delete user - CASCADE will automatically delete all related records
      await tx.user.delete({
        where: { user_id: userId }
      });
      
      console.log(`[DELETE ACCOUNT] User and all related records deleted successfully`);
    }, {
      timeout: 30000, // 30 second timeout for large deletions
    });

    // Schedule file cleanup (don't wait for completion)
    if (filesToDelete.length > 0) {
      console.log(`[DELETE ACCOUNT] Scheduling cleanup of ${filesToDelete.length} files`);
      setImmediate(() => deleteFilesAsync(filesToDelete, userId));
    }

    // Log successful deletion
    console.log(`[DELETE ACCOUNT] Completed successfully for user: ${userId}`);

    return {
      success: true,
      message: `${user.role} account deleted successfully`,
      data: {
        deleted_user_id: userId,
        deleted_user_email: user.email,
        deleted_user_name: user.full_name,
        deleted_role: user.role,
        related_records_deleted: relatedCounts,
        deletion_timestamp: new Date().toISOString()
      }
    };

  } catch (error: any) {
    console.error(`[DELETE ACCOUNT] Error for user ${userId}:`, error);
    
    // Re-throw with more context
    if (error.code === 'P2025') {
      throw new Error('User not found or already deleted');
    } else if (error.code === 'P2003') {
      throw new Error('Cannot delete user due to foreign key constraints');
    } else {
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }
};

// Helper function for asynchronous file cleanup
async function deleteFilesAsync(filePaths: string[], userId: string) {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  let deletedCount = 0;
  let failedCount = 0;
  
  console.log(`[FILE CLEANUP] Starting cleanup of ${filePaths.length} files for user: ${userId}`);
  
  for (const filePath of filePaths) {
    try {
      let fullPath = filePath;
      
      // Handle relative paths
      if (!path.isAbsolute(filePath)) {
        fullPath = path.join(uploadDir, filePath);
      }
      
      // Check if file exists before attempting deletion
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      
      deletedCount++;
      console.log(`[FILE CLEANUP] Deleted: ${fullPath}`);
      
    } catch (fileError: any) {
      failedCount++;
      
      if (fileError.code === 'ENOENT') {
        console.log(`[FILE CLEANUP] File not found (already deleted?): ${filePath}`);
      } else {
        console.warn(`[FILE CLEANUP] Failed to delete file: ${filePath}`, fileError.message);
      }
    }
  }
  
  console.log(`[FILE CLEANUP] Completed for user ${userId}: ${deletedCount} deleted, ${failedCount} failed`);
}
export const getUserDeletionSummary = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        // Profile relations add karo
        candidateProfile: true,
        companyProfile: true,
        agencyAdminProfile: true,
        
        _count: {
          select: {
            candidateDocuments: true,
            uploadedDocuments: true,
            jobsPosted: true,
            jobApplications: true,
            assessments: true,
            notifications: true,
            relocationCases: true,
            agencyReviews: true,
            invitationsSent: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Safely compute numeric counts (Prisma's _count can be a typed object)
    const countsRecord = (user._count ?? {}) as Record<string, number>;
    const databaseRecordsCount = Object.values(countsRecord).reduce((sum, count) => sum + (Number(count) || 0), 1);

    return {
      user_info: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      },
      related_records_count: user._count,
      estimated_deletion_impact: {
        database_records: databaseRecordsCount,
        profile_exists: !!(user.candidateProfile || user.companyProfile || user.agencyAdminProfile)
      }
    };

  } catch (error: any) {
    throw new Error(`Failed to get deletion summary: ${error.message}`);
  }
};

import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/email.util";
import { generateToken } from "../utils/jwt.util";
import {
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
   UserWithProfiles, 
   CleanUser,
   LoginResponse
} from "../types/auth.types";

export const signup = async (input: SignupInput) => {
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

    const token = generateToken({ user_id: user.user_id, role: user.role });
    await sendVerificationEmail(user.email, user.user_id);

    return { user, token };
  } catch (error: any) {
    console.error("❌ Signup Error:", error);
    return {
      error: true,
      message: error.message || "Signup failed",
    };
  }
};

export const login = async ({ email, password }: LoginInput): Promise<LoginResponse> => {
  try {
    // Find user with their profile based on role + skills for candidates
    const user: UserWithProfiles | null = await prisma.user.findUnique({
      where: { email },
      include: {
        candidateProfile: true,
        candidateSkills: { // Add skills for candidates
          orderBy: [
            { is_verified: 'desc' },
            { created_at: 'desc' }
          ]
        },
        companyProfile: true,
        agencyAdminProfile: true,
        agency: {
          select: {
            agency_id: true,
            name: true,
            website: true,
            logo_url: true,
            status: true
          }
        }
      }
    }) as UserWithProfiles | null;

    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error("Invalid credentials");

    const token = generateToken({
      user_id: user.user_id,
      role: user.role,
      agency_id: user.agency_id,
    });

    // Clean user object - same structure as getCandidateProfile
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

    // Extract profile based on user role
    let profileData = null;
    
    if (user.role === 'candidate') {
      // For candidates: populate skills like getCandidateProfile
      const populatedSkills = user.candidateSkills.map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.skill_name,
        skill_category: skill.skill_category,
        proficiency: skill.proficiency,
        years_experience: skill.years_experience,
        confidence_score: skill.confidence_score,
        source_type: skill.source_type,
        is_verified: skill.is_verified
      }));

      if (user.candidateProfile) {
        profileData = {
          ...user.candidateProfile,
          // Convert dates to ISO strings to match getCandidateProfile format
          created_at: user.candidateProfile.created_at.toISOString(),
          updated_at: user.candidateProfile.updated_at.toISOString(),
          // Replace skill IDs with populated skills - same as getCandidateProfile
          skills: populatedSkills
        };
      } else {
        // If no profile exists, return basic structure - same as getCandidateProfile
        profileData = {
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
          skills: populatedSkills, // Empty skills array for new profile
          updated_at: new Date().toISOString(),
          video_intro_url: null,
        };
      }
    } else if (user.role === 'company') {
      // For companies: return profile as-is (no skills to populate)
      profileData = user.companyProfile ? {
        ...user.companyProfile,
        created_at: user.companyProfile.created_at.toISOString(),
        updated_at: user.companyProfile.updated_at.toISOString()
      } : null;
    } else if (user.role === 'agency') {
      // For agencies: return profile as-is (no skills to populate)
      profileData = user.agencyAdminProfile ? {
        ...user.agencyAdminProfile,
        created_at: user.agencyAdminProfile.created_at.toISOString(),
        updated_at: user.agencyAdminProfile.updated_at.toISOString()
      } : null;
    }

    // Return same structure as getCandidateProfile
    return {
      user: cleanUser,
      profile: profileData, // Now with populated skills for candidates
      token
    };

  } catch (error: any) {
    console.error("❌ Login Error:", error);
    return {
      error: true,
      message: error.message || "Login failed",
    };
  }
};

export const resendVerificationEmail = async (userId: string) => {
  try {
    // User ko find karo
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

    // Agar email already verified hai
    if (user.is_email_verified) {
      return {
        error: true,
        message: "Email is already verified"
      };
    }

    // Existing sendVerificationEmail function use karo
    await sendVerificationEmail(user.email, user.user_id);

    return { 
      success: true, 
      message: "Verification email sent successfully" 
    };
  } catch (error: any) {
    console.error("❌ Resend Verification Email Error:", error);
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
          <h2 style="color: #3b82f6; margin-bottom: 24px;">Welcome to <span style="color:#111827;">Talenta</span> 👋</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Thanks for signing up! You're just one click away from activating your account.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${link}" style="background-color: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Verify Your Email
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            If you didn’t request this, you can safely ignore this email.
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
    console.error("❌ Send Verification Email Error:", error);
    throw new Error("Failed to send verification email");
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
    console.error("❌ Verify Email Error:", error);
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
      console.warn(`🔒 Forgot Password: Attempt for non-existent email: ${email}`);
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

    console.log(`📧 Password reset email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Forgot Password Error:", error);
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
    console.error("❌ Reset Password Error:", error);
    return {
      error: true,
      message: error.message || "Reset password failed",
    };
  }
};

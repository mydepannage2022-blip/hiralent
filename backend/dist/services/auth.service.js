"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.verifyEmail = exports.sendVerificationEmail = exports.resendVerificationEmail = exports.login = exports.signup = exports.sendLegacyCheckEmail = exports.sendWelcomeEmail = void 0;
// backend/src/services/auth.service.ts
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const email_util_1 = require("../utils/email.util");
const jwt_util_1 = require("../utils/jwt.util");
// Email template functions
const getWelcomeEmailTemplate = (verificationLink, companyName) => {
    return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 680px; margin: 0 auto; background:#f8fafc; padding:28px;">
      <div style="background:white; border-radius:12px; padding:28px; box-shadow: 0 6px 18px rgba(15,23,42,0.06);">
        <div style="text-align:center; margin-bottom:18px;">
          <div style="width:64px; height:64px; margin:0 auto; border-radius:12px; background:linear-gradient(135deg,#0ea5a4,#6366f1); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:22px;">H</div>
        </div>
        <h2 style="color:#0f172a; font-size:20px; text-align:center; margin:0 0 8px;">Welcome to Hiralent</h2>
        <p style="color:#334155; text-align:center; margin:0 0 20px;">Hi ${companyName || 'there'}, thanks for joining Hiralent. Please verify your email to access your dashboard.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${verificationLink}" style="background:#6366f1; color:white; padding:12px 22px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">Verify Email</a>
        </div>
        <p style="color:#94a3b8; font-size:13px; text-align:center; margin-top:18px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <p style="text-align:center; color:#94a3b8; font-size:12px; margin-top:14px;">© ${new Date().getFullYear()} Hiralent</p>
    </div>
  `;
};
const getLegacyCheckEmailTemplate = (uploadLink, companyName) => {
    return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 680px; margin: 0 auto; background:#f8fafc; padding:28px;">
      <div style="background:white; border-radius:12px; padding:28px; box-shadow: 0 6px 18px rgba(15,23,42,0.06);">
        <div style="text-align:center; margin-bottom:14px;">
          <div style="width:64px; height:64px; margin:0 auto; border-radius:12px; background:linear-gradient(135deg,#f59e0b,#ef4444); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:22px;">📁</div>
        </div>
        <h2 style="color:#0f172a; font-size:20px; text-align:center; margin:0 0 8px;">Quick action required</h2>
        <p style="color:#334155; text-align:center; margin:0 0 18px;">Hi ${companyName || 'there'}, please upload your company documents so we can verify your account and unlock features.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${uploadLink}" style="background:#0ea5a4; color:white; padding:12px 22px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">Upload documents</a>
        </div>
        <p style="color:#94a3b8; font-size:13px; text-align:center; margin-top:18px;">If you already uploaded, you can ignore this message.</p>
      </div>
      <p style="text-align:center; color:#94a3b8; font-size:12px; margin-top:14px;">© ${new Date().getFullYear()} Hiralent</p>
    </div>
  `;
};
const sendWelcomeEmail = async (email, user_id, companyName) => {
    try {
        // Ensure the user in DB is actually a company before sending company-only emails.
        const dbUser = await prisma_1.default.user.findUnique({ where: { user_id }, select: { role: true, email: true } });
        if (!dbUser) {
            console.warn(`sendWelcomeEmail: user not found: ${user_id} — skipping welcome email`);
            return;
        }
        if (dbUser.role !== 'company') {
            console.log(`sendWelcomeEmail: user role is '${dbUser.role}' (not 'company') for ${user_id}; skipping welcome email`);
            return;
        }
        const token = (0, jwt_util_1.generateToken)({ user_id }, "15m");
        const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
        const html = getWelcomeEmailTemplate(verificationLink, companyName);
        await (0, email_util_1.sendEmail)({
            to: email,
            subject: "Welcome to Hiralent - Verify Your Email",
            html,
        });
        console.log(`📧 Welcome email sent to ${email}`);
    }
    catch (error) {
        console.error("❌ Send Welcome Email Error:", error);
        throw new Error("Failed to send welcome email");
    }
};
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendLegacyCheckEmail = async (email, user_id, companyName) => {
    try {
        // Trace the call site and parameters to help diagnose unexpected sends
        console.trace('TRACE: sendLegacyCheckEmail invoked', { email, user_id, env: process.env.NODE_ENV });
        // Defensive check: confirm user exists and is a company before emailing for legacy/company verification.
        const dbUser = await prisma_1.default.user.findUnique({ where: { user_id }, select: { role: true, email: true } });
        if (!dbUser) {
            console.warn(`sendLegacyCheckEmail: user not found: ${user_id} — skipping legacy check email`);
            return;
        }
        if (dbUser.role !== 'company') {
            console.log(`sendLegacyCheckEmail: user role is '${dbUser.role}' (not 'company') for ${user_id}; skipping legacy check email`);
            return;
        }
        // Allow overriding the upload path via env; default to /company/upload
        const resolvedUploadPath = process.env.FRONTEND_UPLOAD_PATH || '/upload';
        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
        const uploadLink = `${frontendUrl}${resolvedUploadPath}`;
        const html = getLegacyCheckEmailTemplate(uploadLink, companyName);
        await (0, email_util_1.sendEmail)({
            to: email,
            subject: "Verify Your Company Legacy - Hiralent",
            html,
            from: `"Hiralent Team" <no-reply@hiralent.com>`
        });
        console.log(`📧 Legacy check email sent to ${email}`);
    }
    catch (error) {
        console.error("❌ Send Legacy Check Email Error:", error);
        throw new Error("Failed to send legacy check email");
    }
};
exports.sendLegacyCheckEmail = sendLegacyCheckEmail;
const signup = async (input) => {
    try {
        const { email, password, full_name, role } = input;
        const exists = await prisma_1.default.user.findUnique({ where: { email } });
        if (exists)
            throw new Error("Email already exists");
        const password_hash = await bcrypt_1.default.hash(password, 10);
        // Map frontend role values to the DB role values used in the app
        const mapRoleToDb = (r) => {
            if (!r)
                return 'candidate';
            if (r === 'company_admin' || r === 'company')
                return 'company';
            if (r === 'agency_admin' || r === 'agency')
                return 'agency';
            if (r === 'superadmin')
                return 'superadmin';
            if (r === 'candidate')
                return 'candidate';
            return 'candidate';
        };
        const dbRole = mapRoleToDb(role);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password_hash,
                full_name,
                role: dbRole,
                agency_id: null,
                is_email_verified: false,
            },
        });
        const token = (0, jwt_util_1.generateToken)({ user_id: user.user_id, role: user.role });
        // Send emails depending on role (company only receives welcome + legacy check)
        try {
            console.log('🔔 Signup role for email sending:', { email: user.email, role: dbRole });
            if (dbRole === 'company') {
                // Company signups get welcome + legacy check (only to company email)
                await (0, exports.sendWelcomeEmail)(user.email, user.user_id, user.full_name);
                await (0, exports.sendLegacyCheckEmail)(user.email, user.user_id, user.full_name);
            }
            else if (dbRole === 'candidate') {
                // Candidate signups receive a verification email only
                await (0, exports.sendVerificationEmail)(user.email, user.user_id);
            }
        }
        catch (err) {
            console.error('❌ Error sending post-signup emails:', err);
        }
        return {
            user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_email_verified: user.is_email_verified,
                agency_id: user.agency_id,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            token
        };
    }
    catch (error) {
        console.error("❌ Signup Error:", error);
        return {
            error: true,
            message: error.message || "Signup failed",
        };
    }
};
exports.signup = signup;
const login = async ({ email, password }) => {
    try {
        // Find user with their profile based on role + skills for candidates
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            include: {
                candidateProfile: true,
                candidateSkills: {
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
        });
        if (!user)
            throw new Error("User not found");
        const match = await bcrypt_1.default.compare(password, user.password_hash);
        if (!match)
            throw new Error("Invalid credentials");
        const token = (0, jwt_util_1.generateToken)({
            user_id: user.user_id,
            role: user.role,
            agency_id: user.agency_id,
        });
        // Clean user object
        const cleanUser = {
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
            const populatedSkills = (user.candidateSkills || []).map(skill => ({
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
                    created_at: user.candidateProfile.created_at.toISOString(),
                    updated_at: user.candidateProfile.updated_at.toISOString(),
                    skills: populatedSkills
                };
            }
            else {
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
                    skills: populatedSkills,
                    updated_at: new Date().toISOString(),
                    video_intro_url: null,
                };
            }
        }
        else if (user.role === 'company') {
            profileData = user.companyProfile ? {
                ...user.companyProfile,
                created_at: user.companyProfile.created_at.toISOString(),
                updated_at: user.companyProfile.updated_at.toISOString()
            } : null;
        }
        else if (user.role === 'agency') {
            profileData = user.agencyAdminProfile ? {
                ...user.agencyAdminProfile,
                created_at: user.agencyAdminProfile.created_at.toISOString(),
                updated_at: user.agencyAdminProfile.updated_at.toISOString()
            } : null;
        }
        return {
            user: cleanUser,
            profile: profileData,
            token
        };
    }
    catch (error) {
        console.error("❌ Login Error:", error);
        return {
            error: true,
            message: error.message || "Login failed",
        };
    }
};
exports.login = login;
const resendVerificationEmail = async (user_id) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { user_id },
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
        await (0, exports.sendVerificationEmail)(user.email, user.user_id);
        return {
            success: true,
            message: "Verification email sent successfully"
        };
    }
    catch (error) {
        console.error("❌ Resend Verification Email Error:", error);
        return {
            error: true,
            message: error.message || "Failed to resend verification email"
        };
    }
};
exports.resendVerificationEmail = resendVerificationEmail;
const sendVerificationEmail = async (email, user_id) => {
    try {
        const token = (0, jwt_util_1.generateToken)({ user_id }, "15m");
        const link = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
        await (0, email_util_1.sendEmail)({
            to: email,
            subject: "Verify your email",
            html: `
      <div style="font-family: 'Segoe UI', sans-serif; background: #f9fafb; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 32px;">
          <h2 style="color: #3b82f6; margin-bottom: 24px;">Welcome to <span style="color:#111827;">Hiralent</span> 👋</h2>
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
            &copy; ${new Date().getFullYear()} Hiralent. All rights reserved.
          </p>
        </div>
      </div>
      `,
        });
    }
    catch (error) {
        console.error("❌ Send Verification Email Error:", error);
        throw new Error("Failed to send verification email");
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const verifyEmail = async ({ token }) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma_1.default.user.update({
            where: { user_id: decoded.user_id },
            data: { is_email_verified: true },
        });
        const authToken = (0, jwt_util_1.generateToken)({
            user_id: user.user_id,
            role: user.role,
            agency_id: user.agency_id,
        });
        return {
            user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_email_verified: user.is_email_verified,
                agency_id: user.agency_id,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            token: authToken
        };
    }
    catch (error) {
        console.error("❌ Verify Email Error:", error);
        return {
            error: true,
            message: error.message || "Verification failed",
        };
    }
};
exports.verifyEmail = verifyEmail;
const forgotPassword = async ({ email }) => {
    try {
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            console.warn(`🔒 Forgot Password: Attempt for non-existent email: ${email}`);
            return { success: true };
        }
        const token = (0, jwt_util_1.generateToken)({ user_id: user.user_id }, "15m");
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
        await (0, email_util_1.sendEmail)({
            to: email,
            subject: "Reset your Hiralent password",
            html,
        });
        console.log(`📧 Password reset email sent to ${email}`);
        return { success: true };
    }
    catch (error) {
        console.error("❌ Forgot Password Error:", error);
        return {
            error: true,
            message: error.message || "Forgot password failed",
        };
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async ({ token, newPassword }) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const hash = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { user_id: decoded.user_id },
            data: { password_hash: hash },
        });
        return { success: true };
    }
    catch (error) {
        console.error("❌ Reset Password Error:", error);
        return {
            error: true,
            message: error.message || "Reset password failed",
        };
    }
};
exports.resetPassword = resetPassword;

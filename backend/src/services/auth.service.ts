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
} from "../types/auth.types";

export const signup = async (input: SignupInput) => {
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
      agency_id: null, // ✅ Default is null
      is_email_verified: false,
    },
  });

  const token = generateToken({ user_id: user.user_id, role: user.role });
  await sendVerificationEmail(user.email, user.user_id);
  return { user, token };
};

export const login = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error("Invalid credentials");

  const token = generateToken({
    user_id: user.user_id,
    role: user.role,
    agency_id: user.agency_id,
  });

  return { user, token };
};

export const sendVerificationEmail = async (email: string, userId: string) => {
  const token = generateToken({ userId }, "15m");
  const link = `${process.env.APP_URL}/api/v1/auth/verify-email?token=${token}`;
  console.log("🔗 Verification link:", link); // optional visibility

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
};

export const verifyEmail = async ({ token }: VerifyEmailInput) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  const user = await prisma.user.update({
    where: { user_id: decoded.userId },
    data: { is_email_verified: true },
  });
  return user;
};

export const forgotPassword = async ({ email }: ForgotPasswordInput) => {
  // 1. Check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.warn(`🔒 Forgot Password: Attempt for non-existent email: ${email}`);
    // Optional: Don't reveal user existence
    return;
  }

  // 2. Generate reset token (expires in 15 mins)
  const token = generateToken({ userId: user.user_id }, "15m");
  const resetLink = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

  // 3. Email content
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

  // 4. Send email
  try {
    await sendEmail({
      to: email,
      subject: "Reset your Talenta password",
      html,
    });

    console.log(`📧 Password reset email sent to ${email}`);
  } catch (err) {
    console.error("❌ Failed to send reset password email:", (err as Error).message);
    // Optional: queue for retry or notify admin
  }
};

export const resetPassword = async ({ token, newPassword }: ResetPasswordInput) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { user_id: decoded.userId },
    data: { password_hash: hash },
  });
  return { success: true };
};

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
  const link = `https://yourdomain.com/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: `Click <a href="${link}">here</a> to verify your account.`,
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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const token = generateToken({ userId: user.user_id }, "15m");
  const link = `https://yourdomain.com/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `Click <a href="${link}">here</a> to reset your password.`,
  });
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

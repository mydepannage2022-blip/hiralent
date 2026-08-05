import prisma from "../../lib/prisma";
import jwt, { SignOptions } from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { issueAuthTokens } from "./tokenIssue.service";
import { getClientIP } from "../../utils/locationDetector.util";
import {
  UserWithProfiles,
  CleanUser,
} from "../../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET!;

const RECOVERY_CODE_COUNT = 8;

function generateSingleRecoveryCode(): { plain: string; hash: string } {
  // 40-char uppercase alphanumeric recovery code
  const plain = crypto.randomBytes(32).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
  // Hash without any formatting so comparison is format-agnostic
  const hash = crypto.createHash("sha256").update(plain.replace(/[^A-Z0-9]/g, "")).digest("hex");
  return { plain, hash };
}

async function generateAndStoreRecoveryCodes(userId: string): Promise<string[]> {
  const pairs = Array.from({ length: RECOVERY_CODE_COUNT }, generateSingleRecoveryCode);
  await prisma.user.update({
    where: { user_id: userId },
    data: { mfa_recovery_codes: JSON.stringify(pairs.map((p) => p.hash)) },
  });
  return pairs.map((p) => p.plain);
}

export async function setup2FA(userId: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, email: true, mfa_enabled: true },
  });

  if (!user) throw new Error("User not found");

  const secret = speakeasy.generateSecret({
    name: `Hiralent (${user.email})`,
    issuer: "Hiralent",
    length: 32,
  });

  // Store secret temporarily; mfa_enabled stays false until confirmed
  await prisma.user.update({
    where: { user_id: userId },
    data: { mfa_secret: secret.base32 },
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    success: true,
    qrCodeDataUrl,
    manualCode: secret.base32,
  };
}

/** Called during the login flow when user has never set up 2FA (uses tempToken, not full auth) */
export async function setupWithTempToken(tempToken: string) {
  let decoded: any;
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET);
  } catch {
    throw new Error("Session expired. Please log in again.");
  }

  if (decoded.step !== "mfa_required") {
    throw new Error("Invalid token for this operation.");
  }

  const user = await prisma.user.findUnique({
    where: { user_id: decoded.user_id },
    select: { user_id: true, email: true },
  });

  if (!user) throw new Error("User not found");

  const secret = speakeasy.generateSecret({
    name: `Hiralent (${user.email})`,
    issuer: "Hiralent",
    length: 32,
  });

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { mfa_secret: secret.base32 },
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    success: true,
    qrCodeDataUrl,
    manualCode: secret.base32,
  };
}

export async function enable2FA(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, mfa_secret: true, mfa_enabled: true },
  });

  if (!user) throw new Error("User not found");
  if (!user.mfa_secret) throw new Error("2FA setup not initiated. Please start setup first.");

  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: "base32",
    token,
    window: 2,
  });

  if (!verified) throw new Error("Invalid code. Please try again.");

  await prisma.user.update({
    where: { user_id: userId },
    data: { mfa_enabled: true },
  });

  return { success: true, message: "Two-factor authentication enabled successfully." };
}

export async function disable2FA(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, mfa_secret: true, mfa_enabled: true },
  });

  if (!user) throw new Error("User not found");
  if (!user.mfa_enabled || !user.mfa_secret) throw new Error("2FA is not enabled on this account.");

  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: "base32",
    token,
    window: 2,
  });

  if (!verified) throw new Error("Invalid code. Please try again.");

  await prisma.user.update({
    where: { user_id: userId },
    data: { mfa_enabled: false, mfa_secret: null },
  });

  return { success: true, message: "Two-factor authentication disabled successfully." };
}

export async function verifyLogin2FA(tempToken: string, mfaToken: string, req?: any) {
  let decoded: any;
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET);
  } catch {
    throw new Error("Session expired. Please log in again.");
  }

  if (decoded.step !== "mfa_required") {
    throw new Error("Invalid token for this operation.");
  }

  const user = await prisma.user.findUnique({
    where: { user_id: decoded.user_id },
    include: {
      candidateProfile: true,
      candidateSkills: { orderBy: [{ is_verified: "desc" }, { created_at: "desc" }] },
      companyProfile: true,
      agencyAdminProfile: true,
      agency: { select: { agency_id: true, name: true, website: true, logo_url: true, status: true } },
    },
  }) as UserWithProfiles | null;

  if (!user) throw new Error("User not found.");
  if (!user.mfa_secret) throw new Error("2FA not configured on this account.");

  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: "base32",
    token: mfaToken,
    window: 2,
  });

  if (!verified) throw new Error("Invalid code. Please try again.");

  // Generate recovery codes whenever they don't exist (first setup OR existing users who predate this feature)
  let recoveryCodes: string[] | undefined;
  if (!user.mfa_recovery_codes) {
    recoveryCodes = await generateAndStoreRecoveryCodes(user.user_id);
  }

  // Ensure mfa_enabled = true (idempotent for returning users, activates for first-time setup)
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { mfa_enabled: true },
  });

  let companyId: string | undefined;
  if (user.role === "company" || user.role === "company_admin") {
    companyId = user.companyProfile?.company_id ?? user.user_id;
  } else if (user.role === "company_member") {
    const membership = await prisma.companyTeamMember.findFirst({
      where: { user_id: user.user_id, is_active: true },
      select: { company_id: true },
    });
    companyId = membership?.company_id;
  }

  const { accessToken: token, refreshToken } = await issueAuthTokens({
    userId: user.user_id,
    role: user.role,
    agencyId: user.agency_id || undefined,
    companyId,
    userAgent: req?.headers["user-agent"] || "Unknown",
    ipAddress: req ? getClientIP(req) : "127.0.0.1",
    screenResolution: req?.body?.screenResolution,
    timezone: req?.body?.timezone,
    language: req?.body?.language,
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

  if (user.role === "candidate") {
    const skills = user.candidateSkills.map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      skill_category: s.skill_category,
      proficiency: s.proficiency,
      years_experience: s.years_experience,
      confidence_score: s.confidence_score,
      source_type: s.source_type,
      is_verified: s.is_verified,
    }));
    profileData = user.candidateProfile
      ? {
          ...user.candidateProfile,
          created_at: user.candidateProfile.created_at.toISOString(),
          updated_at: user.candidateProfile.updated_at.toISOString(),
          skills,
        }
      : { candidate_id: user.user_id, skills };
  } else if (user.role === "company" || user.role === "company_admin") {
    profileData = user.companyProfile
      ? {
          ...user.companyProfile,
          created_at: user.companyProfile.created_at.toISOString(),
          updated_at: user.companyProfile.updated_at.toISOString(),
        }
      : null;
  } else if (user.role === "agency") {
    profileData = user.agencyAdminProfile
      ? {
          ...user.agencyAdminProfile,
          created_at: user.agencyAdminProfile.created_at.toISOString(),
          updated_at: user.agencyAdminProfile.updated_at.toISOString(),
        }
      : null;
  }

  return { user: { ...cleanUser, mfa_enabled: true }, profile: profileData, token, refreshToken, recoveryCodes };
}

export async function verifyLoginWithRecoveryCode(tempToken: string, recoveryCode: string, req?: any) {
  let decoded: any;
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET);
  } catch {
    throw new Error("Session expired. Please log in again.");
  }

  if (decoded.step !== "mfa_required") {
    throw new Error("Invalid token for this operation.");
  }

  const user = await prisma.user.findUnique({
    where: { user_id: decoded.user_id },
    include: {
      candidateProfile: true,
      candidateSkills: { orderBy: [{ is_verified: "desc" }, { created_at: "desc" }] },
      companyProfile: true,
      agencyAdminProfile: true,
      agency: { select: { agency_id: true, name: true, website: true, logo_url: true, status: true } },
    },
  }) as UserWithProfiles | null;

  if (!user) throw new Error("User not found.");
  if (!user.mfa_recovery_codes) {
    throw new Error("No recovery codes found. Please log in with your authenticator app and visit Settings to regenerate recovery codes.");
  }

  const stored: string[] = JSON.parse(user.mfa_recovery_codes);
  const normalized = recoveryCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
  const inputHash = crypto.createHash("sha256").update(normalized).digest("hex");

  const idx = stored.indexOf(inputHash);
  if (idx === -1) throw new Error("Invalid recovery code. Please check and try again.");

  // Remove used code (one-time use)
  const remaining = stored.filter((_, i) => i !== idx);
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { mfa_recovery_codes: JSON.stringify(remaining) },
  });

  let companyId: string | undefined;
  if (user.role === "company" || user.role === "company_admin") {
    companyId = user.companyProfile?.company_id ?? user.user_id;
  } else if (user.role === "company_member") {
    const membership = await prisma.companyTeamMember.findFirst({
      where: { user_id: user.user_id, is_active: true },
      select: { company_id: true },
    });
    companyId = membership?.company_id;
  }

  const { accessToken: token, refreshToken } = await issueAuthTokens({
    userId: user.user_id,
    role: user.role,
    agencyId: user.agency_id || undefined,
    companyId,
    userAgent: req?.headers["user-agent"] || "Unknown",
    ipAddress: req ? getClientIP(req) : "127.0.0.1",
    screenResolution: req?.body?.screenResolution,
    timezone: req?.body?.timezone,
    language: req?.body?.language,
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

  if (user.role === "candidate") {
    const skills = user.candidateSkills.map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      skill_category: s.skill_category,
      proficiency: s.proficiency,
      years_experience: s.years_experience,
      confidence_score: s.confidence_score,
      source_type: s.source_type,
      is_verified: s.is_verified,
    }));
    profileData = user.candidateProfile
      ? {
          ...user.candidateProfile,
          created_at: user.candidateProfile.created_at.toISOString(),
          updated_at: user.candidateProfile.updated_at.toISOString(),
          skills,
        }
      : { candidate_id: user.user_id, skills };
  } else if (user.role === "company" || user.role === "company_admin") {
    profileData = user.companyProfile
      ? {
          ...user.companyProfile,
          created_at: user.companyProfile.created_at.toISOString(),
          updated_at: user.companyProfile.updated_at.toISOString(),
        }
      : null;
  } else if (user.role === "agency") {
    profileData = user.agencyAdminProfile
      ? {
          ...user.agencyAdminProfile,
          created_at: user.agencyAdminProfile.created_at.toISOString(),
          updated_at: user.agencyAdminProfile.updated_at.toISOString(),
        }
      : null;
  }

  return { user: { ...cleanUser, mfa_enabled: true }, profile: profileData, token, refreshToken, remainingRecoveryCodes: remaining.length };
}

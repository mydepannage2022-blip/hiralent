import axios from "axios";
import prisma from "../../lib/prisma";
import { issueAuthTokens } from "./tokenIssue.service";
import { getClientIP } from "../../utils/locationDetector.util";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * Build the Google consent-screen URL.
 * The role is encoded in the `state` param so it survives the redirect.
 */
export const getGoogleAuthURL = (role: string): string => {
  const state = Buffer.from(JSON.stringify({ role })).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
    response_type: "code",
    scope: "email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange the OAuth code for a Google profile, then find-or-create the user.
 * Returns a signed JWT + the user's role for the frontend redirect.
 */
export const handleGoogleCallback = async (
  code: string,
  state: string,
  req?: any
) => {
  // 1 — Decode role from state
  let role = "candidate";
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );
    if (decoded.role) role = decoded.role;
  } catch {
    // ignore malformed state — default to candidate
  }

  // 2 — Exchange code for access token
  const tokenRes = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
      grant_type: "authorization_code",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token } = tokenRes.data;

  // 3 — Fetch Google profile
  const profileRes = await axios.get(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const {
    id: googleId,
    email,
    name,
  }: { id: string; email: string; name: string } = profileRes.data;

  // 4 — Find or create user
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ google_id: googleId }, { email: email.toLowerCase() }],
    },
  });

  let isNew = false;

  if (!user) {
    // Brand-new user — needs onboarding to pick their role
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        full_name: name,
        password_hash: null,
        role: "pending_google",
        auth_provider: "google",
        google_id: googleId,
        is_email_verified: true,
      },
    });
    isNew = true;
  } else if (!user.google_id) {
    // Existing local account — link Google to it
    user = await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        google_id: googleId,
        auth_provider: "google",
        is_email_verified: true,
      },
    });
  }

  // 5 — Generate JWT + session
  const companyId =
    user.role === "company_admin" ? user.user_id : undefined;

  const { accessToken: token, refreshToken } = await issueAuthTokens({
    userId: user.user_id,
    role: user.role,
    agencyId: user.agency_id || undefined,
    companyId,
    userAgent: req?.headers?.["user-agent"] || "Google OAuth",
    ipAddress: req ? getClientIP(req) : "127.0.0.1",
  });

  return { token, refreshToken, role: user.role, isNew };
};

/**
 * Finalize Google onboarding: update the user's role and issue a fresh token.
 */
export const completeGoogleOnboarding = async (
  userId: string,
  role: "candidate" | "company_admin",
  fullName?: string
) => {
  const updateData: any = { role };
  if (fullName?.trim()) updateData.full_name = fullName.trim();

  const user = await prisma.user.update({
    where: { user_id: userId },
    data: updateData,
  });

  // Issue a fresh token that carries the real role
  const companyId = role === "company_admin" ? userId : undefined;

  // Replace the pending session with a proper one
  await prisma.userSession.updateMany({
    where: { user_id: userId },
    data: { is_active: false },
  });

  const { accessToken: token, refreshToken } = await issueAuthTokens({
    userId,
    role,
    agencyId: user.agency_id || undefined,
    companyId,
    userAgent: "Google OAuth Onboarding",
    ipAddress: "127.0.0.1",
  });

  return { token, refreshToken, role };
};

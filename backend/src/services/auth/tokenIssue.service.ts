// backend/src/services/auth/tokenIssue.service.ts
//
// Central issuance + rotation of the (short-lived access token, opaque refresh
// token) pair. Wave 1 / Phase 1.2 (R-29).
//
// - Access token: short-lived JWT carrying user_id/role/session_id/etc.
// - Refresh token: opaque high-entropy random string (NOT a JWT), stored only as
//   a sha256 hash on the session row. Rotated on every refresh so a used refresh
//   token can never be replayed.
//
// The session_id is generated HERE and baked into BOTH the JWT and the session
// row (createSession receives it explicitly) so the token maps 1:1 to a DB
// session that the middleware and refresh flow can look up.

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../lib/prisma';
import { generateTokenWithSession } from '../../utils/jwt.util';
import { sha256Hex } from '../../utils/tokenHash';
import { createSession } from './session.service';
import * as blacklistService from './blacklist.service';

export interface IssueTokensParams {
  userId: string;
  role: string;
  agencyId?: string;
  companyId?: string;
  deviceHash?: string;
  userAgent: string;
  ipAddress: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/** A refresh token is 48 random bytes → 96 hex chars. Opaque, never signed. */
const newRefreshToken = (): string => crypto.randomBytes(48).toString('hex');

/**
 * Resolve the company_id claim for a user (role-specific), mirroring the login
 * flow so refreshed tokens keep the same company scope.
 */
export async function resolveCompanyId(user: {
  user_id: string;
  role: string;
  companyProfile?: { company_id: string } | null;
}): Promise<string | undefined> {
  if (user.role === 'company' || user.role === 'company_admin') {
    return user.companyProfile?.company_id ?? user.user_id;
  }
  // `recruiter` is resolved the same way as `company_member`: both are team users whose company
  // comes from CompanyTeamMember, not from a CompanyProfile of their own. Without this a
  // recruiter got no company_id at all, so every company-scoped check (job create, and now the
  // billing/quota checks) failed for them even though they are allowed to run those flows.
  if (user.role === 'company_member' || user.role === 'recruiter') {
    const membership = await prisma.companyTeamMember.findFirst({
      where: { user_id: user.user_id, is_active: true },
      select: { company_id: true },
    });
    return membership?.company_id ?? undefined;
  }
  return undefined;
}

/**
 * Mint a fresh access+refresh pair and persist a session for it.
 * Used by every login/signup/oauth path.
 */
export async function issueAuthTokens(params: IssueTokensParams): Promise<IssuedTokens> {
  const sessionId = uuidv4();

  const accessToken = generateTokenWithSession(
    params.userId,
    params.role,
    sessionId,
    params.agencyId,
    params.deviceHash,
    params.companyId
  );

  const refreshToken = newRefreshToken();

  await createSession({
    sessionId,
    userId: params.userId,
    jwtToken: accessToken,
    refreshToken,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    screenResolution: params.screenResolution,
    timezone: params.timezone,
    language: params.language,
  });

  return { accessToken, refreshToken, sessionId };
}

/**
 * Rotate a refresh token: validate it against an active, non-expired session,
 * then issue a NEW access token + NEW refresh token, invalidating the old refresh
 * token (rotation). Returns null when the refresh token is unknown/expired/revoked.
 */
export async function refreshTokens(
  presentedRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!presentedRefreshToken) return null;

  const refreshHash = sha256Hex(presentedRefreshToken);

  const session = await prisma.userSession.findFirst({
    where: {
      refresh_token_hash: refreshHash,
      is_active: true,
      expires_at: { gt: new Date() },
    },
    include: { user: { include: { companyProfile: true } } },
  });

  if (!session || !session.user) return null;

  const user = session.user;
  const companyId = await resolveCompanyId(user);

  const accessToken = generateTokenWithSession(
    user.user_id,
    user.role,
    session.session_id, // keep the same session_id (stable session, rotating credential)
    user.agency_id || undefined,
    undefined,
    companyId
  );

  const refreshToken = newRefreshToken();

  await prisma.userSession.update({
    where: { session_id: session.session_id },
    data: {
      jwt_token_hash: sha256Hex(accessToken),
      refresh_token_hash: sha256Hex(refreshToken),
      last_activity: new Date(),
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Revoke the current session: blacklist the presented access token and mark the
 * session inactive + clear its refresh token. After this, both the middleware's
 * blacklist check and its active-session check reject the token.
 */
export async function logoutSession(
  accessToken: string,
  sessionId: string,
  userId: string
): Promise<void> {
  if (accessToken) {
    await blacklistService.addToBlacklist(sha256Hex(accessToken), sessionId, userId);
  }

  await prisma.userSession.updateMany({
    where: { session_id: sessionId, user_id: userId, is_active: true },
    data: {
      is_active: false,
      refresh_token_hash: null,
      terminated_at: new Date(),
      terminated_by: 'user',
    },
  });
}

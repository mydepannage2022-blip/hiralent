import { Request, Response, NextFunction } from 'express';
import { verifyTokenWithDetails } from '../utils/jwt.util';
import * as blacklistService from '../services/auth/blacklist.service';
import * as sessionService from '../services/auth/session.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    role: string;
    agency_id?: string;
    session_id: string;
    is_email_verified?: boolean;
    email?: string;
    full_name?: string;
    company_id?: string;
  };
}

/**
 * Resolve the authenticated user from a raw bearer token, running the SAME three
 * mandatory checks in the SAME order for every entry point:
 *   1) revocation (blacklist) — a logged-out / terminated token is rejected,
 *   2) signature + expiry,
 *   3) the token carries a session_id AND that session is still active + unexpired.
 *
 * Kept in this file (not a separate module) on purpose: checkAuth is the single
 * source of truth for what "authenticated" means, and both the header-based
 * checkAuth and the SSE query-token guard (checkAuthQueryToken) call this — so the
 * logic can never drift between them. Returns the user on success, or a status +
 * message describing why the token was rejected.
 */
export type AuthResolution =
  | { ok: true; user: NonNullable<AuthenticatedRequest['user']> }
  | { ok: false; status: number; message: string };

export const resolveUserFromToken = async (token: string): Promise<AuthResolution> => {
  // 1) Revocation check — mandatory. A logged-out / terminated token is blacklisted.
  const isBlacklisted = await blacklistService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    return { ok: false, status: 401, message: 'Session terminated. Please login again.' };
  }

  // 2) Signature + expiry.
  const { payload, error, expired } = verifyTokenWithDetails(token);
  if (error || !payload) {
    return { ok: false, status: 401, message: expired ? 'Token expired' : 'Invalid token' };
  }

  // 3) The token MUST carry a session_id — no 'bypass' fallback. A token without a
  //    session cannot be tied to (and revoked via) a server-side session.
  if (!payload.session_id) {
    return { ok: false, status: 401, message: 'Active session required. Please login again.' };
  }

  // 4) The session must still be active + unexpired in the DB. This is what makes
  //    logout / terminate-session take effect immediately.
  const sessionActive = await sessionService.validateSession(payload.session_id, payload.user_id);
  if (!sessionActive) {
    return { ok: false, status: 401, message: 'Session expired or terminated. Please login again.' };
  }

  return {
    ok: true,
    user: {
      user_id: payload.user_id,
      role: payload.role,
      agency_id: payload.agency_id,
      session_id: payload.session_id,
      is_email_verified: payload.is_email_verified,
      email: payload.email,
      full_name: payload.full_name,
      company_id: payload.company_id ?? undefined,
    },
  };
};

export const checkAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Access token required' });
    }

    const token = authHeader.substring(7);

    const result = await resolveUserFromToken(token);
    if (result.ok === false) {
      return res.status(result.status).json({ error: true, message: result.message });
    }

    req.user = result.user;

    // (Optional) Enforce for company routes at middleware level:
    // if ((req.user.role === 'company' || req.user.role === 'company_admin') && !req.user.company_id) {
    //   return res.status(400).json({ success: false, message: 'Missing company_id in auth token' });
    // }

    next();
  } catch (error: any) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ error: true, message: 'Authentication failed' });
  }
};

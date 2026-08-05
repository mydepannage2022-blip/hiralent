import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, resolveUserFromToken } from './checkAuth.middleware';

/**
 * SSE-safe authentication.
 *
 * A browser `EventSource` cannot set an `Authorization` header, so streaming
 * endpoints (Server-Sent Events) cannot authenticate the normal way. This guard
 * accepts the access token from EITHER the `Authorization: Bearer` header OR an
 * `?access_token=` query param, then runs the exact same checks as checkAuth via
 * the shared `resolveUserFromToken` — so a streamed connection is held to the
 * same blacklist + active-session guarantees as every other request.
 *
 * Use this ONLY on SSE / EventSource routes. Everything else must use checkAuth so
 * access tokens are not routinely placed in URLs (query strings land in logs).
 */
export const checkAuthQueryToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const qp = req.query.access_token;
      if (typeof qp === 'string' && qp.length > 0) token = qp;
    }

    if (!token) {
      return res.status(401).json({ error: true, message: 'Access token required' });
    }

    const result = await resolveUserFromToken(token);
    if (result.ok === false) {
      return res.status(result.status).json({ error: true, message: result.message });
    }

    req.user = result.user;
    next();
  } catch (error: any) {
    console.error('❌ Auth (query-token) error:', error);
    res.status(500).json({ error: true, message: 'Authentication failed' });
  }
};

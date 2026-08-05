import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ⚠️ DEPRECATED — do NOT mount this on any route.
// This is a bare-jwt guard: it verifies the signature only. It does NOT check the
// token blacklist or the active session, so logout/terminate cannot revoke tokens
// on routes using it, and it accepts session-less tokens. Use `checkAuth`
// (middlewares/checkAuth.middleware.ts) instead. Kept only to avoid breaking imports.

type AuthUser = {
  user_id: string;
  role?: string;
  email?: string;
  [key: string]: any;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    let token: string | null =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    // ✅ Fallback cookie
    if (!token && (req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload | string;

    if (decoded && typeof decoded === 'object') {
      (req as any).user = decoded as AuthUser;
      return next();
    }

    return res.status(401).json({ error: 'Invalid token payload' });
  } catch (err: any) {
    console.error('Auth error:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

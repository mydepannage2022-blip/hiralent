import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireEnv } from '../config/requireEnv';
import prisma from '../lib/prisma';

// Read lazily at verify time — no publicly-known fallback string, and never
// evaluates before dotenv has populated process.env.
const getAdminJwtSecret = () => requireEnv('ADMIN_JWT_SECRET');

// Extend Express Request type to include admin
declare global {
  namespace Express {
    interface Request {
      admin?: {
        user_id: string;
        email: string;
        role: string;
        full_name: string;
      };
    }
  }
}

// Verify admin session token
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT
    const decoded = jwt.verify(token, getAdminJwtSecret()) as any;

    // Check if user is superadmin and authenticated (per the token claims)
    if (decoded.role !== 'superadmin' || !decoded.authenticated) {
      return res.status(403).json({
        ok: false,
        error: 'Insufficient permissions. Superadmin access required.'
      });
    }

    // SECURITY (Wave 4 review, F1): the admin token is a stateless ~8h JWT with no
    // server-side session. Without a live DB re-check, a deleted or demoted admin keeps
    // full access until the token expires (and could re-create itself, defeating the
    // last-admin guard). Re-verify against the DB on every request so delete/demote takes
    // effect immediately — the same "revocation is authoritative in the DB" guarantee that
    // checkAuth gives normal users via the session table.
    if (!decoded.user_id) {
      return res.status(401).json({ ok: false, error: 'Invalid authentication token' });
    }
    const current = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: { user_id: true, role: true, email: true, full_name: true },
    });
    if (!current || current.role !== 'superadmin') {
      return res.status(401).json({
        ok: false,
        error: 'Admin account is no longer active. Please login again.',
      });
    }

    // Attach admin info to request — trust the DB row, not stale token claims.
    req.admin = {
      user_id: current.user_id,
      email: current.email,
      role: current.role,
      full_name: current.full_name ?? decoded.full_name,
    };

    next();
  } catch (error: any) {
    console.error('[adminAuth] Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        ok: false, 
        error: 'Session expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      ok: false, 
      error: 'Invalid authentication token' 
    });
  }
}

// Optional: Check if request is from Tailscale VPN
export function requireTailscale(req: Request, res: Response, next: NextFunction) {
  // Only check if Tailscale is enabled
  if (process.env.TAILSCALE_ENABLED !== 'true') {
    return next();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress || '';
  const ip = clientIP.replace(/^::ffff:/, ''); // Clean IPv6 format
  
  // Tailscale IPs are in the 100.64.0.0/10 range
  const TAILSCALE_IP_RANGE = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/;
  
  if (!TAILSCALE_IP_RANGE.test(ip)) {
    console.warn(`[Tailscale] Blocked access from IP: ${ip}`);
    return res.status(403).json({ 
      ok: false, 
      error: 'Admin dashboard only accessible via secure VPN connection' 
    });
  }
  
  next();
}

// Combined security stack (use both middlewares)
export const adminSecurityStack = [
  requireTailscale,  // Check VPN (optional, can be disabled)
  requireSuperAdmin  // Check admin auth (always required)
];

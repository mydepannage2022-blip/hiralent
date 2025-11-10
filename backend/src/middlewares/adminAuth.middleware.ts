import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret-change-this';

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
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
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
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any;
    
    // Check if user is superadmin and authenticated
    if (decoded.role !== 'superadmin' || !decoded.authenticated) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Insufficient permissions. Superadmin access required.' 
      });
    }
    
    // Attach admin info to request
    req.admin = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name
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

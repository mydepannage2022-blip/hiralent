// backend/src/middlewares/checkAuth.middleware.ts (ENHANCED VERSION)

import { Request, Response, NextFunction } from 'express';
import { verifyTokenWithDetails } from '../utils/jwt.util';
import { getSessionByToken, updateSessionActivity } from '../services/auth/session.service'; 
import { hashPassword as hash } from '../utils/hash.util';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    role: string;
    agency_id?: string;
    session_id: string;
    is_email_verified?: boolean;
    email?: string;
    full_name?: string;
  };
}

export const checkAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: true, 
        message: 'Access token required' 
      });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const { payload, error, expired } = verifyTokenWithDetails(token);
    
    if (error || !payload) {
      return res.status(401).json({ 
        error: true, 
        message: expired ? 'Token expired' : 'Invalid token' 
      });
    }

    // SKIP ALL SESSION VALIDATION - JUST SET USER
    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      agency_id: payload.agency_id,
      session_id: payload.session_id || 'bypass',
    };

    console.log('✅ Auth successful for user:', payload.user_id);
    next();

  } catch (error: any) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Authentication failed' 
    });
  }
};

// Optional: Middleware for routes that don't require session validation
export const checkAuthLegacy = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: true, 
        message: 'Access token required' 
      });
    }

    const token = authHeader.substring(7);
    const { payload, error, expired } = verifyTokenWithDetails(token);
    
    if (error || !payload) {
      return res.status(401).json({ 
        error: true, 
        message: expired ? 'Token expired' : 'Invalid token' 
      });
    }

    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      agency_id: payload.agency_id,
      session_id: payload.session_id || 'unknown'
    };

    next();
  } catch (error: any) {
    console.error('Auth Legacy Middleware Error:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Authentication failed' 
    });
  }
};

// Middleware to check if user has active session
export const requireActiveSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.session_id || req.user.session_id === 'legacy') {
    return res.status(401).json({ 
      error: true, 
      message: 'Active session required. Please login again.' 
    });
  }
  next();
};
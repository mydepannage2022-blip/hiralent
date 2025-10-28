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

    // Check if token has session_id (new tokens should have this)
    if (!payload.session_id) {
      // Legacy token without session - still allow but log
      console.warn('Legacy token without session_id detected for user:', payload.user_id);
      req.user = {
        user_id: payload.user_id,
        role: payload.role,
        agency_id: payload.agency_id,
        session_id: 'legacy', // Mark as legacy
      };
      return next();
    }

    // Validate session exists and is active
    const tokenHash = await hash(token);
    const session = await getSessionByToken(tokenHash);
    
    if (!session) {
      return res.status(401).json({ 
        error: true, 
        message: 'Session expired or terminated' 
      });
    }

    // Verify session belongs to the user in token
    if (session.user_id !== payload.user_id) {
      return res.status(401).json({ 
        error: true, 
        message: 'Invalid session' 
      });
    }

    // Update session activity (async, don't wait)
    updateSessionActivity(payload.session_id).catch(error => {
      console.error('Failed to update session activity:', error);
    });

    // Attach user and session info to request
    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      agency_id: payload.agency_id,
      session_id: payload.session_id,
      email: session.user.email,
      full_name: session.user.full_name
    };

    next();
  } catch (error: any) {
    console.error('Auth Middleware Error:', error);
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
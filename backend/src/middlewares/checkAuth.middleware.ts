import { Request, Response, NextFunction } from 'express';
import { verifyTokenWithDetails } from '../utils/jwt.util';
import * as blacklistService from '../services/auth/blacklist.service';
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
    
    const isBlacklisted = await blacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ 
        error: true, 
        message: 'Session terminated. Please login again.' 
      });
    }

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
      session_id: payload.session_id || 'bypass',
      is_email_verified: payload.is_email_verified,
      email: payload.email,
      full_name: payload.full_name
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

export const requireActiveSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.session_id || req.user.session_id === 'legacy') {
    return res.status(401).json({ 
      error: true, 
      message: 'Active session required. Please login again.' 
    });
  }
  next();
};
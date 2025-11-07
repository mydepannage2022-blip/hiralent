// backend/src/utils/jwt.util.ts (SUPER SIMPLE VERSION)

import jwt from 'jsonwebtoken';

export interface JWTPayload {
  [key: string]: any;  // Accept any properties
}

export const generateToken = (payload: any, expiresIn: string = '7d'): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn } as any);
};

export const generateUserToken = (userId: string, expiresIn: string = '15m'): string => {
  return jwt.sign({ user_id: userId }, process.env.JWT_SECRET!, { expiresIn } as any);
};

// Legacy function for existing code
export const generateTokenLegacy = (
  userId: string,
  role: string,
  agencyId?: string
): string => {
  return jwt.sign({
    user_id: userId,
    role,
    ...(agencyId && { agency_id: agencyId })
  }, process.env.JWT_SECRET!, { expiresIn: '7d' } as any);
};

export const generateTokenWithSession = (
  userId: string,
  role: string,
  sessionId: string,
  agencyId?: string,
  deviceHash?: string,
  companyId?: string
): string => {
  return jwt.sign({
    user_id: userId,
    role,
    session_id: sessionId,
    ...(agencyId && { agency_id: agencyId }),
    ...(deviceHash && { device_hash: deviceHash }),
    ...(companyId && { company_id: companyId }) // ✅
  }, process.env.JWT_SECRET!, { expiresIn: '7d' } as any);
};



// Verify JWT token
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error: any) {
    console.error('JWT Verification Error:', error.message);
    return null;
  }
};

// Verify token with details
export const verifyTokenWithDetails = (token: string): { 
  payload: any; 
  error: string | null; 
  expired: boolean;
} => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return { payload: decoded, error: null, expired: false };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { payload: null, error: 'Token expired', expired: true };
    } else if (error.name === 'JsonWebTokenError') {
      return { payload: null, error: 'Invalid token', expired: false };
    } else {
      return { payload: null, error: 'Token verification failed', expired: false };
    }
  }
};

// Decode without verification
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error: any) {
    console.error('JWT Decode Error:', error.message);
    return null;
  }
};

// Get expiration
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error: any) {
    return null;
  }
};

// Check if expired
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return expiration < new Date();
};

// Refresh token
export const refreshToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return jwt.sign(decoded, process.env.JWT_SECRET!, { expiresIn: '7d' } as any);
  } catch (error: any) {
    console.error('Refresh Token Error:', error.message);
    return null;
  }
};

// Get session ID
export const getSessionIdFromToken = (token: string): string | null => {
  const payload = decodeToken(token);
  return payload?.session_id || null;
};

// Device hash
export const createDeviceHash = (userAgent: string, ip: string): string => {
  const crypto = require('crypto');
  const deviceString = `${userAgent}:${ip}`;
  return crypto.createHash('md5').update(deviceString).digest('hex');
};

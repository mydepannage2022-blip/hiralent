import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export type AgencyJWTPayload = {
  user_id: string;
  email: string;
  role: string;
  agency_id?: string;
  is_email_verified: boolean;
  iat?: number;
  exp?: number;
};

export type InvitationTokenPayload = {
  invitation_id: string;
  email: string;
  agency_id: string;
  type: 'recruiter_invite';
  iat?: number;
  exp?: number;
};

// Generate user JWT
export function generateAuthToken(payload: Omit<AgencyJWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'agency-platform',
    audience: 'agency-users'
  });
}

// Generate recruiter invitation token
export function generateInvitationToken(payload: Omit<InvitationTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'agency-platform',
    audience: 'recruiter-invites'
  });
}

// Verify auth token
export function verifyAuthToken(token: string): AgencyJWTPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'agency-platform',
    audience: 'agency-users'
  }) as AgencyJWTPayload;
}

// Verify invitation token
export function verifyInvitationToken(token: string): InvitationTokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'agency-platform',
    audience: 'recruiter-invites'
  }) as InvitationTokenPayload;
}

// Decode token (no verification)
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

// Get token expiration timestamp
export function getTokenExpiration(token: string): Date | null {
  const decoded = jwt.decode(token) as any;
  return decoded?.exp ? new Date(decoded.exp * 1000) : null;
}

// Check if token is expired
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  return expiration ? expiration < new Date() : true;
}

// Refresh auth token
export function refreshToken(oldToken: string): string {
  const decoded = verifyAuthToken(oldToken);
  const payload: Omit<AgencyJWTPayload, 'iat' | 'exp'> = {
    user_id: decoded.user_id,
    email: decoded.email,
    role: decoded.role,
    agency_id: decoded.agency_id,
    is_email_verified: decoded.is_email_verified
  };
  return generateAuthToken(payload);
}

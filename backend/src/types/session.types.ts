// backend/src/types/session.types.ts

export interface UserSession {
  session_id: string;
  user_id: string;
  device_name?: string;
  device_type?: string;
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;
  ip_address: string;
  location_country?: string;
  location_city?: string;
  location_region?: string;
  jwt_token_hash: string;
  is_current: boolean;
  last_activity: Date;
  login_time: Date;
  expires_at: Date;
  user_agent: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  is_active: boolean;
  terminated_at?: Date;
  terminated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionData {
  userId: string;
  jwtToken: string;
  userAgent: string;
  ipAddress: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

export interface SessionInfo {
  session_id: string;
  device_name: string;
  device_type: string;
  browser_name: string;
  browser_version: string;
  os_name: string;
  location_city: string;
  location_country: string;
  is_current: boolean;
  last_activity: Date;
  login_time: Date;
  ip_address: string;
}

export interface DeviceInfo {
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    name: string;
  };
}

export interface LocationInfo {
  country: string;
  city: string;
  region: string;
}

export interface JWTPayload {
  user_id: string;
  role: string;
  agency_id?: string;
  session_id: string;
  device_hash?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface AuthenticatedUser {
  user_id: string;
  role: string;
  agency_id?: string;
  session_id: string;
  is_email_verified?: boolean;
  email?: string;
  full_name?: string;
}

export interface SessionResponse {
  success: boolean;
  data?: SessionInfo[];
  count?: number;
  message?: string;
  error?: boolean;
}

export interface TerminateSessionResponse {
  success: boolean;
  message: string;
  terminated_count?: number;
  error?: boolean;
}

export interface CreateSessionResponse {
  success: boolean;
  session_id: string;
  message: string;
  error?: boolean;
}

// Request/Response types
export interface GetSessionsRequest {
  userId?: string; // For admin endpoints
}

export interface TerminateSessionRequest {
  sessionId: string;
}

export interface CreateSessionRequest {
  userId: string;
  jwtToken: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

// Enhanced Request interface for Express
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionInfo?: SessionInfo;
}

// Session validation types
export interface SessionValidationResult {
  isValid: boolean;
  session?: UserSession;
  error?: string;
}

export interface TokenValidationResult {
  payload: JWTPayload | null;
  error: string | null;
  expired: boolean;
}

// Device detection types
export interface BrowserInfo {
  name: string;
  version: string;
}

export interface OSInfo {
  name: string;
  version: string;
}

export interface DeviceTypeInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  name: string;
}

// Session analytics types (for future use)
export interface SessionAnalytics {
  total_sessions: number;
  active_sessions: number;
  devices_breakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browsers_breakdown: {
    chrome: number;
    firefox: number;
    safari: number;
    edge: number;
    other: number;
  };
  locations_breakdown: {
    [country: string]: number;
  };
}

// Error types
export interface SessionError {
  code: string;
  message: string;
  details?: any;
}

export type SessionErrorCode = 
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_TERMINATED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'MAX_SESSIONS_EXCEEDED'
  | 'DEVICE_NOT_RECOGNIZED'
  | 'LOCATION_BLOCKED';

// Enums
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown'
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

export enum TerminationReason {
  USER = 'user',
  SYSTEM = 'system',
  ADMIN = 'admin',
  SECURITY = 'security'
}

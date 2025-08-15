export interface SignupInput {
  email: string;
  password: string;
  full_name: string;
  role: "candidate" | "company" | "agency"; // Updated: removed "recruiter", "admin"
  agency_id?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

// ========== LOGIN RESPONSE TYPES ==========

// User with all possible profiles included (from Prisma)
export interface UserWithProfiles {
  user_id: string;
  email: string;
  agency_id: string | null;
  password_hash: string;
  full_name: string;
  role: string;
  is_email_verified: boolean;
  phone_number: string | null;
  position: string | null;
  linkedin_url: string | null;
  company_role: string | null;
  branding_notes: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  candidateProfile?: any;
  companyProfile?: any;
  agencyAdminProfile?: any;
  agency?: {
    agency_id: string;
    name: string;
    website: string | null;
    logo_url: string | null;
    status: string;
  };
}

// Clean user response (no sensitive data)
export interface CleanUser {
  user_id: string;
  email: string;
  is_email_verified: boolean;
  full_name: string;
  role: string;
  phone_number: string | null;
  position: string | null;
  linkedin_url: string | null;
  agency_id: string | null;
  agency?: {
    agency_id: string;
    name: string;
    website: string | null;
    logo_url: string | null;
    status: string;
  };
  profile: any; // Will contain candidateProfile, companyProfile, or agencyAdminProfile
}

// Success login response
export interface LoginSuccess {
  user: CleanUser;
  token: string;
}

// Error login response
export interface LoginError {
  error: true;
  message: string;
}

// Union type for login response
export type LoginResponse = LoginSuccess | LoginError;
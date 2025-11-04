export interface SignupInput {
  email: string;
  password: string;
  full_name: string;
  role: "candidate" | "company_admin" | "agency_admin" | "superadmin";
}
// ✅ NEW: Admin Auth Types
export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  tempToken: string;
  requiresMFA: boolean;
  mfaSetup: boolean; // If true, admin needs to setup MFA first
}

export interface SetupMFAInput {
  tempToken: string;
}

export interface SetupMFAResponse {
  success: boolean;
  qrCode: string; // Base64 image data URL
  secret: string; // Backup secret key
  manualEntryKey: string; // For manual entry
}

export interface VerifyMFAInput {
  tempToken: string;
  mfaToken: string; // 6-digit code from authenticator app
}

export interface AdminSessionResponse {
  success: boolean;
  sessionToken: string;
  admin: {
    user_id: string;
    email: string;
    full_name: string;
  };
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
  
  // Add candidateSkills relation for login function
  candidateSkills?: Array<{
    skill_id: string;
    candidate_id: string;
    skill_name: string;
    skill_category: string | null;
    proficiency: string | null;
    years_experience: number | null;
    confidence_score: number | null;
    source_type: string;
    source_document_id: string | null;
    is_verified: boolean;
    created_at: Date;
    updated_at: Date;
  }>;
  
  agency?: {
    agency_id: string;
    name: string;
    website: string | null;
    logo_url: string | null;
    status: string;
  };
}

// ✅ UPDATED: Clean user response (no profile inside)
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
  // ❌ REMOVED: profile field
}

// ✅ NEW: Profile types based on role
export interface CandidateProfile {
  candidate_id: string;
  resume_url?: string | null;
  video_intro_url?: string | null;
  profile_picture_url?: string | null;
  headline?: string | null;
  about_me?: string | null;
  skills?: any; // Changed: Can be string[] (IDs) or PopulatedSkill[] depending on context
  education?: string | null;
  experience?: string | null;
  languages?: string | null;
  location?: string | null;
  city?: string | null;
  postal_code?: number | null;
  preferred_locations?: string | null;
  minimum_salary_amount?: number | null;
  payment_period?: string | null;
  job_benefits?: string | null;
  links?: string | null;
  created_at: string; // Changed to string for ISO format consistency
  updated_at: string; // Changed to string for ISO format consistency
}

export interface CompanyProfile {
  company_id: string;
  company_name?: string | null;
  display_name?: string | null;
  industry?: string | null;
  company_size?: string | null;
  website?: string | null;
  headquarters?: string | null;
  founded_year?: number | null;
  description?: string | null;
  contact_number?: string | null;
  linkedin_profile?: string | null;
  twitter_handle?: string | null;
  facebook_page?: string | null;
  business_type?: string | null;
  registration_number?: string | null;
  tax_id?: string | null;
  employee_count?: number | null;
  annual_revenue?: string | null;
  hiring_volume?: string | null;
  typical_roles?: string[] | null;
  hiring_regions?: string[] | null;
  remote_policy?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  verified: boolean;
  verification_date?: Date | null;
  rating?: number | null;
  total_jobs_posted?: number | null;
  active_jobs_count?: number | null;
  created_at: string; // Changed to string for ISO format consistency
  updated_at: string; // Changed to string for ISO format consistency
}

export interface AgencyAdminProfile {
  admin_id: string;
  phone_number?: string | null;
  position?: string | null;
  linkedin_url?: string | null;
  company_role?: string | null;
  branding_notes?: string | null;
  license_details?: string | null;
  specialization?: string[] | null;
  languages?: string[] | null;
  years_experience?: number | null;
  certifications?: string[] | null;
  created_at: string; // Changed to string for ISO format consistency
  updated_at: string; // Changed to string for ISO format consistency
}

// ✅ UPDATED: Success login response with separate profile
export interface LoginSuccess {
  user: CleanUser;
  profile: CandidateProfile | CompanyProfile | AgencyAdminProfile | null; // ✅ Separate profile object
  token: string;
}

// Error login response (unchanged)
export interface LoginError {
  error: true;
  message: string;
}

// Union type for login response (unchanged)
export type LoginResponse = LoginSuccess | LoginError;




// ________________________________________________________________________________________________________________________________________________________

export interface DeleteAccountServiceRequest {
  userId: string;
  confirmation?: string;
  reason?: string;
  feedback?: string;
}

export interface DeleteAccountServiceResponse {
  success: boolean;
  message: string;
  data: {
    deleted_user_id: string;
    deleted_user_email: string;
    deleted_user_name: string;
    deleted_role: string;
    related_records_deleted: RelatedRecordsCount;
    deletion_timestamp: string;
  };
}

export interface RelatedRecordsCount {
  candidateDocuments: number;
  uploadedDocuments: number;
  jobsPosted: number;
  relocationCases: number;
  filesToDelete: number;
}

export interface UserDeletionSummary {
  user_info: {
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: Date;
  };
  related_records_count: {
    candidateDocuments: number;
    uploadedDocuments: number;
    jobsPosted: number;
    jobApplications: number;
    assessments: number;
    notifications: number;
    relocationCases: number;
    agencyReviews: number;
    invitationsSent: number;
  };
  estimated_deletion_impact: {
    database_records: number;
    profile_exists: boolean;
  };
}

export interface FileCleanupResult {
  deleted_count: number;
  failed_count: number;
  total_files: number;
  failed_files: string[];
}

export interface UserWithDeletionData {
  user_id: string;
  role: string;
  email: string;
  full_name: string;
  candidateProfile?: {
    profile_picture_url?: string | null;
    resume_url?: string | null;
    video_intro_url?: string | null;
    resume_application_url?: string | null;
  } | null;
  companyProfile?: {
    logo_url?: string | null;
    banner_url?: string | null;
  } | null;
  agencyAdminProfile?: {
    admin_id: string;
  } | null;
  candidateDocuments?: {
    file_path?: string | null;
    document_id: string;
  }[];
  uploadedDocuments?: {
    storage_key: string;
    preview_key?: string | null;
    document_id: string;
  }[];
  jobsPosted?: {
    job_id: string;
  }[];
  relocationCases?: {
    case_id: string;
  }[];
}

export type DeleteAccountErrorCode = 
  | string
  | string 
  | string
  | string
  | string
  | string
  | string;

export interface DeleteAccountError extends Error {
  code?: DeleteAccountErrorCode;
  details?: any;
  user_id?: string;
}

export interface DeleteAccountAuditLog {
  action: string;
  user_id: string;
  user_email: string;
  user_role: string;
  reason?: string;
  feedback?: string;
  related_records_count: RelatedRecordsCount;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  data: {
    deleted_user_id: string;
    deleted_user_email: string;
    deleted_user_name: string;
    deleted_role: string;
    related_records_deleted: {
      candidateDocuments: number;
      uploadedDocuments: number;
      jobsPosted: number;
      relocationCases: number;
      filesToDelete: number;
    };
    deletion_timestamp: string;
  };
}

export interface DeleteAccountErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

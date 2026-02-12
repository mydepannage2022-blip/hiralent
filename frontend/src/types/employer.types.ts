// ==================== COMPANY PROFILE TYPES ====================

export type CompanySize = "startup" | "small" | "medium" | "large" | "enterprise";
export type BusinessType = "public" | "private" | "non-profit" | "government";
export type RemotePolicy = "fully_remote" | "hybrid" | "office_only";
export type HiringVolume = "low" | "medium" | "high";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

// ==================== MAIN PROFILE INTERFACE ====================

export interface CompanyProfile {
  company_id: string;

  // Basic Info
  company_name: string | null;
  display_name: string | null;
  industry: string | null;
  company_size: CompanySize | null;
  website: string | null;
  headquarters: string | null;
  founded_year: number | null;
  description: string | null;

  // Contact & Social
  contact_number: string | null;
  linkedin_profile: string | null;
  twitter_handle: string | null;
  facebook_page: string | null;

  // Business Details
  business_type: BusinessType | null;
  registration_number: string | null;
  tax_id: string | null;
  employee_count: number | null;
  annual_revenue: string | null;
  full_address: string | null;

  // Verification
  verification_status: VerificationStatus;
  verification_submitted_at: string | null;
  verification_notes: string | null;

  // Hiring Details
  hiring_volume: HiringVolume | null;
  typical_roles: string[];
  hiring_regions: string[];
  remote_policy: RemotePolicy | null;

  // Platform Specific
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  verification_date: string | null;
  rating: number | null;
  total_jobs_posted: number | null;
  active_jobs_count: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ==================== API RESPONSES ====================

export interface CompanyProfileResponse {
  success: boolean;
  profile: CompanyProfile;
}

export interface CompanyStatsResponse {
  success: boolean;
  profile: {
    company_id: string;
    company_name: string;
    total_jobs_posted: number;
    active_jobs_count: number;
    rating: number | null;
    verified: boolean;
    created_at: string;
  };
  metrics: {
    total_jobs: number;
    active_jobs: number;
    profile_completion: number;
    member_since: string;
    is_verified: boolean;
    rating: number | null;
  };
}

// ==================== UPDATE PAYLOADS ====================

export interface UpdateCompanyBasicInfoPayload {
  company_name?: string;
  display_name?: string;
  industry?: string;
  company_size?: CompanySize;
  website?: string;
  headquarters?: string;
  founded_year?: number;
  description?: string;
}

export interface UpdateCompanyContactPayload {
  contact_number?: string;
  full_address?: string;
  linkedin_profile?: string;
  twitter_handle?: string;
  facebook_page?: string;
}

export interface UpdateCompanyBusinessPayload {
  business_type?: BusinessType;
  registration_number?: string;
  tax_id?: string;
  employee_count?: number;
  annual_revenue?: string;
}

export interface UpdateCompanyHiringPayload {
  hiring_volume?: HiringVolume;
  typical_roles?: string[];
  hiring_regions?: string[];
  remote_policy?: RemotePolicy;
}

export interface UpdateCompanyProfilePayload {
  // Basic Info
  company_name?: string;
  display_name?: string;
  industry?: string;
  company_size?: CompanySize;
  website?: string;
  headquarters?: string;
  founded_year?: number;
  description?: string;

  // Contact & Social
  contact_number?: string;
  full_address?: string;
  linkedin_profile?: string;
  twitter_handle?: string;
  facebook_page?: string;

  // Business Details
  business_type?: BusinessType;
  registration_number?: string;
  tax_id?: string;
  employee_count?: number;
  annual_revenue?: string;

  // Hiring Details
  hiring_volume?: HiringVolume;
  typical_roles?: string[];
  hiring_regions?: string[];
  remote_policy?: RemotePolicy;

  // Images
  logo_url?: string;
  banner_url?: string;
}

// ==================== PROFILE COMPLETENESS ====================

export interface ProfileCompletenessScore {
  overall: number;
  sections: {
    basic_info: number;
    contact: number;
    business: number;
    hiring: number;
    branding: number;
    social: number;
  };
  missing_fields: string[];
  suggestions: string[];
}

// ==================== UI HELPERS ====================

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  startup: "Startup (1-10)",
  small: "Small (11-50)",
  medium: "Medium (51-200)",
  large: "Large (201-1000)",
  enterprise: "Enterprise (1000+)",
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  public: "Public Company",
  private: "Private Company",
  "non-profit": "Non-Profit",
  government: "Government",
};

export const REMOTE_POLICY_LABELS: Record<RemotePolicy, string> = {
  fully_remote: "Fully Remote",
  hybrid: "Hybrid",
  office_only: "Office Only",
};

export const HIRING_VOLUME_LABELS: Record<HiringVolume, string> = {
  low: "Low (1-5 hires/month)",
  medium: "Medium (6-20 hires/month)",
  high: "High (20+ hires/month)",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified: "Not Verified",
  pending: "Verification Pending",
  verified: "Verified",
  rejected: "Verification Rejected",
};

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  unverified: "#888888",
  pending: "#f59e0b",
  verified: "#16a34a",
  rejected: "#dc2626",
};

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Transportation",
  "Media & Entertainment",
  "Hospitality",
  "Construction",
  "Energy",
  "Agriculture",
  "Legal",
  "Consulting",
  "Non-Profit",
  "Government",
  "Other",
];

export const COMPANY_SIZE_OPTIONS = [
  { value: "startup", label: "Startup (1-10)" },
  { value: "small", label: "Small (11-50)" },
  { value: "medium", label: "Medium (51-200)" },
  { value: "large", label: "Large (201-1000)" },
  { value: "enterprise", label: "Enterprise (1000+)" },
];

export const COMPANY_TYPE_OPTIONS = [
  { value: "public", label: "Public Company" },
  { value: "private", label: "Private Company" },
  { value: "non-profit", label: "Non-Profit" },
  { value: "government", label: "Government" },
];

// Alias for backward compatibility
export type UpdateBusinessPayload = UpdateCompanyBusinessPayload & {
  industry?: string;
  company_size?: string;
  company_type?: string;
  founded_year?: number;
};

// Alias for CompanyInfoForm
export interface UpdateCompanyInfoPayload {
  name?: string;
  tagline?: string;
  description?: string;
  slug?: string;
}

// Alias for ContactForm
export interface UpdateContactPayload {
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

// Work Type Options
export const WORK_TYPE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

// Benefit Options
export const BENEFIT_OPTIONS = [
  "Health Insurance",
  "Dental Insurance",
  "Vision Insurance",
  "401(k) / Retirement",
  "Paid Time Off",
  "Remote Work",
  "Flexible Hours",
  "Stock Options",
  "Professional Development",
  "Gym Membership",
  "Free Meals",
  "Parental Leave",
  "Mental Health Support",
  "Education Stipend",
  "Home Office Stipend",
];

// Alias for HiringPreferencesForm
export interface UpdateHiringPayload {
  work_types?: string[];
  benefits?: string[];
  culture_description?: string;
  tech_stack?: string[];
}

// Alias for SocialLinksForm
export interface UpdateSocialLinksPayload {
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}


// ==================== MISSING RESPONSE TYPES ====================

export interface ProfileCompletenessResponse {
  success: boolean;
  completeness: number;
  score: number;
  sections: Record<string, boolean>;
}

export interface PublicCompanyProfileResponse {
  success: boolean;
  profile: CompanyProfile;
}

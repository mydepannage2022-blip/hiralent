// backend/src/types/employer.types.ts

export interface CompanyProfile {
  id: string;
  user_id: string;
  
  // Basic Info
  company_name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  
  // Contact Info
  email?: string;
  phone?: string;
  location?: string;
  address?: string;
  
  // Business Details
  industry?: string;
  company_size?: string;
  company_type?: string;
  founded_year?: number;
  registration_number?: string;
  tax_id?: string;
  
  // Hiring Preferences
  work_types?: string[]; // ['remote', 'hybrid', 'onsite']
  benefits?: string[];
  tech_stack?: string[];
  culture_description?: string;
  
  // Social Links
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  
  // Meta
  is_verified: boolean;
  profile_completeness: number;
  created_at: Date;
  updated_at: Date;
}

// Update payloads for each section
export interface UpdateCompanyInfoPayload {
  company_name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
}

export interface UpdateContactPayload {
  email?: string;
  phone?: string;
  location?: string;
  address?: string;
}

export interface UpdateBusinessDetailsPayload {
  industry?: string;
  company_size?: string;
  company_type?: string;
  founded_year?: number;
  registration_number?: string;
  tax_id?: string;
}

export interface UpdateHiringPreferencesPayload {
  work_types?: string[];
  benefits?: string[];
  tech_stack?: string[];
  culture_description?: string;
}

export interface UpdateSocialLinksPayload {
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}

// Public profile response (limited fields)
export interface PublicCompanyProfile {
  id: string;
  company_name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  location?: string;
  industry?: string;
  company_size?: string;
  company_type?: string;
  founded_year?: number;
  work_types?: string[];
  benefits?: string[];
  tech_stack?: string[];
  culture_description?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  is_verified: boolean;
}

// Profile completeness calculation
export interface ProfileSection {
  name: string;
  key: string;
  weight: number;
  fields: string[];
}

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    name: "Basic Info",
    key: "basic_info",
    weight: 25,
    fields: ["company_name", "slug", "tagline", "description", "logo_url"],
  },
  {
    name: "Contact Details",
    key: "contact",
    weight: 20,
    fields: ["email", "phone", "location", "address"],
  },
  {
    name: "Business Details",
    key: "business",
    weight: 20,
    fields: ["industry", "company_size", "company_type", "founded_year"],
  },
  {
    name: "Hiring Preferences",
    key: "hiring",
    weight: 20,
    fields: ["work_types", "benefits", "tech_stack", "culture_description"],
  },
  {
    name: "Social Links",
    key: "social",
    weight: 15,
    fields: ["website", "linkedin_url"],
  },
];

// Constants
export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
] as const;

export const COMPANY_TYPES = [
  "Private",
  "Public",
  "Startup",
  "Non-Profit",
  "Government",
  "Agency",
  "Consultancy",
] as const;

export const WORK_TYPES = ["remote", "hybrid", "onsite"] as const;

export const COMMON_BENEFITS = [
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
] as const;

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Retail",
  "Media & Entertainment",
  "Real Estate",
  "Transportation",
  "Energy",
  "Agriculture",
  "Hospitality",
  "Legal",
  "Marketing & Advertising",
  "Consulting",
  "Non-Profit",
  "Government",
  "Other",
] as const;

// ==================== PUBLIC PROFILE TYPES ====================

export interface PublicProfileData {
  full_name: string;
  position: string | null;
  linkedin_url: string | null;
  profile_picture_url: string | null;
  headline: string | null;
  about_me: string | null;
  location: string | null;
  city: string | null;
  languages: string | null; // JSON string
  video_intro_url: string | null;
  links: string | null; // JSON string
  resume_application_url: string | null;
  skills: PublicSkillData[];
  experience: string | null; // JSON string
  education: string | null; // JSON string
}

export interface PublicSkillData {
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number | null;
  is_verified: boolean;
}

// Parsed data interfaces (after JSON.parse)
export interface ParsedExperience {
  job_title: string;
  company: string;
  duration: string;
  years: string | number;
  description: string;
  currently_working?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface ParsedEducation {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  currently_studying?: boolean;
}

export interface ParsedLanguage {
  language: string;
  proficiency: string;
  notes?: string;
}

export interface ParsedLink {
  platform: string;
  url: string;
  display_name?: string;
}

// ==================== COMPONENT PROPS TYPES ====================

export interface HeroProps {
  profile: PublicProfileData;
}

export interface SkillsSectionProps {
  skills: PublicSkillData[];
}

export interface ExperienceSectionProps {
  experience: ParsedExperience[];
}

export interface EducationSectionProps {
  education: ParsedEducation[];
}

export interface ProfileCardProps {
  profile: PublicProfileData;
}

// ==================== API RESPONSE TYPES ====================

export interface PublicProfileResponse {
  success: boolean;
  data: PublicProfileData;
  message: string;
}

// ==================== EXISTING TYPES (from original file) ====================

export interface BasicInfoData {
  full_name?: string;
  phone_number?: string;
  about_me?: string;
  location?: string;
}

export interface SkillData {
  skill_id?: string;       
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  source_type?: string;   
  is_verified?: boolean;
}

export interface ExperienceData {
  job_title: string;
  company: string;
  duration: string;
  years: number;
  description: string;
  currently_working: boolean;
  start_date?: string;
  end_date?: string;
}

export interface EducationData {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  currently_studying: boolean;
}

export interface SocialLinkData {
  platform: string;
  url: string;
  display_name: string;
}

export interface JobBenefitData {
  benefit_type: string;
  importance: string;
  notes?: string;
}

// ==================== UTILITY TYPES ====================

export interface LocationData {
  location: string;
  city?: string;
  country?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

// ==================== SKILL CATEGORIES ====================

export type SkillCategory = 'technical' | 'soft' | 'language' | 'certification';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// ==================== COMPONENT STATE TYPES ====================

export interface ProfileLoadingState {
  isLoading: boolean;
  error: string | null;
  data: PublicProfileData | null;
}

export interface SkillFilterState {
  category: SkillCategory | 'all';
  verifiedOnly: boolean;
  searchTerm: string;
}




export interface ResumeQualityData {
  completionPercentage: number;
  suggestions: QualitySuggestion[];
}

export interface QualitySuggestion {
  id: string;
  text: string;
  percentage: number;
  completed: boolean;
}

export interface ResumeLink {
  url: string;
  qrCodeData: string;
}
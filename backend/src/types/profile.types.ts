// src/types/profile.types.ts

// ==================== PROFILE COMPLETENESS ====================

export interface ProfileCompletenessResult {
  overall_score: number;
  basic_info_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  document_score: number;
  profile_picture_score: number;
  headline_score: number;
  missing_fields: string[];
  suggestions: string[];
}

// ==================== SCORING ====================

export interface ScoreBreakdown {
  total_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  completeness_score: number;
}

export interface ScoreHistoryItem {
  history_id: string;
  score_value: number;
  trigger_event: string;
  timestamp: Date;
}

// ==================== BADGES ====================

export interface BadgeEvaluation {
  badge_id: string;
  should_have: boolean;
  currently_has: boolean;
  action: 'award' | 'revoke' | 'none';
}

export interface BadgeWithProgress {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_earned: boolean;
  awarded_at?: Date;
  progress?: {
    current: number;
    required: number;
    percentage: number;
  };
}

// ==================== AUTOFILL ====================

export interface PersonalInfo {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface AutofillSkill {
  skill_name: string;
  skill_category: string;
  proficiency: string;
  years_experience?: number;
  source?: string;
}

export interface AutofillExperience {
  job_title: string;
  company: string;
  duration: string;
  description: string;
  technologies?: string[];
  start_date?: string;
  end_date?: string;
  currently_working?: boolean;
}

export interface AutofillEducation {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  honors?: string;
  currently_studying?: boolean;
}

export interface AutofillProject {
  name: string;
  description: string;
  technologies?: string[];
  status?: string;
  project_url?: string;
  github_url?: string;
  start_date?: string;
  end_date?: string;
  is_ongoing?: boolean;
}

export interface AutofillCertification {
  name: string;
  issuer: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface AutofillLanguage {
  language: string;
  proficiency: string;
}

export interface ParsedResumeData {
  skills: AutofillSkill[];
  experience: AutofillExperience[];
  education: AutofillEducation[];
  projects?: AutofillProject[];
  certifications?: AutofillCertification[];
  languages?: AutofillLanguage[];
  personal_info?: PersonalInfo;
  headline?: string;
  about_me?: string;
}

export interface AutofillFieldData {
  mapping_id: string;
  field_name: string;
  extracted_value: any;
  confidence: number;
  is_confirmed: boolean;
  confirmed_value?: any;
}

export interface AutofillPreviewResult {
  session_id: string;
  status: string;
  parsed_data: ParsedResumeData;
  mappings: AutofillFieldData[];
  confidence_scores: {
    [key: string]: number;
  };
}

export interface ResumeParseResult {
  success: boolean;
  parsed_data: ParsedResumeData;
  confidence_scores: {
    [key: string]: number;
  };
}

// ==================== CERTIFICATIONS ====================

export interface CertificationInput {
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface CertificationWithStatus {
  certification_id: string;
  name: string;
  issuer: string;
  issue_date: Date;
  expiry_date?: Date;
  credential_id?: string;
  credential_url?: string;
  is_verified: boolean;
  is_expired: boolean;
  days_until_expiry?: number;
}

// ==================== EVENTS ====================

export interface ProfileEventPayload {
  event_type: 
    | 'profile_updated' 
    | 'profile_ready' 
    | 'score_updated' 
    | 'badge_earned' 
    | 'badge_revoked'
    | 'skill_added'
    | 'skill_verified'
    | 'certification_added'
    | 'cv_uploaded'
    | 'autofill_applied';
  candidate_id: string;
  event_data: any;
  timestamp: Date;
}

// ==================== PROFILE SECTIONS ====================

export interface SkillData {
  skill_id?: string;
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  is_verified?: boolean;
  source_type?: string;
}

export interface ExperienceData {
  job_title: string;
  company: string;
  duration: string;
  years?: number;
  description: string;
  currently_working?: boolean;
  start_date?: string;
  end_date?: string;
  technologies?: string[];
}

export interface EducationData {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  honors?: string;
  currently_studying?: boolean;
}

export interface ProjectData {
  id?: string;
  name: string;
  description: string;
  technologies: string[];
  project_url?: string;
  github_url?: string;
  start_date?: string;
  end_date?: string;
  is_ongoing?: boolean;
  status?: string;
}

// ==================== SERVICE RESPONSES ====================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ProfileUpdateResult {
  success: boolean;
  updated_fields: string[];
  completeness_change?: number;
  score_change?: number;
}

export interface AutofillApplyResult {
  success: boolean;
  message: string;
  applied_fields?: string[];
  skills_added?: number;
  certifications_added?: number;
  error?: string;
}

// ==================== BADGE RULES ====================

export interface BadgeRule {
  rule_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  condition: (candidateId: string) => Promise<boolean>;
}

export interface BadgeCriteria {
  completeness?: number;
  validated_skills_min?: number;
  score_min?: number;
  certifications_min?: number;
  documents_verified?: boolean;
}

// ==================== SCORING ALGORITHMS ====================

export interface ScoringWeights {
  skills: number;      // 0.4 (40%)
  experience: number;  // 0.3 (30%)
  education: number;   // 0.2 (20%)
  completeness: number; // 0.1 (10%)
}

export interface ScoreCalculationContext {
  candidate_id: string;
  skills_count: number;
  validated_skills_count: number;
  experience_years: number;
  experience_count: number;
  education_level: string;
  completeness_score: number;
}

// ==================== PROFILE DATA (for context/state) ====================

export interface CandidateProfileData {
  candidate_id: string;
  headline?: string;
  about_me?: string;
  location?: string;
  personal_info?: PersonalInfo;
  skills?: string[]; // Array of skill names
  experience?: string; // JSON string
  education?: string; // JSON string
  languages?: string; // JSON string
  projects?: string; // JSON string
  certifications?: string; // JSON string
  profile_picture_url?: string;
  resume_url?: string;
  resume_application_url?: string;
  links?: string; // JSON string of social links
  created_at?: Date;
  updated_at?: Date;
}
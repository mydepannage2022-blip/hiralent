// ==================== CANDIDATE FLOW TYPES ====================

// File upload related types
export interface DocumentUploadInput {
  candidateId: string;
  file: Express.Multer.File;
}

export interface ParsedDocumentResult {
  text: string;
  metadata: {
    pages?: number;
    title?: string;
    author?: string;
    wordCount: number;
    fileSize: number;
  };
}

export interface DocumentValidationResult {
  isValid: boolean;
  error?: string;
}

// Skill extraction types
export interface ExtractedSkill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
}

export interface ExtractedExperience {
  job_title: string;
  company: string;
  duration: string;
  years: number;
  description: string;
}

export interface ExtractedEducation {
  degree: string;
  institution: string;
  year: string;
  field: string;
}

export interface AIExtractionResult {
  headline: string;
  skills: ExtractedSkill[];
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  languages: ExtractedLanguage[];  // Add this line
  summary: string;
}

// Add new interface after AIExtractionResult:
export interface ExtractedLanguage {
  language: string;
  proficiency: 'native' | 'fluent' | 'intermediate' | 'basic';
  notes?: string;
}

// Career prediction types
export interface PredictedRole {
  title: string;
  match_score: number;
  reasoning: string;
}

export interface CareerPathStep {
  role: string;
  timeline: string;
  requirements: string[];
}

export interface SkillGap {
  skill: string;
  importance: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface SalaryPrediction {
  current_range: {
    min: number;
    max: number;
  };
  growth_potential: {
    min: number;
    max: number;
  };
}

export interface CareerPredictionResult {
  current_role: string;
  predicted_roles: PredictedRole[];
  career_path: CareerPathStep[];
  skill_gaps: SkillGap[];
  salary_prediction: SalaryPrediction;
  confidence_score: number;
}

// Job matching types
export interface JobRequirements {
  title: string;
  required_skills?: string;
  description: string;
  location: string;
}

export interface JobMatchReasoning {
  overall_match: number;
  strengths: string[];
  concerns: string[];
  reasoning: string;
  recommendation: 'strong_match' | 'good_match' | 'moderate_match' | 'poor_match';
}

export interface JobRecommendation {
  job_id: string;
  title: string;
  company: string;
  location: string;
  salary_range?: string;
  match_score: number;
  match_reasoning: JobMatchReasoning;
  created_at: Date;
}

// Profile completeness types
export interface ProfileCompletenessScore {
  overall_score: number;
  basic_info_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  document_score: number;
  headline_score: number;
  profile_picture_score: number; 
  missing_fields: string[];
  suggestions: string[];
}

// Profile summary types
export interface CandidateBasicInfo {
  name: string;
  email: string;
  phone?: string;
  headline?: string;
}

export interface CandidateDocumentInfo {
  id: string;
  name: string;
  upload_status: string;
  extraction_status?: string;
}

export interface HeadlineUpdateResult {
  success: boolean;
  headline: string;
  message: string;
}


export interface CandidateProfileSummary {
  basic_info: CandidateBasicInfo;
  skills: PopulatedSkill[]; 
  profile_completeness?: ProfileCompletenessScore;
  career_prediction?: CareerPredictionResult;
  documents: CandidateDocumentInfo[];
}

export interface UpdateHeadlineInput {
  headline: string; 
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  meta?: {
    total?: number;
    limit?: number;
    page?: number;
  };
}

export interface CVUploadResponse {
  success: boolean;
  document_id: string;
  message: string;
  document: {
    name: string;
    upload_status: string;
    extraction_status: string | null;
    candidate_id: string;
    whole_document?: string;
  };
}

// Vector database types
export interface VectorMetadata {
  skills_count: number;
  full_name: string;
  email: string;
  [key: string]: any;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata?: {
    jobId?: string;
    candidateId?: string;
    [key: string]: any;
  };
}

// Service method inputs
export interface UpdateVectorInput {
  candidateId: string;
}

export interface JobRecommendationInput {
  candidateId: string;
  limit?: number;
}

export interface CareerPredictionInput {
  candidateId: string;
}

// New types for candidate update APIs
export interface UpdateLocationInput {
  location?: string;
  postalCode?: number;
}

export interface UpdateSalaryInput {
  minimumSalary?: number;
  paymentPeriod?: 'monthly' | 'yearly' | 'weekly';
}

// Utility types for OpenAI
export interface OpenAISkillExtractionPrompt {
  text: string;
}

export interface OpenAICareerPredictionPrompt {
  candidateData: {
    skills: ExtractedSkill[];
    education: ExtractedEducation[];
    experience: ExtractedExperience[];
  };
}

export interface OpenAIJobMatchPrompt {
  candidateSkills: any[];
  jobRequirements: JobRequirements;
}

// Error types
export interface CandidateServiceError extends Error {
  code?: string;
  statusCode?: number;
}

// Database model types (extending Prisma generated types)
export interface CandidateSkillWithDocument {
  skill_id: string;
  candidate_id: string;
  skill_name: string;
  skill_category?: string;
  proficiency?: string;
  years_experience?: number;
  confidence_score?: number;
  source_type: string;
  source_document_id?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// Request parameter types
export interface CandidateParamsRequest {
  candidateId?: string;
}

export interface JobRecommendationQuery {
  limit?: string;
}

// Health check types
export interface HealthCheckResponse {
  success: boolean;
  message: string;
  timestamp: string;
  services: {
    database: string;
    ai_services: string;
    vector_db: string;
  };
}

export interface ProfilePictureUploadResponse {
  success: boolean;
  profile_picture_url: string;
  old_picture_url?: string;
  message: string;
}
export interface ProfilePictureUploadResult{
  success: boolean;
  profile_picture_url: string;
  old_picture_url?: string;
  message: string;
}




// Basic Info Update Types
export interface UpdateBasicInfoInput {
  full_name?: string;
  phone_number?: string;
  email?: string;
}

export interface BasicInfoUpdateResult {
  success: boolean;
  message: string;
  updated_fields: string[];
}

// Skills Management Types
export interface UpdateSkillsInput {
  skills: CandidateSkillInput[];
}

export interface CandidateSkillInput {
  skill_id?: string;
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
}

export interface AddSkillInput {
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
}

export interface SkillUpdateResult {
  success: boolean;
  message: string;
  skills_count: number;
}

// Experience Management Types
export interface UpdateExperienceInput {
  experiences: ExperienceInput[];
}

export interface ExperienceInput {
  job_title: string;
  company: string;
  duration: string;
  years: number;
  description: string;
  currently_working?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface AddExperienceInput {
  job_title: string;
  company: string;
  duration: string;
  years: number;
  description: string;
  currently_working?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface ExperienceUpdateResult {
  success: boolean;
  message: string;
  experiences_count: number;
}

// Education Management Types
export interface UpdateEducationInput {
  education: EducationInput[];
}

export interface EducationInput {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  currently_studying?: boolean;
}

export interface AddEducationInput {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  currently_studying?: boolean;
}

export interface EducationUpdateResult {
  success: boolean;
  message: string;
  education_count: number;
}

// Profile Section Update Types
export interface ProfileSectionUpdateInput {
  section: 'basic_info' | 'skills' | 'experience' | 'education';
  data: any;
}

export interface ProfileSectionUpdateResult {
  success: boolean;
  message: string;
  section: string;
  completion_score: number;
}

// Bulk Profile Update Types
export interface BulkProfileUpdateInput {
  basic_info?: UpdateBasicInfoInput;
  skills?: CandidateSkillInput[];
  experience?: ExperienceInput[];
  education?: EducationInput[];
}

export interface BulkProfileUpdateResult {
  success: boolean;
  message: string;
  updated_sections: string[];
  new_completion_score: number;
}

// Add these new types to candidate.types.ts

// Enhanced Basic Info Types
export interface UpdateBasicInfoInput {
  full_name?: string;
  phone_number?: string;
  about_me?: string;  // NEW
  location?: string;  // NEW
}

// Social Links Types
export interface SocialLink {
  platform: 'github' | 'linkedin' | 'portfolio' | 'twitter' | 'behance' | 'dribbble' | 'other';
  url: string;
  display_name?: string;
}

export interface UpdateLinksInput {
  links: SocialLink[];
}

export interface LinksUpdateResult {
  success: boolean;
  message: string;
  links_count: number;
}

// Job Benefits Types
export interface JobBenefit {
  benefit_type: 'health_insurance' | 'dental_insurance' | 'vision_insurance' | 
                'retirement_401k' | 'paid_time_off' | 'flexible_hours' | 
                'remote_work' | 'professional_development' | 'gym_membership' |
                'stock_options' | 'bonus_structure' | 'other';
  importance: 'required' | 'preferred' | 'nice_to_have';
  notes?: string;
}

export interface UpdateJobBenefitsInput {
  job_benefits: JobBenefit[];
}

export interface JobBenefitsUpdateResult {
  success: boolean;
  message: string;
  benefits_count: number;
}

// Enhanced Profile Summary
export interface CandidateBasicInfo {
  name: string;
  email: string;
  phone?: string;
  headline?: string;
  about_me?: string;  // NEW
  city?: string;      // NEW
  location?: string;
}

// Enhanced Bulk Update
export interface BulkProfileUpdateInput {
  basic_info?: UpdateBasicInfoInput;
  skills?: CandidateSkillInput[];
  experience?: ExperienceInput[];
  education?: EducationInput[];
  links?: SocialLink[];        // NEW
  job_benefits?: JobBenefit[]; // NEW
}


 
export interface CandidateProfile {
  about_me: string | null;
  candidate_id: string;
  city: string | null;
  created_at: string;
  education: string | null;
  experience: string | null;
  headline: string | null;
  job_benefits: string | null;
  languages: string | null;
  links: string | null;
  location: string | null;
  minimum_salary_amount: number | null;
  payment_period: string | null;
  postal_code: number | null;
  preferred_locations: string | null;
  profile_picture_url: string | null;
  resume_url: string | null;
  skills: string[];
  updated_at: string;
  video_intro_url: string | null;
}

export interface PopulatedSkill {
  skill_id: string;
  skill_name: string;
  skill_category?: string;
  proficiency?: string;
  years_experience?: number;
  confidence_score?: number;
  source_type: string;
  is_verified: boolean;
}

export interface CandidateProfileWithSkills extends Omit<CandidateProfile, 'skills'> {
  skills: PopulatedSkill[]; // Populated skills instead of IDs
}

export interface SkillAddResult {
  success: boolean;
  message: string;
  skill: PopulatedSkill;
  total_skills_count: number;
}

export interface SkillRemoveResult {
  success: boolean;
  message: string;
  removed_skill_id: string;
  total_skills_count: number;
}

export interface SkillsUpdateResult {
  success: boolean;
  message: string;
  skills: PopulatedSkill[];
  total_skills_count: number;
}

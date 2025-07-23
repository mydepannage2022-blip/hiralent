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
  skills: ExtractedSkill[];
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  summary: string;
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
  missing_fields: string[];
  suggestions: string[];
}

// Profile summary types
export interface CandidateBasicInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface CandidateDocumentInfo {
  id: string;
  name: string;
  upload_status: string;
  extraction_status?: string;
}

export interface CandidateProfileSummary {
  basic_info: CandidateBasicInfo;
  skills: any[]; // Will be CandidateSkill[] from Prisma
  profile_completeness?: ProfileCompletenessScore;
  career_prediction?: CareerPredictionResult;
  documents: CandidateDocumentInfo[];
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
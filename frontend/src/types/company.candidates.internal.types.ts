// src/types/company.candidates.internal.types.ts

export type InternalCandidateListItemDTO = {
  candidate_id: string;
  full_name?: string | null;
  headline?: string | null;
  location?: string | null;
  city?: string | null;
  experience_level?: string | null;
  skills?: string[];
  applied_count?: number | null;
  profile_picture_url?: string | null;
  fit_score?: number | null;
};

/**
 * Full profile returned by:
 * GET /api/v1/company/candidates/internal/:candidateId
 *
 * Keep it flexible (some relations can be null/empty)
 */
export type InternalCandidateFullProfileDTO = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;

  phone_number?: string | null;
  position?: string | null;
  linkedin_url?: string | null;

  created_at: string;
  updated_at: string;

  candidateProfile?: any;
  candidateSkills?: any[];
  candidateDocuments?: any[];
  candidateScore?: any;
  candidateVectors?: any[]; // because you have CandidateVector model (1-1) but Prisma relation can be array in some schemas
  profileCompleteness?: any;
  certifications?: any[];
  badges?: any[];
};

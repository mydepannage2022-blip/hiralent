export type ExternalCandidateSource = string;

/**
 * Matches employer-facing fields from Prisma model SourcedCandidate
 */
export type ExternalCandidateListItemDTO = {
  source_id: string;                 // sourced_candidate_id
  source: ExternalCandidateSource;   // "linkedin" | "github" | ...
  full_name?: string | null;
  headline?: string | null;

  location?: string | null;
  city?: string | null;

  skills?: string[];

  source_profile_url?: string | null;       // source_profile_url
  status?: string | null;            // SourcedCandidateStatus (string côté FE)

  fit_score?: number | null;         // optional (if you compute/store it)
};

export type ExternalCandidateDetailsDTO = ExternalCandidateListItemDTO & {
  about_me?: string | null;

  // contacts (optional)
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;

  // free JSON links
  links?: any | null;

  created_at?: string | Date | null;
  updated_at?: string | Date | null;

  // optional extra info (if you return it)
  summary?: string | null;
  experiences?: { company?: string | null; role?: string | null; period?: string | null }[];
  education?: { school?: string | null; degree?: string | null }[];
  extracted_from?: string | null;
};

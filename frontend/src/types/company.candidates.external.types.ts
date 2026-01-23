export type ExternalCandidateSource = "linkedin" | "github" | "indeed" | "other";

export type ExternalCandidateListItemDTO = {
  source_id: string;           // unique ID from your DB (scraped table)
  source: ExternalCandidateSource;
  full_name: string;
  headline?: string | null;
  location?: string | null;
  skills?: string[];
  fit_score?: number;          // 0..100
  profile_url?: string | null; // link to source profile
};

export type ExternalCandidateDetailsDTO = ExternalCandidateListItemDTO & {
  summary?: string | null;
  experiences?: { company?: string | null; role?: string | null; period?: string | null }[];
  education?: { school?: string | null; degree?: string | null }[];
  extracted_from?: string | null; // ex: "linkedin_search: data engineer rabat"
};

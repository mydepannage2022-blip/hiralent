export interface CandidateSearchResult {
  candidate_id: string;
  full_name: string;
  headline: string | null;
  city: string | null;
  location: string | null;
  profile_picture_url: string | null;
  skills: string[];
  match_score: number;   // 0–100, weighted by field matches
  about_me: string | null;
}

export interface CandidateSearchResponse {
  results: CandidateSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CandidateSearchParams {
  q?: string;
  location?: string;
  page?: number;
  limit?: number;
}

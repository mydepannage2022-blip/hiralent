export interface CandidateSearchResult {
  candidate_id: string;
  /** null for unauthenticated (guest) responses — display a placeholder in the UI */
  full_name: string | null;
  headline: string | null;
  city: string | null;
  location: string | null;
  profile_picture_url: string | null;
  /** Guests receive at most 5 skills; authenticated users receive all */
  skills: string[];
  match_score: number;   // 0–100, weighted by field matches
  /** Guests receive at most 120 chars; authenticated users receive full text */
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

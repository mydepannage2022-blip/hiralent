export type InternalCandidateListItemDTO = {
  candidate_id: string;
  full_name: string;
  headline?: string | null;
  location?: string | null;
  experience_level?: string | null; // "junior" | "mid" | "senior" ...
  skills?: string[];
  fit_score?: number; // 0..100
  applied_count?: number;
  profile_picture_url?: string | null;
};

export type InternalCandidateDetailsDTO = InternalCandidateListItemDTO & {
  email?: string | null;
  phone?: string | null;
  about_me?: string | null;
  education?: { school: string; degree?: string | null; year?: string | null }[];
  experiences?: { company: string; role: string; from?: string | null; to?: string | null }[];
  projects?: { title: string; description?: string | null }[];
};

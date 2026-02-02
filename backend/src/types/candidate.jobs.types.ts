// src/types/candidate.jobs.types.ts

export type JobListQuery = {
  skills?: string[];          // filter by skills
  level?: string;             // experience_level filter
  eligible?: boolean;         // eligibility filter
  search?: string;            // title/description search
  page?: number;
  limit?: number;
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];          // codes: PROFILE_NOT_READY, LOW_PROFILE_SCORE, MISSING_FIELD:resume_url, MISSING_SKILL:nodejs
  missingSkills: string[];
  missingFields: string[];
  profileScore?: number;
  minProfileScore?: number | null;
};

export type JobListItemDTO = {
  job_id: string;
  title: string;
  location: string;
  experience_level: string | null;
  required_skills: string[];
  status: string;

  min_profile_score?: number | null;
  required_fields?: string[];

  match_score?: number;       // for recommended
  eligibility: EligibilityResult;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

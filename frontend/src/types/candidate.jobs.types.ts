// frontend/types/candidate.jobs.types.ts

export type JobListQuery = {
  skills?: string[]; // filter by skills
  level?: string; // experience_level filter
  eligible?: boolean; // eligibility filter
  search?: string; // title/description search
  page?: number;
  limit?: number;
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  missingSkills: string[];
  missingFields: string[];
  profileScore?: number;
  minProfileScore?: number | null;
};

export type CandidateJobListItemDTO = {
  job_id: string;
  title: string;
  location: string | null;
  experience_level: string | null;
  required_skills: string[];
  status: string;

  min_profile_score?: number | null;
  required_fields?: string[];

  // only for recommended endpoint
  match_score?: number;

  eligibility: EligibilityResult;
};

export type CandidateJobsPagedResponse = {
  items: CandidateJobListItemDTO[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

// For job details (GET /api/v1/jobs/:id)
export type JobDetailsDTO = {
  job_id: string;
  company_id: string;
  title: string;
  location: string | null;
  description: string | null;

  salary_range?: string | null;
  required_skills: string[];
  status: string;

  job_type?: string | null;
  experience_level?: string | null;
  education_level?: string | null;
  remote_option?: string | null;
  urgency_level?: string | null;
  department?: string | null;

  reporting_to?: string | null;
  team_size?: number | null;

  application_deadline?: string | null;
  max_applications?: number | null;
  auto_reject_after?: number | null;
  screening_questions?: any;

  visa_sponsored?: boolean | null;
  relocation_assistance?: boolean | null;

  min_profile_score?: number | null;
  required_fields?: string[];

  created_at?: string;
  updated_at?: string;
};

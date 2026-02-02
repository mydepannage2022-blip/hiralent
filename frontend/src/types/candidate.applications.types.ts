// frontend/types/candidate.applications.types.ts

export type CandidateApplicationsListItemDTO = {
  application_id: string;
  status: string;
  applied_at: string;

  relevance_score: number | null;
  vector_score: number | null;
  trigger: string | null;
  scored_at: string | null;
  score_version: string | null;

  job: {
    job_id: string;
    title: string;
    location: string | null;
    experience_level: string | null;
    status: string;
  };
};

export type CandidateApplicationsListResponse = {
  total: number;
  items: CandidateApplicationsListItemDTO[];
};

export type ApplicationTimelineItemDTO = {
  history_id: string;
  created_at: string;

  relevance_score: number;
  vector_score: number | null;
  trigger: string | null;

  reason_codes: string[];
  missing_skills: string[];
  breakdown: any | null;

  source: string | null;
  created_by: string | null;
};

export type ApplicationTimelineResponse = {
  application: {
    application_id: string;
    job_id: string;
    status: string;
  };
  timeline: ApplicationTimelineItemDTO[];
};

export type ApplyToJobPayload = {
  job_id: string;
  cover_letter?: string;
};

export type ApplyToJobResponse =
  | {
      ok: true;
      alreadyApplied?: boolean;
      application_id: string;
      status: string;
      trigger?: string;
    }
  | {
      error: string;
      reason_codes?: string[];
    };

import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export interface Job {
  job_id: string;
  title: string;
  description: string;
  location: string;
  salary_range?: string;
  required_skills?: string[];
  job_type?: string;
  experience_level?: string;
  remote_option?: string;
  visa_sponsored?: boolean;
  status: string;
  created_at: string;
  company_id: string;
  company?: {
    user_id: string;
    full_name: string;
    email?: string;
  };
  companyProfile?: {
    company_name?: string;
    logo_url?: string;
    industry?: string;
    website?: string;
  };
}

export interface JobRecommendation {
  recommendation_id: string;
  candidate_id: string;
  job_id: string;
  match_score: number;
  skill_match: any;
  salary_match?: number;
  location_match?: number;
  ai_reasoning?: string;
  created_at: string;
  job: Job;
}

export interface JobListResponse {
  success: boolean;
  data: {
    jobs: Job[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  message?: string;
}

export interface JobRecommendationsResponse {
  success: boolean;
  data: JobRecommendation[];
  message?: string;
}

export interface SingleJobResponse {
  success: boolean;
  data: Job;
  message?: string;
}

export interface JobFilters {
  status?: string;
  department?: string;
  job_type?: string;
  experience_level?: string;
  remote_option?: string;
  urgency_level?: string;
  created_from?: string;
  created_to?: string;
  search_term?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// API Functions

/**
 * Get AI-powered job recommendations for logged-in candidate
 */
export const getJobRecommendations = async (
  limit: number = 20
): Promise<JobRecommendation[]> => {
  const response = await api.get<JobRecommendationsResponse>(
    `/candidates/match-jobs?limit=${limit}`
  );
  return response.data.data;
};

/**
 * Get all jobs with optional filters (public endpoint)
 */
export const getJobs = async (filters?: JobFilters): Promise<JobListResponse['data']> => {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }

  const response = await api.get<JobListResponse>(
    `/jobs?${params.toString()}`
  );
  return response.data.data;
};

/**
 * Get single job by ID
 */
export const getJobById = async (jobId: string): Promise<Job> => {
  const response = await api.get<SingleJobResponse>(`/jobs/${jobId}`);
  return response.data.data;
};

/**
 * Get jobs posted by a specific company
 */
export const getCompanyJobs = async (companyId: string): Promise<Job[]> => {
  const response = await api.get<{ success: boolean; data: Job[] }>(
    `/jobs/company/${companyId}/jobs`
  );
  return response.data.data;
};

import axios from 'axios';
import type {
  ApiResponse,
  AssignInterviewRequest,
  CandidateInterviewListItem,
  RecruiterInterviewListItem,
  InterviewSessionResponse,
  InterviewDetailedResult,
  SubmitResponseRequest,
} from '../../types/interview.types';

// Create axios instance with base URL
export const interviewApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
interviewApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== Recruiter API Functions ====================

/**
 * Assign an AI interview to a candidate (recruiter only)
 * POST /api/v1/interviews/assign
 */
export const assignInterview = async (
  data: AssignInterviewRequest
): Promise<{ interviewId: string }> => {
  const response = await interviewApi.post<ApiResponse<{ interviewId: string }>>(
    '/interviews/assign',
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to assign interview');
  }
  return response.data.data!;
};

/**
 * Get all interviews for the company (recruiter view)
 * GET /api/v1/interviews/company
 */
export const getCompanyInterviews = async (): Promise<RecruiterInterviewListItem[]> => {
  const response = await interviewApi.get<ApiResponse<RecruiterInterviewListItem[]>>(
    '/interviews/company'
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch company interviews');
  }
  return response.data.data || [];
};

/**
 * Get full interview details (recruiter only)
 * GET /api/v1/interviews/:interviewId/details
 */
export const getInterviewDetails = async (
  interviewId: string
): Promise<InterviewDetailedResult> => {
  const response = await interviewApi.get<ApiResponse<InterviewDetailedResult>>(
    `/interviews/${interviewId}/details`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch interview details');
  }
  return response.data.data!;
};

// ==================== Candidate API Functions ====================

/**
 * Get all my assigned interviews (candidate view)
 * GET /api/v1/interviews/my
 */
export const getMyInterviews = async (): Promise<CandidateInterviewListItem[]> => {
  const response = await interviewApi.get<ApiResponse<CandidateInterviewListItem[]>>(
    '/interviews/my'
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch interviews');
  }
  return response.data.data || [];
};

/**
 * Get interview status (candidate view - limited info)
 * GET /api/v1/interviews/:interviewId
 */
export const getInterview = async (
  interviewId: string
): Promise<CandidateInterviewListItem> => {
  const response = await interviewApi.get<ApiResponse<CandidateInterviewListItem>>(
    `/interviews/${interviewId}`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch interview');
  }
  return response.data.data!;
};

/**
 * Start an interview session (generates questions, returns first question)
 * POST /api/v1/interviews/:interviewId/start
 */
export const startInterview = async (
  interviewId: string
): Promise<InterviewSessionResponse> => {
  const response = await interviewApi.post<ApiResponse<InterviewSessionResponse>>(
    `/interviews/${interviewId}/start`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start interview');
  }
  return response.data.data!;
};

/**
 * Submit a response to current question
 * POST /api/v1/interviews/:interviewId/respond
 */
export const submitResponse = async (
  interviewId: string,
  data: SubmitResponseRequest
): Promise<InterviewSessionResponse> => {
  const response = await interviewApi.post<ApiResponse<InterviewSessionResponse>>(
    `/interviews/${interviewId}/respond`,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to submit response');
  }
  return response.data.data!;
};

/**
 * End the interview and get completion status
 * POST /api/v1/interviews/:interviewId/end
 */
export const endInterview = async (
  interviewId: string
): Promise<{
  interviewId: string;
  status: string;
  duration: number;
  completedAt: string;
}> => {
  const response = await interviewApi.post<ApiResponse<{
    interviewId: string;
    status: string;
    duration: number;
    completedAt: string;
  }>>(`/interviews/${interviewId}/end`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to end interview');
  }
  return response.data.data!;
};

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
 * Submit response with SSE streaming — yields question text chunks then done event
 * POST /api/v1/interviews/:interviewId/respond-stream
 */
export async function* submitResponseStream(
  interviewId: string,
  data: SubmitResponseRequest
): AsyncGenerator<
  { type: 'chunk'; text: string } |
  { type: 'done'; data: InterviewSessionResponse } |
  { type: 'error'; error: string }
> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/interviews/${interviewId}/respond-stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = line.slice(6).trim();
        if (json) yield JSON.parse(json);
      }
    }
  }
}

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

// ==================== Video API Functions ====================


/**
 * Upload interview video recording
 * POST /api/v1/interviews/:interviewId/upload-video
 */
export const uploadInterviewVideo = async (
  interviewId: string,
  videoBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<{ videoUrl: string }> => {
  // Ensure the blob has the correct MIME type
  const mimeType = videoBlob.type && videoBlob.type.startsWith('video/') ? videoBlob.type : 'video/webm';
  const fileName = `interview_${interviewId}.webm`;
  const videoFile = new File([videoBlob], fileName, { type: mimeType });

  console.log(`📤 Uploading video: size=${(videoFile.size / 1024 / 1024).toFixed(2)}MB, type=${videoFile.type}`);

  const formData = new FormData();
  formData.append('video', videoFile);

  const token = localStorage.getItem('authToken');

  // Use native fetch instead of axios for more reliable FormData handling
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/interviews/${interviewId}/upload-video`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - browser sets it automatically with boundary
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const data: ApiResponse<{ videoUrl: string }> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to upload video');
  }

  console.log('✅ Video upload successful');
  return data.data!;
};

/**
 * Log a face detection violation (proctoring) — fire and forget
 * POST /api/v1/interviews/:interviewId/log-violation
 */
export const logViolation = async (
  interviewId: string,
  type: 'NO_FACE' | 'MULTIPLE_FACES' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'PHONE_DETECTED' | 'LOOKING_AWAY',
  faceCount: number,
): Promise<void> => {
  await interviewApi.post(`/interviews/${interviewId}/log-violation`, { type, faceCount });
};

/**
 * Get signed URL for video playback (recruiter only)
 * GET /api/v1/interviews/:interviewId/video-url
 */
export const getInterviewVideoUrl = async (
  interviewId: string
): Promise<{ signedUrl: string; expiresIn: number }> => {
  const response = await interviewApi.get<ApiResponse<{ signedUrl: string; expiresIn: number }>>(
    `/interviews/${interviewId}/video-url`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get video URL');
  }
  return response.data.data!;
};

/**
 * Get video streaming URL (bypasses CORS)
 * Returns a URL that streams through our backend
 */
export const getInterviewVideoStreamUrl = (interviewId: string): string => {
  const token = localStorage.getItem('authToken');
  // Append token as query param for streaming endpoint
  return `${process.env.NEXT_PUBLIC_BASE_URL}/interviews/${interviewId}/video-stream?token=${token}`;
};

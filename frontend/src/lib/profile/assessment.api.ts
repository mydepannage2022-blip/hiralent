// frontend/src/lib/assessment.api.ts

// Reuse the shared axios instance from the auth client so baseURL, withCredentials
// and auth persistence are consistent across the app.
import { api as authApi } from '../auth/auth.api';
import {
  StartAssessmentRequest,
  StartAssessmentResponse,
  AssessmentQuestion,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  AssessmentProgress,
  CompleteAssessmentResponse,
  AssessmentResults,
  AssessmentHistory,
  SkillRecommendations,
  AssessmentError
} from '../../types/assessment.types';

// Use authApi for requests so we inherit baseURL, cookie support and token
// persistence logic from `auth.api.ts` (avoids token key mismatch and wrong baseURL)
const api = authApi;

// ==================== ASSESSMENT API CALLS ====================

export const startAssessment = async (data: StartAssessmentRequest): Promise<StartAssessmentResponse> => {
  try {
    const response = await api.post('/candidates/start-assessment', data);
    return response.data;
  } catch (error: any) {
    console.error('Start assessment error:', error);
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore attach code for easier detection in UI
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    throw new Error(error?.response?.data?.message || 'Failed to start assessment');
  }
};

export const getNextQuestion = async (assessmentId: string): Promise<AssessmentQuestion> => {
  try {
    const response = await api.get(`/candidates/assessment/${assessmentId}/question`);
    return response.data;
  } catch (error: any) {
    console.error('Get question error:', error);
    
    // Handle specific error cases
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    if (error?.response?.status === 400) {
      throw new Error(error.response.data.error || 'No more questions available');
    }
    
    throw new Error(error?.response?.data?.message || 'Failed to get question');
  }
};

export const submitAnswer = async (
  assessmentId: string, 
  answerData: SubmitAnswerRequest
): Promise<SubmitAnswerResponse> => {
  try {
    const response = await api.post(`/candidates/assessment/${assessmentId}/answer`, answerData);
    return response.data;
  } catch (error: any) {
    console.error('Submit answer error:', error);
    
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    // Handle specific error cases
    if (error?.response?.status === 400) {
      const errorMsg = error.response.data.error || 'Invalid answer submission';
      throw new Error(errorMsg);
    }
    
    if (error?.response?.status === 422) {
      throw new Error('Answer submitted after time limit');
    }
    
    throw new Error(error?.response?.data?.message || 'Failed to submit answer');
  }
};

export const getAssessmentProgress = async (assessmentId: string): Promise<AssessmentProgress> => {
  try {
    const response = await api.get(`/candidates/assessment/${assessmentId}/progress`);
    return response.data;
  } catch (error: any) {
    console.error('Get progress error:', error);
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    throw new Error(error?.response?.data?.message || 'Failed to get assessment progress');
  }
};

export const completeAssessment = async (assessmentId: string): Promise<CompleteAssessmentResponse> => {
  try {
    const response = await api.post(`/candidates/assessment/${assessmentId}/complete`);
    return response.data;
  } catch (error: any) {
    console.error('Complete assessment error:', error);
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    throw new Error(error?.response?.data?.message || 'Failed to complete assessment');
  }
};

export const getAssessmentResults = async (assessmentId: string): Promise<AssessmentResults> => {
  try {
    const response = await api.get(`/candidates/assessment/${assessmentId}/results`);
    return response.data;
  } catch (error: any) {
    console.error('Get results error:', error);
    
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    if (error?.response?.status === 400) {
      throw new Error('Assessment not completed yet');
    }
    
    throw new Error(error?.response?.data?.message || 'Failed to get assessment results');
  }
};

// ==================== NEW: HISTORY & RECOMMENDATIONS APIs ====================

export const getAssessmentHistory = async (): Promise<AssessmentHistory> => {
  try {
    const response = await api.get('/candidates/assessments/history');
    return response.data;
  } catch (error: any) {
    console.error('Get assessment history error:', error);
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    throw new Error(error?.response?.data?.message || 'Failed to get assessment history');
  }
};

export const getSkillRecommendations = async (): Promise<SkillRecommendations> => {
  try {
    const response = await api.get('/candidates/skill-recommendations');
    return response.data;
  } catch (error: any) {
    console.error('Get skill recommendations error:', error);
    if (error?.response?.status === 401) {
      const e = new Error('UNAUTHORIZED');
      // @ts-ignore
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    throw new Error(error?.response?.data?.message || 'Failed to get skill recommendations');
  }
};

// ==================== UTILITY FUNCTIONS ====================

export const validateAssessmentId = (assessmentId: string): boolean => {
  return Boolean(assessmentId && typeof assessmentId === 'string' && assessmentId.length > 0);
};

export const formatTimeSpent = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const calculateProgress = (current: number, total: number): number => {
  return Math.round((current / total) * 100);
};

export const getSkillLevelColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'beginner':
      return 'text-blue-600 bg-blue-50';
    case 'intermediate':
      return 'text-green-600 bg-green-50';
    case 'advanced':
      return 'text-orange-600 bg-orange-50';
    case 'expert':
      return 'text-purple-600 bg-purple-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-lime-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
};

// Error handler for API responses
export const handleAssessmentError = (error: any): AssessmentError => {
  return {
    success: false,
    error: error.message || 'An unexpected error occurred',
    message: error.response?.data?.message || error.message || 'Assessment operation failed',
    code: error.response?.status?.toString() || 'UNKNOWN_ERROR'
  };
};
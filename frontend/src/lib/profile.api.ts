import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Simple interceptor - just add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Profile Completeness Response Type
export interface ProfileCompletenessResponse {
  success: boolean;
  data: any;
  message: string;
}

// Simple API call
export const getProfileCompleteness = async (): Promise<ProfileCompletenessResponse> => {
  const response = await api.get('/candidates/completeness');
  return response.data;
};
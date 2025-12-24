import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  getJobRecommendations,
  getJobs,
  getJobById,
  getCompanyJobs,
  JobRecommendation,
  Job,
  JobFilters,
  JobListResponse,
} from './jobs.api';

// Query Keys
export const jobKeys = {
  all: ['jobs'] as const,
  recommendations: () => [...jobKeys.all, 'recommendations'] as const,
  list: (filters?: JobFilters) => [...jobKeys.all, 'list', filters] as const,
  detail: (id: string) => [...jobKeys.all, 'detail', id] as const,
  company: (companyId: string) => [...jobKeys.all, 'company', companyId] as const,
};

/**
 * Hook to fetch AI job recommendations
 */
export const useJobRecommendations = (
  limit: number = 20,
  options?: Omit<UseQueryOptions<JobRecommendation[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: jobKeys.recommendations(),
    queryFn: () => getJobRecommendations(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch jobs with filters
 */
export const useJobs = (
  filters?: JobFilters,
  options?: Omit<UseQueryOptions<JobListResponse['data']>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: () => getJobs(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch single job details
 */
export const useJob = (
  jobId: string,
  options?: Omit<UseQueryOptions<Job>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: () => getJobById(jobId),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch company's jobs
 */
export const useCompanyJobs = (
  companyId: string,
  options?: Omit<UseQueryOptions<Job[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: jobKeys.company(companyId),
    queryFn: () => getCompanyJobs(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

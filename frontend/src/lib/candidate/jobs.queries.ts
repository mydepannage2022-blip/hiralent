// frontend/src/lib/candidate/jobs.queries.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { JobListQuery } from "../../types/candidate.jobs.types";
import {
  apiCandidateJobsList,
  apiCandidateRecommendedJobs,
  apiCandidateJobEligibility,
  apiJobDetails,
} from "./jobs.api";

export const candidateJobsKeys = {
  all: ["candidate", "jobs"] as const,
  list: (q: JobListQuery) => ["candidate", "jobs", "list", q] as const,
  recommended: (q: JobListQuery) => ["candidate", "jobs", "recommended", q] as const,
  eligibility: (jobId: string) => ["candidate", "jobs", "eligibility", jobId] as const,
  details: (jobId: string) => ["candidate", "jobs", "details", jobId] as const,
};

export function useCandidateJobsList(q: JobListQuery, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: candidateJobsKeys.list(q),
    queryFn: () => apiCandidateJobsList(q),
    enabled: opts?.enabled ?? true,
    staleTime: 10_000,
  });
}

export function useCandidateRecommendedJobs(q: JobListQuery, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: candidateJobsKeys.recommended(q),
    queryFn: () => apiCandidateRecommendedJobs(q),
    enabled: opts?.enabled ?? true,
    staleTime: 10_000,
  });
}

export function useCandidateJobEligibility(jobId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: candidateJobsKeys.eligibility(jobId),
    queryFn: () => apiCandidateJobEligibility(jobId),
    enabled: (opts?.enabled ?? true) && !!jobId,
    staleTime: 5_000,
  });
}

export function useCandidateJobDetails(jobId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: candidateJobsKeys.details(jobId),
    queryFn: () => apiJobDetails(jobId),
    enabled: (opts?.enabled ?? true) && !!jobId,
    staleTime: 30_000,
  });
}

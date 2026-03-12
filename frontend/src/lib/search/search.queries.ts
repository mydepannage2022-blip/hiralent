import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { searchCandidatesApi, searchJobsApi } from "./search.api";
import type {
  CandidateSearchParams,
  CandidateSearchResponse,
  JobSearchParams,
  JobSearchResponse,
} from "../../types/search.types";

export const searchKeys = {
  all: ["candidates", "search"] as const,
  list: (params: CandidateSearchParams) =>
    [...searchKeys.all, params] as const,
};

export const jobSearchKeys = {
  all: ["jobs", "search"] as const,
  list: (params: JobSearchParams) =>
    [...jobSearchKeys.all, params] as const,
};

export const useCandidateSearch = (
  params: CandidateSearchParams,
  options?: Omit<
    UseQueryOptions<CandidateSearchResponse>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: searchKeys.list(params),
    queryFn: () => searchCandidatesApi(params),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useJobSearch = (
  params: JobSearchParams,
  options?: Omit<UseQueryOptions<JobSearchResponse>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: jobSearchKeys.list(params),
    queryFn: () => searchJobsApi(params),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

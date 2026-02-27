import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { searchCandidatesApi } from "./search.api";
import type {
  CandidateSearchParams,
  CandidateSearchResponse,
} from "../../types/search.types";

export const searchKeys = {
  all: ["candidates", "search"] as const,
  list: (params: CandidateSearchParams) =>
    [...searchKeys.all, params] as const,
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

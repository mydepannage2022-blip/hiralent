"use client";

import { useQuery, useQueries } from "@tanstack/react-query";

import type { Paginated, CompanyJobOption } from "./candidates.api";
import type {
  ExternalCandidateDetailsDTO,
  ExternalCandidateListItemDTO,
} from "@/src/types/company.candidates.external.types";

import type {
  InternalCandidateListItemDTO,
  InternalCandidateFullProfileDTO,
} from "@/src/types/company.candidates.internal.types";

import {
  getExternalCandidateDetails,
  getInternalCandidateDetails,
  getInternalRankingForJob,
  listCompanyJobsActive,
  listExternalCandidates,
  listExternalSources,
} from "./candidates.api";

/** Jobs dropdown (ACTIVE only) */
export function useCompanyJobsActive() {
  return useQuery<CompanyJobOption[]>({
    queryKey: ["company-jobs-active"],
    queryFn: listCompanyJobsActive,
  });
}

/** External sources dropdown */
export function useExternalSources() {
  return useQuery<{ sources: string[] }>({
    queryKey: ["external-sources"],
    queryFn: listExternalSources,
  });
}

/** External list (scraped) */
export function useExternalCandidates(filters: {
  q?: string;
  source?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<Paginated<ExternalCandidateListItemDTO>>({
    queryKey: ["external-candidates", filters],
    queryFn: () => listExternalCandidates(filters),
    placeholderData: (prev) => prev,
  });
}

/** External details */
export function useExternalCandidateDetails(sourceId?: string) {
  return useQuery<ExternalCandidateDetailsDTO>({
    queryKey: ["external-candidate-details", sourceId],
    enabled: !!sourceId,
    queryFn: () => getExternalCandidateDetails(String(sourceId)),
  });
}

/** Internal ranking (by job) */
export function useInternalRanking(params: {
  jobId?: string;
  search?: string;
  minScore?: number;
}) {
  return useQuery<{ items: InternalCandidateListItemDTO[] }>({
    queryKey: ["internal-ranking", params],
    enabled: !!params.jobId,
    queryFn: () =>
      getInternalRankingForJob({
        jobId: String(params.jobId),
        search: params.search,
        minScore: params.minScore,
      }),
    placeholderData: (prev) => prev,
  });
}

/**
 * ✅ Hydrate internal ranking cards
 * For each candidate_id, fetch full profile using your new endpoint.
 * This fixes: "— / No skills" on first page.
 */
export function useInternalCandidatesHydrated(candidateIds: string[]) {
  const queries = useQueries({
    queries: candidateIds.map((id) => ({
      queryKey: ["internal-candidate-details", id],
      queryFn: () => getInternalCandidateDetails(id),
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    })),
  });

  const mapById = new Map<string, InternalCandidateFullProfileDTO>();

  queries.forEach((q, idx) => {
    const id = candidateIds[idx];
    if (q.data && id) mapById.set(id, q.data);
  });

  return { queries, mapById };
}

/** Internal details page */
export function useInternalCandidateDetails(candidateId?: string) {
  return useQuery<InternalCandidateFullProfileDTO>({
    queryKey: ["internal-candidate-details", candidateId],
    enabled: !!candidateId,
    queryFn: () => getInternalCandidateDetails(String(candidateId)),
  });
}

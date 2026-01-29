// frontend/src/lib/candidate/applications.queries.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApplyToJobPayload } from "../../types/candidate.applications.types";
import { apiApplyToJob, apiListMyApplications, apiApplicationTimeline } from "./applications.api";

export const candidateApplicationsKeys = {
  all: ["candidate", "applications"] as const,
  list: () => ["candidate", "applications", "list"] as const,
  timeline: (appId: string) => ["candidate", "applications", "timeline", appId] as const,
};

export function useCandidateApplications(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: candidateApplicationsKeys.list(),
    queryFn: () => apiListMyApplications(),
    enabled: opts?.enabled ?? true,
    staleTime: 5_000,
  });
}

export function useApplicationTimeline(appId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: candidateApplicationsKeys.timeline(appId),
    queryFn: () => apiApplicationTimeline(appId),
    enabled: (opts?.enabled ?? true) && !!appId,
    staleTime: 3_000,
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApplyToJobPayload) => apiApplyToJob(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: candidateApplicationsKeys.all });
    },
  });
}

export function useMyApplicationsList(enabled = true) {
  return useQuery({
    queryKey: ["candidate", "applications", "my-list"],
    queryFn: () => apiListMyApplications(),
    enabled,
    staleTime: 30_000,
  });
}
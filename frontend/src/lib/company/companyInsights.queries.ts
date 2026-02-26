"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAssessmentCandidatesAnalytics,
  getCompletedForCandidate,
  getSessionAnalytics,
  getSessionInsight,
} from "./companyInsights.api";

export function useCompletedForCandidate(candidateId: string) {
  return useQuery({
    queryKey: ["company", "candidate", candidateId, "completed-assessments"],
    queryFn: () => getCompletedForCandidate(candidateId),
    enabled: !!candidateId,
  });
}

export function useAssessmentCandidatesAnalytics(assessmentId: string) {
  return useQuery({
    queryKey: ["company", "assessment", assessmentId, "analytics-candidates"],
    queryFn: () => getAssessmentCandidatesAnalytics(assessmentId),
    enabled: !!assessmentId,
  });
}

export function useSessionAnalytics(sessionId: string) {
  return useQuery({
    queryKey: ["company", "assessment-session", sessionId, "analytics"],
    queryFn: () => getSessionAnalytics(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionInsight(sessionId: string) {
  return useQuery({
    queryKey: ["company", "assessment-session", sessionId, "insight"],
    queryFn: () => getSessionInsight(sessionId),
    enabled: !!sessionId,
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSession,
  getSessionQuestions,
  ingestTelemetry,
  listAnswers,
  patchNavigation,
  runCoding,
  saveAnswer,
  submitSession,
  getSubmission,
  startSession,
} from "./candidateAssessment.api";
import { apiFetch } from "../api/apiClient";

/**
 * Small UI type for history.
 * Adapt keys if your backend returns different ones.
 */
export type UiSubmittedSessionRow = {
  sessionId?: string;
  session_id?: string;
  assessmentTitle?: string;
  assessment?: { title?: string };
  submittedAt?: string | null;
  submitted_at?: string | null;
  totalScore?: number | null;
  total_score?: number | null;
};

export function useAssessmentSession(sessionId: string) {
  return useQuery({
    queryKey: ["candidate", "assessment-session", sessionId],
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionQuestions(sessionId: string) {
  return useQuery({
    queryKey: ["candidate", "assessment-session", sessionId, "questions"],
    queryFn: () => getSessionQuestions(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionAnswers(sessionId: string) {
  return useQuery({
    queryKey: ["candidate", "assessment-session", sessionId, "answers"],
    queryFn: () => listAnswers(sessionId),
    enabled: !!sessionId,
  });
}

export function useSaveAnswer(sessionId: string) {
  const qc = useQueryClient();

  return useMutation({
    // ✅ accepte:
    // - { questionId, payload, isFinal?, isFlagged? }   (ce que ton Runner envoie)
    // - { questionId, body }                           (si ailleurs tu l’utilises encore)
    mutationFn: async (args: any) => {
      const questionId = String(args?.questionId || "");

      const body =
        args?.body && typeof args.body === "object"
          ? args.body
          : {
              payload: args?.payload ?? {},
              isFinal: typeof args?.isFinal === "boolean" ? args.isFinal : undefined,
              isFlagged: typeof args?.isFlagged === "boolean" ? args.isFlagged : undefined,
            };

      return saveAnswer(sessionId, questionId, body);
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["candidate", "assessment-session", sessionId, "answers"],
      });
    },
  });
}


export function usePatchNavigation(sessionId: string) {
  return useMutation({
    mutationFn: async (body: { current_index: number | undefined }) =>
      patchNavigation(sessionId, body),
  });
}

export function useRunCoding(sessionId: string) {
  return useMutation({
    mutationFn: async (args: { questionId: string; language: string; code: string }) =>
      runCoding(sessionId, args.questionId, { language: args.language, code: args.code }),
  });
}

export function useGetSubmission(sessionId: string) {
  return useMutation({
    mutationFn: async (args: { submissionId: string }) =>
      getSubmission(sessionId, args.submissionId),
  });
}

export function useTelemetry(sessionId: string) {
  return useMutation({
    mutationFn: async (body: { events: Record<string, any>[] }) =>
      ingestTelemetry(sessionId, body),
  });
}

export function useSubmitSession(sessionId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args?: { reason?: string | null }) =>
      submitSession(sessionId, args?.reason ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", "assessment-session", sessionId] });
      qc.invalidateQueries({ queryKey: ["notifications", "CANDIDATE"] });
      qc.invalidateQueries({ queryKey: ["candidate", "assessment-invites"] });

      // ✅ Refresh history after submit
      qc.invalidateQueries({ queryKey: ["candidate", "assessment-sessions", "submitted"] });
    },
  });
}

/**
 * Flow: candidate ACCEPT invite => startSession(assessmentId) => redirect to session UI
 */
export function useStartAssessmentSession() {
  return useMutation({
    mutationFn: async (args: { assessmentId: string }) => startSession(args.assessmentId),
  });
}

/**
 * ✅ Candidate History: submitted sessions
 * FIXED: apiFetch expects (audience, path, options?)
 */
export function useCandidateSubmittedSessions() {
  return useQuery<UiSubmittedSessionRow[]>({
    queryKey: ["candidate", "assessment-sessions", "submitted"],
    queryFn: async () => {
      const res = await apiFetch(
        "CANDIDATE",
        "/assessment-sessions?status=SUBMITTED",
        { method: "GET" }
      );

      // If your apiFetch already returns the JSON, keep this.
      // If it returns { data: ... } then return res.data instead.
      return (res as any) ?? [];
    },
  });
}

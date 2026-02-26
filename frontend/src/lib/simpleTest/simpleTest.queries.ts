"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptSimpleTestInvite,
  getSimpleTestAttempt,
  listSimpleTestInvites,
  startSimpleTestAttempt,
  submitSimpleTestAttempt,
} from "./simpleTest.api";
import type { SubmitAnswersPayload } from "@/src/types/simpleTest.types";

export function useSimpleTestInvites() {
  return useQuery({
    queryKey: ["candidate", "simple-test-invites"],
    queryFn: () => listSimpleTestInvites(),
  });
}

export function useAcceptSimpleTestInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { inviteId: string }) =>
      acceptSimpleTestInvite(args.inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", "simple-test-invites"] });
      qc.invalidateQueries({ queryKey: ["notifications", "CANDIDATE"] });
    },
  });
}

export function useStartSimpleTestAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { inviteId: string }) =>
      startSimpleTestAttempt(args.inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", "simple-test-invites"] });
    },
  });
}

export function useSimpleTestAttempt(attemptId: string) {
  return useQuery({
    queryKey: ["candidate", "simple-test-attempt", attemptId],
    queryFn: () => getSimpleTestAttempt(attemptId),
    enabled: !!attemptId,
  });
}

export function useSubmitSimpleTestAttempt(attemptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { answers: SubmitAnswersPayload }) =>
      submitSimpleTestAttempt(attemptId, args.answers),
    onSuccess: () => {
      // refresh attempt after submit (status/score/etc)
      qc.invalidateQueries({
        queryKey: ["candidate", "simple-test-attempt", attemptId],
      });
    },
  });
}

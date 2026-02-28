"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptAssessmentInvite, listAssessmentInvites } from "./invites.api";

export function useAssessmentInvites() {
  return useQuery({
    queryKey: ["candidate", "assessment-invites"],
    queryFn: () => listAssessmentInvites(),
  });
}

export function useAcceptAssessmentInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { inviteId: string }) => acceptAssessmentInvite(args.inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", "assessment-invites"] });
      qc.invalidateQueries({ queryKey: ["notifications", "CANDIDATE"] });
    },
  });
}

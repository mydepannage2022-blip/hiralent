"use client";

import { useQuery } from "@tanstack/react-query";
import { getCandidateAssessmentHistory } from "./assessmentHistory.api";

export function useCandidateAssessmentHistory() {
  return useQuery({
    queryKey: ["candidate", "assessment-history"],
    queryFn: () => getCandidateAssessmentHistory(),
  });
}

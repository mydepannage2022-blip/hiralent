"use client";

import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { CandidateJobListItemDTO } from "../../../../types/candidate.jobs.types";
import JobCard from "./JobCard";
import { useCandidateJobEligibility } from "@/src/lib/candidate/jobs.queries";

const ELIGIBILITY_SCORE_THRESHOLD = 60;

function JobCardWithEligibility({
  item,
  showMatchScore,
  isApplied,
}: {
  item: CandidateJobListItemDTO;
  showMatchScore?: boolean;
  isApplied?: boolean;
}) {
  const score = item.match_score ?? 0;

  // Score >= threshold → eligible direct, pas besoin de fetch ni de polling
  const skipFetch = score >= ELIGIBILITY_SCORE_THRESHOLD;

  // FIX 4b : pollUntilEligible → poll toutes les 8s tant que eligible === false.
  // S'arrête automatiquement dès que le worker Python renvoie eligible: true.
  const q = useCandidateJobEligibility(item.job_id, {
    enabled: !!item.job_id && !skipFetch,
    pollUntilEligible: true,
  });

  const eligibility = useMemo(() => {
    if (score >= ELIGIBILITY_SCORE_THRESHOLD) {
      return {
        eligible: true,
        reasons: [],
        missingSkills: item.eligibility?.missingSkills ?? [],
        missingFields: [],
      };
    }
    return q.data ?? item.eligibility ?? undefined;
  }, [score, q.data, item.eligibility]);

  return (
    <JobCard
      item={item}
      // FIX match score All Jobs : showMatchScore transmis correctement
      // même quand le score vient de recMap (score < threshold)
      showMatchScore={showMatchScore}
      eligibilityOverride={eligibility}
      eligibilityLoading={!skipFetch && q.isLoading}
      isApplied={!!isApplied}
    />
  );
}

export default function JobList({
  items,
  isLoading,
  showMatchScore = false,
  eligibilityMode = "useItem",
  appliedJobIds,
}: {
  items: CandidateJobListItemDTO[];
  isLoading: boolean;
  showMatchScore?: boolean;
  eligibilityMode?: "useItem" | "fetch";
  appliedJobIds?: Set<string>;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
        <p className="text-gray-600">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {items.map((it) => {
        const isApplied = appliedJobIds?.has(it.job_id) ?? false;

        return eligibilityMode === "fetch" ? (
          <JobCardWithEligibility
            key={it.job_id}
            item={it}
            showMatchScore={showMatchScore}
            isApplied={isApplied}
          />
        ) : (
          <JobCard
            key={it.job_id}
            item={it}
            showMatchScore={showMatchScore}
            isApplied={isApplied}
          />
        );
      })}
    </div>
  );
}
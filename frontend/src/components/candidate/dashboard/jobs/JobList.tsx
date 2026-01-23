// frontend/src/components/candidate/dashboard/jobs/JobList.tsx
"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { CandidateJobListItemDTO } from "../../../../types/candidate.jobs.types";
import JobCard from "./JobCard";

export default function JobList({
  items,
  isLoading,
  showMatchScore = false,
}: {
  items: CandidateJobListItemDTO[];
  isLoading: boolean;
  showMatchScore?: boolean;
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
      {items.map((it) => (
        <JobCard key={it.job_id} item={it} showMatchScore={showMatchScore} />
      ))}
    </div>
  );
}

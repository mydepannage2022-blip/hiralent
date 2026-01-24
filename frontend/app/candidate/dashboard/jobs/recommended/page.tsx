// frontend/app/candidate/dashboard/jobs/recommended/page.tsx
"use client";

import React from "react";
import { useCandidateRecommendedJobs } from "@/src/lib/candidate/jobs.queries";
import JobList from "@/src/components/candidate/dashboard/jobs/JobList";

export default function RecommendedJobsPage() {
  const q = useCandidateRecommendedJobs({ page: 1, limit: 20 });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Recommended jobs</h1>
        <JobList items={q.data?.items ?? []} isLoading={q.isLoading} showMatchScore />
      </div>
    </div>
  );
}

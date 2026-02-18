"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, TrendingUp, Info } from "lucide-react";
import { useCandidateRecommendedJobs } from "@/src/lib/candidate/jobs.queries";
import JobList from "@/src/components/candidate/dashboard/jobs/JobList";

export default function RecommendedJobsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const q = useCandidateRecommendedJobs({ page, limit });

  // ✅ show only high-score recommendations (big apps behavior)
  const MIN_SCORE = 60;

  const filtered = useMemo(() => {
    return (q.data?.items ?? []).filter((j) => (j.match_score ?? 0) >= MIN_SCORE);
  }, [q.data?.items]);

  const hasMore = q.data?.hasMore ?? false;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header (simple, matches website UI) */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Recommended jobs</h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Top matches based on your profile (only {MIN_SCORE}%+).
            </p>
          </div>

          {!q.isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-medium">{filtered.length}</span>
              <span className="text-gray-500">high matches</span>
            </div>
          )}
        </div>

        {/* If backend returns items but all are below threshold */}
        {!q.isLoading && (q.data?.items?.length ?? 0) > 0 && filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">No high-match jobs yet</p>
              <p className="text-sm text-gray-600">
                Complete your profile (skills, education, experience) to unlock better matches.
              </p>
            </div>
          </div>
        )}

        <JobList items={filtered} isLoading={q.isLoading} showMatchScore />

        {/* Pagination */}
        {!q.isLoading && (filtered.length > 0 || page > 1) && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-sm text-gray-700">Page {page}</span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

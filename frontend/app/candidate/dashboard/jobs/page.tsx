// frontend/app/candidate/dashboard/jobs/page.tsx
"use client";

import React, { useState } from "react";
import { Briefcase, Sparkles, Filter } from "lucide-react";
import JobList from "@/src/components/candidate/dashboard/jobs/JobList";
import JobFilters from "@/src/components/candidate/dashboard/jobs/JobFilters";
import { useCandidateJobsList, useCandidateRecommendedJobs } from "@/src/lib/candidate/jobs.queries";
import type { JobListQuery } from "../../../../src/types/candidate.jobs.types";

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<"recommended" | "all">("recommended");
  const [showFilters, setShowFilters] = useState(false);

  const [query, setQuery] = useState<JobListQuery>({
    page: 1,
    limit: 20,
  });

  const recommendedQ = useCandidateRecommendedJobs(
    { page: 1, limit: 20 },
    { enabled: activeTab === "recommended" }
  );

  const allQ = useCandidateJobsList(query, { enabled: activeTab === "all" });

  const isLoading = activeTab === "recommended" ? recommendedQ.isLoading : allQ.isLoading;
  const error = activeTab === "recommended" ? recommendedQ.error : allQ.error;

  const items = activeTab === "recommended" ? recommendedQ.data?.items ?? [] : allQ.data?.items ?? [];

  const clearFilters = () => setQuery({ page: 1, limit: 20 });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("recommended")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "recommended"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              Recommended For You
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Briefcase className="w-5 h-5" />
              All Jobs
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Failed to load jobs. Please try again.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop filters */}
          <div className="hidden lg:block">
            {activeTab === "all" && (
              <JobFilters query={query} onChange={setQuery} onClear={clearFilters} />
            )}
          </div>

          {/* Mobile filters */}
          {activeTab === "all" && (
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>

              {showFilters && (
                <div className="fixed inset-0 bg-black/50 z-50">
                  <div className="bg-white h-full overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Filters</h2>
                      <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-gray-700">
                        ✕
                      </button>
                    </div>

                    <JobFilters
                      query={query}
                      onChange={(q) => {
                        setQuery(q);
                        setShowFilters(false);
                      }}
                      onClear={() => {
                        clearFilters();
                        setShowFilters(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={activeTab === "all" ? "lg:col-span-3" : "lg:col-span-4"}>
            {/* Count + pagination (only for ALL tab) */}
            {activeTab === "all" && allQ.data && !allQ.isLoading && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {allQ.data.items.length} of {allQ.data.total} jobs
              </div>
            )}

            <JobList items={items} isLoading={isLoading} showMatchScore={activeTab === "recommended"} />

            {activeTab === "all" && allQ.data && allQ.data.total > (query.limit ?? 20) && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setQuery({ ...query, page: Math.max(1, (query.page ?? 1) - 1) })}
                  disabled={(query.page ?? 1) === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <span className="px-4 py-2 text-sm text-gray-700">Page {query.page ?? 1}</span>

                <button
                  onClick={() => setQuery({ ...query, page: (query.page ?? 1) + 1 })}
                  disabled={!allQ.data.hasMore}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

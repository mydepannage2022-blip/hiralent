"use client";

import React, { useMemo, useState } from "react";
import { Briefcase, Sparkles, Filter } from "lucide-react";
import JobList from "@/src/components/candidate/dashboard/jobs/JobList";
import JobFilters from "@/src/components/candidate/dashboard/jobs/JobFilters";
import { useCandidateJobsList, useCandidateRecommendedJobs } from "@/src/lib/candidate/jobs.queries";
import { useMyApplicationsList } from "@/src/lib/candidate/applications.queries"; // ✅ NEW
import type { JobListQuery } from "../../../../src/types/candidate.jobs.types";

type SortOrder = "latest" | "oldest";

function getCreatedAt(it: any): number {
  const v = it?.created_at ?? it?.createdAt ?? it?.createdAtIso ?? null;
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<"recommended" | "all">("recommended");
  const [showFilters, setShowFilters] = useState(false);

  const [query, setQuery] = useState<JobListQuery>({ page: 1, limit: 6 });
  const [recQuery, setRecQuery] = useState<JobListQuery>({ page: 1, limit: 6 });

  const recommendedQ = useCandidateRecommendedJobs(recQuery, { enabled: activeTab === "recommended" });
  const allQ = useCandidateJobsList(query, { enabled: activeTab === "all" });

  const myAppsQ = useMyApplicationsList(true); // ✅ NEW (fetch my applications)

  const appliedJobIds = useMemo(() => {
    const s = new Set<string>();
    for (const app of myAppsQ.data?.items ?? []) {
      if (app.job?.job_id) s.add(app.job.job_id);
    }
    return s;
  }, [myAppsQ.data?.items]); // ✅ NEW

  const isLoading = activeTab === "recommended" ? recommendedQ.isLoading : allQ.isLoading;
  const error = activeTab === "recommended" ? recommendedQ.error : allQ.error;

  const currentQuery = activeTab === "recommended" ? recQuery : query;
  const setCurrentQuery = activeTab === "recommended" ? setRecQuery : setQuery;

  const sortOrder: SortOrder = ((currentQuery as any)?.sort ?? "latest") as SortOrder;

  const MIN_SCORE = 60;

  const items = useMemo(() => {
    const base =
      activeTab === "recommended"
        ? (recommendedQ.data?.items ?? []).filter((x) => (x.match_score ?? 0) >= MIN_SCORE)
        : allQ.data?.items ?? [];

    const sorted = [...base].sort((a: any, b: any) => {
      const ta = getCreatedAt(a);
      const tb = getCreatedAt(b);
      return sortOrder === "latest" ? tb - ta : ta - tb;
    });

    return sorted;
  }, [activeTab, recommendedQ.data, allQ.data, sortOrder]);

  const clearFilters = () => {
    const limit = (currentQuery.limit ?? 6) as number;
    const next: any = { page: 1, limit, sort: "latest" as SortOrder };
    if (activeTab === "recommended") setRecQuery(next);
    else setQuery(next);
  };

  const pageState = activeTab === "recommended" ? recQuery : query;
  const pageData = activeTab === "recommended" ? recommendedQ.data : allQ.data;

  const setPage = (nextPage: number) => {
    if (activeTab === "recommended") setRecQuery((p: any) => ({ ...p, page: nextPage }));
    else setQuery((p: any) => ({ ...p, page: nextPage }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Failed to load jobs. Please try again.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="hidden lg:block">
            <JobFilters query={currentQuery} onChange={setCurrentQuery as any} onClear={clearFilters} />
          </div>

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
                    query={currentQuery}
                    onChange={(q) => {
                      (setCurrentQuery as any)(q);
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

          <div className="lg:col-span-3">
            {pageData && !isLoading && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {items.length} of {pageData.total} jobs
              </div>
            )}

            <JobList
              items={items}
              isLoading={isLoading}
              showMatchScore={activeTab === "recommended"}
              eligibilityMode={activeTab === "recommended" ? "fetch" : "useItem"}
              appliedJobIds={appliedJobIds} // ✅ NEW
            />

            {pageData && pageData.total > (pageState.limit ?? 6) && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, (pageState.page ?? 1) - 1))}
                  disabled={(pageState.page ?? 1) === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <span className="px-4 py-2 text-sm text-gray-700">Page {pageState.page ?? 1}</span>

                <button
                  onClick={() => setPage((pageState.page ?? 1) + 1)}
                  disabled={!pageData.hasMore}
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

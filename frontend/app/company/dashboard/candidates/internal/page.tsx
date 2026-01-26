"use client";

import React, { useEffect, useMemo, useState } from "react";
import CandidatesTabs from "@/src/components/company/dashboard/candidates/CandidatesTabs";

import {
  useCompanyJobsActive,
  useInternalCandidatesHydrated,
  useInternalRanking,
} from "@/src/lib/company/candidates.queries";

import InternalCandidateCard from "@/src/components/company/dashboard/candidates/InternalCandidateCard";

export default function InternalCandidatesPage() {
  const { data: jobs = [], isLoading: jobsLoading } = useCompanyJobsActive();

  const [jobId, setJobId] = useState("");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);

  // ✅ auto-select first job
  useEffect(() => {
    if (!jobId && jobs.length > 0) setJobId(jobs[0].job_id);
  }, [jobs, jobId]);

  const rankingQuery = useInternalRanking({ jobId, search, minScore });
  const ranking = rankingQuery.data?.items ?? [];

  const candidateIds = useMemo(
    () => ranking.map((c) => String(c.candidate_id)).filter(Boolean),
    [ranking]
  );

  const { mapById, queries } = useInternalCandidatesHydrated(candidateIds);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ✅ Keep the same switch bar as External */}
        <CandidatesTabs />

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Job:</span>
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={jobsLoading}
            >
              {jobs.length === 0 ? (
                <option value="">No active jobs</option>
              ) : (
                jobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <input
            className="h-10 flex-1 rounded-md border px-3 text-sm"
            placeholder="Search internal candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!jobId}
          />

          <select
            className="h-10 rounded-md border px-3 text-sm md:w-40"
            value={minScore ?? ""}
            onChange={(e) =>
              setMinScore(e.target.value ? Number(e.target.value) : undefined)
            }
            disabled={!jobId}
          >
            <option value="">All scores</option>
            <option value="20">20+</option>
            <option value="40">40+</option>
            <option value="60">60+</option>
            <option value="80">80+</option>
          </select>
        </div>

        {/* Content */}
        {rankingQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading ranking...</div>
        ) : rankingQuery.isError ? (
          <div className="text-sm text-red-600">
            {String((rankingQuery.error as any)?.message ?? "Failed to load")}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-sm text-muted-foreground">No candidates.</div>
        ) : (
          <>
            {queries.some((q) => q.isLoading) && (
              <div className="text-xs text-muted-foreground">
                Loading candidate profiles...
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ranking.map((c) => {
                const id = String(c.candidate_id);
                const full = mapById.get(id);

                return (
                  <InternalCandidateCard
                    key={id}
                    item={{
                      candidate_id: id,
                      fit_score: c.fit_score ?? null,
                      full_name: full?.full_name ?? c.full_name ?? "—",
                      headline:
                        full?.candidateProfile?.headline ??
                        full?.candidateProfile?.position ??
                        c.headline ??
                        "—",
                      skills: full?.candidateProfile?.skills ?? c.skills ?? [],
                      linkedin_url:
                        full?.linkedin_url ??
                        full?.candidateProfile?.linkedin_url ??
                        null,
                      profile_picture_url:
                        full?.candidateProfile?.profile_picture_url ?? null,
                      applied_count: c.applied_count ?? 0,
                    }}
                    onInvite={(candidateId) =>
                      console.log("Invite", candidateId)
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

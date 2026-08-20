"use client";

import React, { useEffect, useMemo, useState } from "react";
import CandidatesTabs from "@/src/components/company/dashboard/candidates/CandidatesTabs";
import {
  useCompanyJobsActive,
  useInternalCandidatesHydrated,
  useInternalRanking,
} from "@/src/lib/company/candidates.queries";
import InternalCandidateCard from "@/src/components/company/dashboard/candidates/InternalCandidateCard";
import { parseEntitlementError } from "@/src/lib/subscription/entitlementError";
import UpgradePrompt from "@/src/components/subscription/UpgradePrompt";

function normalizeFit(score?: number | null) {
  if (score == null) return null;
  // handle 0..1 or 0..100
  const v = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export default function InternalCandidatesPage() {
  const { data: jobs = [], isLoading: jobsLoading } = useCompanyJobsActive();

  const [jobId, setJobId] = useState("");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);

  // auto-select first job
  useEffect(() => {
    if (!jobId && jobs.length > 0) setJobId(jobs[0].job_id);
  }, [jobs, jobId]);

  const rankingQuery = useInternalRanking({
    jobId,
    // keep sending to API, even if backend ignores it
    search,
    minScore,
  });

  const ranking = rankingQuery.data?.items ?? [];

  // AI ranking is part of the paid product. A 403 from the subscription gate is an answer, not
  // an outage — render the upgrade path rather than a failed-to-load state.
  const entitlementBlock = parseEntitlementError(rankingQuery.error);

  const candidateIds = useMemo(
    () => ranking.map((c) => String(c.candidate_id)).filter(Boolean),
    [ranking]
  );

  const { mapById, queries } = useInternalCandidatesHydrated(candidateIds);

  // ✅ Client-side filtering (works even if backend ignores params)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = typeof minScore === "number" ? minScore : 0;

    return ranking.filter((c) => {
      const full = mapById.get(String(c.candidate_id));

      const name = (full?.full_name ?? c.full_name ?? "").toLowerCase();
      const headline = (
        full?.candidateProfile?.headline ??
        full?.candidateProfile?.position ??
        c.headline ??
        ""
      ).toLowerCase();

      const skillsArr: string[] =
        (full?.candidateProfile?.skills as any)?.map?.(String) ??
        (c.skills ?? []).map(String);

      const skills = skillsArr.join(" ").toLowerCase();

      const fit = normalizeFit(c.fit_score) ?? 0;

      const matchesSearch =
        !q || name.includes(q) || headline.includes(q) || skills.includes(q);

      const matchesScore = fit >= min;

      return matchesSearch && matchesScore;
    });
  }, [ranking, mapById, search, minScore]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
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
        ) : entitlementBlock ? (
          <UpgradePrompt block={entitlementBlock} action="candidate ranking" />
        ) : rankingQuery.isError ? (
          <div className="text-sm text-red-600">
            {String((rankingQuery.error as any)?.message ?? "Failed to load")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No candidates match your filters.
          </div>
        ) : (
          <>
            {queries.some((q) => q.isLoading) && (
              <div className="text-xs text-muted-foreground">
                Loading candidate profiles...
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((c) => {
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
                      skills: (full?.candidateProfile?.skills as any) ?? c.skills ?? [],
                      linkedin_url:
                        full?.linkedin_url ??
                        full?.candidateProfile?.linkedin_url ??
                        null,
                      profile_picture_url:
                        full?.candidateProfile?.profile_picture_url ?? null,
                      applied_count: c.applied_count ?? 0,
                    }}
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

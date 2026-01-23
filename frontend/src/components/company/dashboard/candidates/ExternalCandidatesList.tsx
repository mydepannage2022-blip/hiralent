"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function getCompanyToken() {
  // TODO: remplace par ton vrai storage (context / cookie / localStorage)
  return localStorage.getItem("token") || "";
}

async function apiGet(path: string) {
  const token = getCompanyToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ExternalCandidatesList() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>(""); // optional (github, lever...)
  const [minScore, setMinScore] = useState<string>(""); // optional

  // 1) fetch company jobs for dropdown
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["company-jobs"],
    queryFn: () => apiGet("/api/v1/company/jobs?status=ACTIVE&limit=50"),
  });

  const jobs = useMemo(() => jobsData?.items ?? jobsData ?? [], [jobsData]);

  // 2) fetch ranking external for selected job
  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ["ranking-external", selectedJobId, search, source, minScore],
    enabled: !!selectedJobId,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("pool", "external");
      if (search) params.set("search", search);
      if (source) params.set("source", source);
      if (minScore) params.set("minScore", minScore);

      return apiGet(`/api/v1/company/jobs/${selectedJobId}/candidates-ranking?${params.toString()}`);
    },
  });

  const candidates = rankingData?.items ?? [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* TOP BAR: job filter + search */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        {/* Job dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Job:</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={jobsLoading}
          >
            <option value="">Select a job…</option>
            {jobs.map((j: any) => (
              <option key={j.job_id} value={j.job_id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <input
          className="border rounded-md px-3 py-2 text-sm w-full md:w-[360px]"
          placeholder="Search external candidate name, headline, skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Optional filters row */}
      <div className="flex flex-col md:flex-row gap-3">
        <select
          className="border rounded-md px-3 py-2 text-sm md:w-[220px]"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={!selectedJobId}
        >
          <option value="">All sources</option>
          <option value="github">github</option>
          <option value="linkedin">linkedin</option>
          <option value="greenhouse">greenhouse</option>
          <option value="lever">lever</option>
        </select>

        <select
          className="border rounded-md px-3 py-2 text-sm md:w-[220px]"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          disabled={!selectedJobId}
        >
          <option value="">All scores</option>
          <option value="50">50%+</option>
          <option value="60">60%+</option>
          <option value="70">70%+</option>
          <option value="80">80%+</option>
        </select>
      </div>

      {!selectedJobId ? (
        <div className="text-sm text-gray-500 py-6">
          Please select a job to see ranked external candidates.
        </div>
      ) : rankingLoading ? (
        <div className="text-sm text-gray-500 py-6">Loading ranking…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c: any) => (
            <div key={c.sourced_candidate_id ?? c.candidate_id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{c.full_name ?? "Unnamed"}</div>
                  <div className="text-sm text-gray-600">{c.headline}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {c.city ?? ""} {c.location ?? ""}
                  </div>
                </div>

                {/* Fit badge */}
                <div className="text-xs font-semibold px-3 py-1 rounded-full border">
                  Fit: {typeof c.fit_score === "number"
                    ? (c.fit_score <= 1 ? Math.round(c.fit_score * 100) : Math.round(c.fit_score)) + "%"
                    : "--"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {(c.skills ?? []).slice(0, 8).map((s: string) => (
                  <span key={s} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

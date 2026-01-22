"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useExternalCandidateDetails } from "@/src/lib/company/candidates.queries";
import CandidateRankingBadge from "@/src/components/company/dashboard/candidates/CandidateRankingBadge";
import CandidateSkills from "@/src/components/company/dashboard/candidates/CandidateSkills";

export default function ExternalCandidateDetailsPage() {
  const params = useParams<{ sourceId: string }>();
  const sourceId = params?.sourceId;

  const q = useExternalCandidateDetails(sourceId);

  if (!sourceId) {
    return <div className="min-h-screen bg-gray-50 p-6">Missing sourceId</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {q.isLoading ? (
            <p>Loading...</p>
          ) : !q.data ? (
            <p className="text-red-700">External candidate not found.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{q.data.full_name}</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
                      {q.data.source}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{q.data.headline ?? "—"}</p>
                  <p className="text-xs text-gray-500 mt-1">{q.data.location ?? "—"}</p>
                </div>
                <CandidateRankingBadge score={q.data.fit_score} />
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Skills</h3>
                <CandidateSkills skills={q.data.skills} />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
                <p className="text-sm text-gray-700">{q.data.summary ?? "—"}</p>
              </div>

              {q.data.profile_url ? (
                <div className="mt-6">
                  <a
                    className="text-sm text-blue-700 hover:underline"
                    href={q.data.profile_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source profile
                  </a>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

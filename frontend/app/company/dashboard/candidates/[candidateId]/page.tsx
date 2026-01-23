"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useInternalCandidateDetails } from "@/src/lib/company/candidates.queries";
import CandidateRankingBadge from "@/src/components/company/dashboard/candidates/CandidateRankingBadge";
import CandidateSkills from "@/src/components/company/dashboard/candidates/CandidateSkills";

export default function InternalCandidateDetailsPage() {
  const params = useParams<{ candidateId: string }>();
  const candidateId = params?.candidateId;

  const q = useInternalCandidateDetails(candidateId);

  if (!candidateId) {
    return <div className="min-h-screen bg-gray-50 p-6">Missing candidateId</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {q.isLoading ? (
            <p>Loading...</p>
          ) : !q.data ? (
            <p className="text-red-700">Candidate not found.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900">{q.data.full_name}</h1>
                  <p className="text-sm text-gray-600">{q.data.headline ?? "—"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {q.data.location ?? "—"} • {q.data.experience_level ?? "—"}
                  </p>
                </div>
                <CandidateRankingBadge score={q.data.fit_score} />
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Skills</h3>
                <CandidateSkills skills={q.data.skills} />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-sm text-gray-700">{q.data.about_me ?? "—"}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

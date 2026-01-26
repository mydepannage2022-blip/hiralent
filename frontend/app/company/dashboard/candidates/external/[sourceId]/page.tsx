"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useExternalCandidateDetails } from "@/src/lib/company/candidates.queries";
import CandidateSkills from "@/src/components/company/dashboard/candidates/CandidateSkills";

export default function ExternalCandidateDetailsPage() {
  const params = useParams<{ sourceId: string }>();
  const sourceId = params?.sourceId;

  const q = useExternalCandidateDetails(sourceId);

  if (!sourceId) return <div className="min-h-screen bg-gray-50 p-6">Missing sourceId</div>;

  if (q.isLoading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-6">Loading...</div>;
  }

  if (!q.data) {
    return <div className="bg-white rounded-lg border border-gray-200 p-6 text-red-700">Not found.</div>;
  }

  const d = q.data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{d.full_name ?? "Unnamed"}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
                  {d.source}
                </span>
                {d.status ? (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
                    {d.status}
                  </span>
                ) : null}
              </div>

              <p className="text-sm text-gray-600">{d.headline ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-1">
                {d.city ?? ""} {d.location ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Skills</h3>
            <CandidateSkills skills={d.skills ?? []} />
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.about_me ?? "—"}</p>
          </div>

          <div className="mt-6 space-y-1 text-sm">
            <div><span className="font-medium">Email:</span> {d.email ?? "—"}</div>
            <div><span className="font-medium">Phone:</span> {d.phone ?? "—"}</div>
            <div><span className="font-medium">LinkedIn:</span> {d.linkedin_url ?? "—"}</div>

            {d.source_profile_url ? (
              <div className="pt-2">
                <a className="text-blue-700 hover:underline" href={d.source_profile_url} target="_blank" rel="noreferrer">
                  Open source profile
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

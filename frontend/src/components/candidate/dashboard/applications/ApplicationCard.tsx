"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { CandidateApplicationsListItemDTO } from "../../../../types/candidate.applications.types";

export default function ApplicationCard({
  item,
}: {
  item: CandidateApplicationsListItemDTO;
}) {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
      onClick={() =>
        router.push(`/candidate/dashboard/applications/${item.application_id}`)
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {item.job?.title ?? "Job"}
          </h3>
          <p className="text-sm text-gray-600 truncate">
            {item.job?.location ?? "—"} •{" "}
            {item.job?.experience_level ?? "—"}
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-700">
          {item.status}
        </span>
      </div>

      {/* Scores */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Relevance</p>
          <p className="font-semibold text-gray-900">
            {item.relevance_score ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Trigger</p>
          <p className="font-semibold text-gray-900">
            {item.trigger ?? "—"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-3 text-xs text-gray-500">
        Applied:{" "}
        {item.applied_at
          ? new Date(item.applied_at).toLocaleString()
          : "—"}
      </p>
    </div>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CandidateSkills from "./CandidateSkills";

export default function ExternalCandidateCard({ item }: { item: any }) {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
      onClick={() => router.push(`/company/dashboard/candidates/external/${item.source_id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{item.full_name ?? "Unnamed"}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
              {item.source}
            </span>
            {item.status ? (
              <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
                {item.status}
              </span>
            ) : null}
          </div>

          <p className="text-sm text-gray-600 truncate">{item.headline ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {(item.city ?? "")} {(item.location ?? "—")}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <CandidateSkills skills={item.skills ?? []} />
      </div>
    </div>
  );
}

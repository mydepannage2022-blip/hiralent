"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CandidateRankingBadge from "./CandidateRankingBadge";
import CandidateSkills from "./CandidateSkills";
import type { InternalCandidateListItemDTO } from "@/src/types/company.candidates.internal.types";

export default function InternalCandidateCard({ item }: { item: InternalCandidateListItemDTO }) {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
      onClick={() => router.push(`/company/dashboard/candidates/${item.candidate_id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.full_name}</h3>
          <p className="text-sm text-gray-600 truncate">{item.headline ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {item.location ?? "—"} • {item.experience_level ?? "—"} • Applied: {item.applied_count ?? 0}
          </p>
        </div>
        <CandidateRankingBadge score={item.fit_score} />
      </div>

      <div className="mt-4">
        <CandidateSkills skills={item.skills} />
      </div>
    </div>
  );
}

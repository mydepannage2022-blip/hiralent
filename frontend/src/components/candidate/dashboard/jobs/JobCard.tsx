// frontend/src/components/candidate/dashboard/jobs/JobCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, TrendingUp, Briefcase } from "lucide-react";
import type { CandidateJobListItemDTO } from "../../../../types/candidate.jobs.types";
import EligibilityBadge from "./EligibilityBadge";
import EligibilityReasons from "./EligibilityReasons";
import ApplyModal from "./ApplyModal";

function scoreClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

export default function JobCard({
  item,
  showMatchScore = false,
}: {
  item: CandidateJobListItemDTO;
  showMatchScore?: boolean;
}) {
  const router = useRouter();
  const [openApply, setOpenApply] = useState(false);

  const matchScore = item.match_score;
  const hasMatchScore = showMatchScore && typeof matchScore === "number";

  const canApply = item.eligibility?.eligible;

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (item.location) parts.push(item.location);
    if (item.experience_level) parts.push(item.experience_level);
    return parts.join(" • ");
  }, [item.location, item.experience_level]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3
            onClick={() => router.push(`/candidate/dashboard/jobs/${item.job_id}`)}
            className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:underline"
          >
            {item.title}
          </h3>
          <p className="text-sm text-gray-600 truncate">{subtitle || "—"}</p>
        </div>

        <div className="flex items-center gap-2">
          <EligibilityBadge eligibility={item.eligibility} />

          {hasMatchScore && (
            <span
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 ${scoreClass(
                matchScore!
              )}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {Math.round(matchScore!)}% Match
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
        {item.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{item.location}</span>
          </div>
        )}
        {item.experience_level && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{item.experience_level}</span>
          </div>
        )}
        {!!item.required_skills?.length && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span>{item.required_skills.slice(0, 3).join(", ")}{item.required_skills.length > 3 ? "…" : ""}</span>
          </div>
        )}
      </div>

      {!canApply && <EligibilityReasons reasons={item.eligibility?.reasons ?? []} />}

      <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={() => router.push(`/candidate/dashboard/jobs/${item.job_id}`)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View details
        </button>

        <button
          onClick={() => setOpenApply(true)}
          disabled={!canApply}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          title={!canApply ? "Not eligible" : "Apply"}
        >
          Apply
        </button>
      </div>

      <ApplyModal
        open={openApply}
        onClose={() => setOpenApply(false)}
        jobId={item.job_id}
        jobTitle={item.title}
        eligibility={item.eligibility}
      />
    </div>
  );
}

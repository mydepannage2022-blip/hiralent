"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, TrendingUp, Briefcase } from "lucide-react";
import type {
  CandidateJobListItemDTO,
  EligibilityResult,
} from "../../../../types/candidate.jobs.types";
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
  eligibilityOverride,
  eligibilityLoading = false,
  isApplied = false, // ✅ NEW PROP
  showEligibility = true, // false on public/anonymous browse — hide per-candidate eligibility + Apply
  detailsHrefBase = "/candidate/dashboard/jobs", // public browse overrides to the public job-details route
}: {
  item: CandidateJobListItemDTO;
  showMatchScore?: boolean;
  eligibilityOverride?: EligibilityResult;
  eligibilityLoading?: boolean;
  isApplied?: boolean; // ✅ NEW PROP
  showEligibility?: boolean;
  detailsHrefBase?: string;
}) {
  const router = useRouter();
  const [openApply, setOpenApply] = useState(false);

  // ✅ local state to instantly switch UI after successful apply
  const [applied, setApplied] = useState<boolean>(!!isApplied);

  // ✅ if parent (DB) says applied (after refresh), sync it
  useEffect(() => {
    if (isApplied) setApplied(true);
  }, [isApplied]);

  const matchScore = item.match_score;
  const hasMatchScore = showMatchScore && typeof matchScore === "number";

  const eligibility = eligibilityOverride ?? item.eligibility;

  // ✅ disable apply if already applied
  const canApply = !!eligibility?.eligible && !eligibilityLoading && !applied;

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
            onClick={() => router.push(`${detailsHrefBase}/${item.job_id}`)}
            className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:underline"
          >
            {item.title}
          </h3>
          <p className="text-sm text-gray-600 truncate">{subtitle || "—"}</p>
        </div>

        <div className="flex items-center gap-2">
          {showEligibility && (eligibility ? (
            <EligibilityBadge eligibility={eligibility} />
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold bg-gray-50 text-gray-600 border-gray-200">
              Checking…
            </span>
          ))}

          {hasMatchScore && (
            <span
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 ${scoreClass(
                matchScore!
              )}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {matchScore!.toFixed(2)}% Match
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
            <span>
              {item.required_skills.slice(0, 3).join(", ")}
              {item.required_skills.length > 3 ? "…" : ""}
            </span>
          </div>
        )}
      </div>

{showEligibility && !!eligibility && (
  <>
    {!eligibility.eligible && (
      <EligibilityReasons reasons={eligibility.reasons ?? []} />
    )}
    {eligibility.eligible && (eligibility.missingSkills?.length ?? 0) > 0 && (
      <EligibilityReasons
        reasons={eligibility.missingSkills!.map((s) => `MISSING_SKILL:${s}`)}
        mode="suggestions"
      />
    )}
  </>
)}

      <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={() => router.push(`${detailsHrefBase}/${item.job_id}`)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View details →
        </button>

        {showEligibility && (
          <button
            onClick={() => setOpenApply(true)}
            disabled={!canApply}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed
              ${applied ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-blue-600 text-white hover:bg-blue-700"}
            `}
            title={!canApply ? (applied ? "Applied" : "Not eligible") : "Apply"}
          >
            {applied ? "Applied" : "Apply"}
          </button>
        )}
      </div>

      {showEligibility && (
        <ApplyModal
          open={openApply}
          onClose={() => setOpenApply(false)}
          jobId={item.job_id}
          jobTitle={item.title}
          eligibility={eligibility}
          onApplied={() => setApplied(true)} // ✅ instantly set applied after apply success
        />
      )}
    </div>
  );
}

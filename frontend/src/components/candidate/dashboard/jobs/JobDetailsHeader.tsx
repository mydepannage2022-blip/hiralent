// frontend/src/components/candidate/dashboard/jobs/JobDetailsHeader.tsx
"use client";

import React from "react";
import { MapPin, Clock, Briefcase } from "lucide-react";
import type { JobDetailsDTO, EligibilityResult } from "../../../../types/candidate.jobs.types";
import EligibilityBadge from "./EligibilityBadge";

export default function JobDetailsHeader({
  job,
  eligibility,
}: {
  job: JobDetailsDTO;
  eligibility?: EligibilityResult;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {job.location}
              </span>
            )}
            {job.experience_level && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {job.experience_level}
              </span>
            )}
            {job.job_type && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" /> {job.job_type}
              </span>
            )}
          </div>
        </div>

        {eligibility && <EligibilityBadge eligibility={eligibility} />}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(job.required_skills ?? []).slice(0, 12).map((sk) => (
          <span key={sk} className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
            {sk}
          </span>
        ))}
      </div>
    </div>
  );
}

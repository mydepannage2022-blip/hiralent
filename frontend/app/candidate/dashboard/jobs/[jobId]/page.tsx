"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  useCandidateJobDetails,
  useCandidateJobEligibility,
} from "@/src/lib/candidate/jobs.queries";

import JobDetailsHeader from "@/src/components/candidate/dashboard/jobs/JobDetailsHeader";
import EligibilityReasons from "@/src/components/candidate/dashboard/jobs/EligibilityReasons";
import ApplyModal from "@/src/components/candidate/dashboard/jobs/ApplyModal";

export default function JobDetailsPage() {
  const params = useParams();

  // ✅ Next can return string | string[] | undefined -> normalize to string | null
  const jobId: string | null = (() => {
    const raw = (params as any)?.jobId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return null;
  })();

  const [openApply, setOpenApply] = useState(false);

  // ✅ Don’t run queries unless jobId exists
  const jobQ = useCandidateJobDetails(jobId ?? "", { enabled: !!jobId });
  const eligQ = useCandidateJobEligibility(jobId ?? "", { enabled: !!jobId });

  const canApply = useMemo(() => eligQ.data?.eligible ?? false, [eligQ.data]);

  // If route param is missing (edge case)
  if (!jobId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-red-700">Missing job id in URL.</p>
        </div>
      </div>
    );
  }

  if (jobQ.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (jobQ.error || !jobQ.data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-red-700">Failed to load job details.</p>
        </div>
      </div>
    );
  }

  const job = jobQ.data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <JobDetailsHeader job={job} eligibility={eligQ.data} />

        {!canApply && eligQ.data?.reasons?.length ? (
          <EligibilityReasons reasons={eligQ.data.reasons} />
        ) : null}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Description
          </h2>

          <div className="prose max-w-none text-gray-700">
            {job.description ? (
              <div dangerouslySetInnerHTML={{ __html: job.description }} />
            ) : (
              <p>No description.</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={() => setOpenApply(true)}
              disabled={!canApply}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>

        <ApplyModal
          open={openApply}
          onClose={() => setOpenApply(false)}
          jobId={jobId} // ✅ now always string
          jobTitle={job.title}
          eligibility={eligQ.data}
        />
      </div>
    </div>
  );
}

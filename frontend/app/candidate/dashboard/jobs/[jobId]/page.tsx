"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, FileText } from "lucide-react";

import {
  useCandidateJobDetails,
  useCandidateJobEligibility,
} from "@/src/lib/candidate/jobs.queries";

import JobDetailsHeader from "@/src/components/candidate/dashboard/jobs/JobDetailsHeader";
import EligibilityReasons from "@/src/components/candidate/dashboard/jobs/EligibilityReasons";
import ApplyModal from "@/src/components/candidate/dashboard/jobs/ApplyModal";

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const jobId: string | null = (() => {
    const raw = (params as any)?.jobId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return null;
  })();

  const [openApply, setOpenApply] = useState(false);

  const jobQ = useCandidateJobDetails(jobId ?? "", { enabled: !!jobId });
  const eligQ = useCandidateJobEligibility(jobId ?? "", { enabled: !!jobId });

  const canApply = useMemo(() => eligQ.data?.eligible ?? false, [eligQ.data]);

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
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </button>

        <JobDetailsHeader job={job} eligibility={eligQ.data} />

        {!canApply && eligQ.data?.reasons?.length ? (
          <EligibilityReasons reasons={eligQ.data.reasons} />
        ) : null}

        {/* Layout similar to company view: description + side apply */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Description */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            </div>

            <div className="prose max-w-none text-gray-700">
              {job.description ? (
                <div dangerouslySetInnerHTML={{ __html: job.description }} />
              ) : (
                <p>No description.</p>
              )}
            </div>
          </div>

          {/* Apply card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
            <h3 className="text-base font-semibold text-gray-900">Application</h3>
            <p className="text-sm text-gray-600 mt-1">
              {canApply
                ? "You meet the requirements. You can apply now."
                : "Complete your profile to meet the requirements."}
            </p>

            <button
              onClick={() => setOpenApply(true)}
              disabled={!canApply}
              className="mt-4 w-full px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>

        <ApplyModal
          open={openApply}
          onClose={() => setOpenApply(false)}
          jobId={jobId}
          jobTitle={job.title}
          eligibility={eligQ.data}
        />
      </div>
    </div>
  );
}

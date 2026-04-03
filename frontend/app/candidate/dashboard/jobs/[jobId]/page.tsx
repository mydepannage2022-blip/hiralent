"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, FileText, MapPin, Clock, Briefcase, CheckCircle2, XCircle } from "lucide-react";

import {
  useCandidateJobDetails,
  useCandidateJobEligibility,
  useCandidateRecommendedJobs,
} from "@/src/lib/candidate/jobs.queries";

import { useMyApplicationsList } from "@/src/lib/candidate/applications.queries";

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
  const recQ = useCandidateRecommendedJobs({ page: 1, limit: 100 }, { enabled: !!jobId });
  const eligQ = useCandidateJobEligibility(jobId ?? "", { enabled: !!jobId });

  const myAppsQ = useMyApplicationsList(true);

  const appliedJobIds = useMemo(() => {
    const s = new Set<string>();
    for (const app of myAppsQ.data?.items ?? []) {
      if (app.job?.job_id) s.add(app.job.job_id);
    }
    return s;
  }, [myAppsQ.data?.items]);

  const isApplied = !!jobId && appliedJobIds.has(jobId);

  const recItem = useMemo(() => {
    return recQ.data?.items?.find((r) => r.job_id === jobId);
  }, [recQ.data, jobId]);

  const eligibility = useMemo(() => {
    const score = recItem?.match_score ?? 0;
    if (score >= 60) {
      return {
        eligible: true,
        reasons: [],
        missingSkills: recItem?.eligibility?.missingSkills ?? [],
        missingFields: [],
      };
    }
    return eligQ.data ?? null;
  }, [recItem, eligQ.data]);

  const canApply = eligibility?.eligible ?? false;
  const applyDisabled = !canApply || isApplied;

  if (!jobId) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-red-700">Missing job id in URL.</p>
        </div>
      </div>
    );
  }

  if (jobQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading job details…</p>
        </div>
      </div>
    );
  }

  if (jobQ.error || !jobQ.data) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-red-700">Failed to load job details.</p>
        </div>
      </div>
    );
  }

  const job = jobQ.data;

  return (
    // ✅ NO min-h-screen — scroll is handled by the layout's <main> wrapper
    <div className="bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to jobs
        </button>

        {/* Header card */}
        <JobDetailsHeader job={job} eligibility={eligibility ?? undefined} />

        {/* Eligibility banners */}
        {!canApply && eligibility?.reasons?.length ? (
          <EligibilityReasons reasons={eligibility.reasons} mode="blocking" />
        ) : null}

        {canApply && eligibility?.missingSkills?.length ? (
          <EligibilityReasons
            reasons={eligibility.missingSkills.map((sk: string) => `MISSING_SKILL:${sk}`)}
            mode="suggestions"
          />
        ) : null}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Description */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Job Description</h2>
            </div>

            <div className="px-6 py-5">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                {job.description ? (
                  <div dangerouslySetInnerHTML={{ __html: job.description }} />
                ) : (
                  <p className="text-gray-400 italic">No description provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Apply card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Card accent */}
              <div className={`h-1 w-full ${isApplied ? "bg-gray-200" : canApply ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-amber-400"}`} />

              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Application</h3>

                {/* Status indicator */}
                <div className={`flex items-center gap-2 mt-3 mb-4 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isApplied
                    ? "bg-gray-50 text-gray-600 border border-gray-100"
                    : canApply
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {isApplied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                      Already applied
                    </>
                  ) : canApply ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      You meet the requirements
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-amber-500" />
                      Profile incomplete
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!applyDisabled) setOpenApply(true);
                  }}
                  disabled={applyDisabled}
                  className={`w-full px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isApplied
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : canApply
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-100 active:scale-[0.98]"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isApplied ? "Application Submitted" : "Apply Now"}
                </button>

                {!canApply && !isApplied && (
                  <p className="mt-3 text-xs text-gray-400 text-center leading-relaxed">
                    Complete your profile to unlock this opportunity
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ApplyModal
        open={openApply}
        onClose={() => setOpenApply(false)}
        jobId={jobId}
        jobTitle={job.title}
        eligibility={eligibility ?? undefined}
      />
    </div>
  );
}
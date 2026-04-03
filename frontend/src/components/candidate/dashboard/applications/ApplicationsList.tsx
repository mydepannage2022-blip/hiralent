"use client";

import React from "react";
import { Loader2, Briefcase, ArrowRight } from "lucide-react";
import type { CandidateApplicationsListItemDTO } from "../../../../types/candidate.applications.types";
import ApplicationCard from "./ApplicationCard";
import { useRouter } from "next/navigation";

export default function ApplicationsList({
  items,
  isLoading,
}: {
  items: CandidateApplicationsListItemDTO[];
  isLoading: boolean;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#1B73E8]" />
        <p className="text-sm text-gray-400 animate-pulse">Loading your applications…</p>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EEF4FD] border border-[#C7DDFB] flex items-center justify-center mb-5 shadow-sm">
          <Briefcase className="w-7 h-7 text-[#1B73E8]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Start applying to jobs and your full application history will appear here.
        </p>
        <button
          onClick={() => router.push("/candidate/dashboard/jobs")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B73E8] text-white text-sm font-semibold hover:bg-[#1557B0] transition-colors shadow-sm"
        >
          Browse open jobs
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {items.map((it) => (
        <ApplicationCard key={it.application_id} item={it} />
      ))}
    </div>
  );
}
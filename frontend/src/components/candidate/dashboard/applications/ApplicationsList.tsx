"use client";

import React from "react";
import { Loader2, Briefcase } from "lucide-react";
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
        <p className="text-gray-600 mb-5">
          Apply to jobs and you’ll see your application history here.
        </p>
        <button
          onClick={() => router.push("/candidate/dashboard/jobs")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          Browse jobs
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {items.map((it) => (
        <ApplicationCard key={it.application_id} item={it} />
      ))}
    </div>
  );
}

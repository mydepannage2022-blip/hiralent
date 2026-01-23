// frontend/src/components/candidate/dashboard/applications/ApplicationsList.tsx
"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { CandidateApplicationsListItemDTO } from "../../../../types/candidate.applications.types";
import ApplicationCard from "./ApplicationCard";

export default function ApplicationsList({
  items,
  isLoading,
}: {
  items: CandidateApplicationsListItemDTO[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
        <p className="text-gray-600">Apply to jobs and you’ll see them here.</p>
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

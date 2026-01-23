// frontend/app/candidate/dashboard/applications/page.tsx
"use client";

import React from "react";
import { useCandidateApplications } from "@/src/lib/candidate/applications.queries";
import ApplicationsList from "@/src/components/candidate/dashboard/applications/ApplicationsList";

export default function ApplicationsPage() {
  const q = useCandidateApplications();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">My applications</h1>
        <ApplicationsList items={q.data?.items ?? []} isLoading={q.isLoading} />
      </div>
    </div>
  );
}

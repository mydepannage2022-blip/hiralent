"use client";

import React from "react";
import CandidatesTabs from "@/src/components/company/dashboard/candidates/CandidatesTabs";
import ExternalCandidatesList from "@/src/components/company/dashboard/candidates/ExternalCandidatesList";

export default function CompanyExternalCandidatesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <CandidatesTabs />
        <ExternalCandidatesList />
      </div>
    </div>
  );
}

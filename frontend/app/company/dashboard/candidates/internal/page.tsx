"use client";

import React from "react";
import CandidatesTabs from "@/src/components/company/dashboard/candidates/CandidatesTabs";
import InternalCandidatesList from "@/src/components/company/dashboard/candidates/InternalCandidatesList";

export default function CompanyInternalCandidatesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <CandidatesTabs />
        <InternalCandidatesList />
      </div>
    </div>
  );
}

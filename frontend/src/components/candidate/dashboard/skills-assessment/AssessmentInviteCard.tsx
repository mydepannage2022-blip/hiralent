// frontend/src/components/candidate/dashboard/skills-assessment/AssessmentInviteCard.tsx
"use client";

import React from "react";

export default function AssessmentInviteCard(props: {
  title: string;
  jobTitle?: string | null;
  expiresAt?: string | null;
  durationMin?: number | null;
  onAccept: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { title, jobTitle, expiresAt, durationMin, onAccept, disabled, loading } = props;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-[#222]">{title}</div>
          <div className="text-sm text-[#757575] mt-1">
            {jobTitle ? <>Job: <span className="text-[#222]">{jobTitle}</span></> : "Job: —"}
          </div>
          <div className="text-xs text-[#757575] mt-2">
            {durationMin ? `${durationMin} min` : "Time limit: —"}
            {expiresAt ? ` • Expires: ${new Date(expiresAt).toLocaleString()}` : ""}
          </div>
        </div>

        <button
          onClick={onAccept}
          disabled={Boolean(disabled) || Boolean(loading)}
          className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] disabled:opacity-60 text-sm"
        >
          {loading ? "Accepting..." : "Accept & Start"}
        </button>
      </div>
    </div>
  );
}

// frontend/src/components/candidate/dashboard/jobs/EligibilityReasons.tsx
"use client";

import React from "react";

function prettyReason(code: string) {
  if (code.startsWith("MISSING_SKILL:")) return `Missing skill: ${code.split(":")[1]}`;
  if (code.startsWith("MISSING_FIELD:")) return `Missing profile field: ${code.split(":")[1]}`;
  if (code.startsWith("LOW_PROFILE_SCORE:")) {
    // format: LOW_PROFILE_SCORE:min=65|actual=17
    const rest = code.replace("LOW_PROFILE_SCORE:", "");
    return `Profile score too low (${rest.replaceAll("|", ", ")})`;
  }
  if (code === "PROFILE_NOT_READY") return "Profile not ready yet";
  if (code === "JOB_NOT_ACTIVE") return "Job is not active";
  if (code === "JOB_NOT_FOUND") return "Job not found";
  if (code.startsWith("UNKNOWN_REQUIRED_FIELD:")) return `Unknown required field: ${code.split(":")[1]}`;
  return code;
}

export default function EligibilityReasons({ reasons }: { reasons: string[] }) {
  if (!reasons?.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">Why you can’t apply yet</p>
      <ul className="space-y-1">
        {reasons.slice(0, 8).map((r) => (
          <li key={r} className="text-xs text-gray-700">
            • {prettyReason(r)}
          </li>
        ))}
      </ul>
      {reasons.length > 8 && (
        <p className="text-xs text-gray-500 mt-2">+{reasons.length - 8} more…</p>
      )}
    </div>
  );
}

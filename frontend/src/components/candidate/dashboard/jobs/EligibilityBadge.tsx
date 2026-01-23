// frontend/src/components/candidate/dashboard/jobs/EligibilityBadge.tsx
"use client";

import React from "react";
import type { EligibilityResult } from "../../../../types/candidate.jobs.types";

export default function EligibilityBadge({ eligibility }: { eligibility: EligibilityResult }) {
  const ok = eligibility?.eligible;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        ok ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-800 border-yellow-200",
      ].join(" ")}
      title={ok ? "Eligible" : "Not eligible"}
    >
      {ok ? "Eligible" : "Not eligible"}
    </span>
  );
}

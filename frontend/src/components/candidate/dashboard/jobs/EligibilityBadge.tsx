"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { EligibilityResult } from "../../../../types/candidate.jobs.types";

export default function EligibilityBadge({ eligibility }: { eligibility: EligibilityResult }) {
  const ok = eligibility?.eligible;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
      ].join(" ")}
    >
      {ok
        ? <><CheckCircle2 className="w-3 h-3" /> Eligible</>
        : <><XCircle className="w-3 h-3" /> Not eligible</>
      }
    </span>
  );
}
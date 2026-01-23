"use client";

import React from "react";

export default function CandidateRankingBadge({ score }: { score?: number | null }) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  const tone =
    s >= 85 ? "bg-green-50 text-green-700 border-green-200" :
    s >= 70 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
              "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${tone}`}>
      Fit: {s}%
    </span>
  );
}

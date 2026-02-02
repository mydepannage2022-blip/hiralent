"use client";

import React from "react";

export default function CandidateSkills({ skills }: { skills?: string[] }) {
  const list = (skills ?? []).slice(0, 8);
  if (!list.length) return <span className="text-xs text-gray-500">No skills</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((s) => (
        <span key={s} className="px-2 py-1 rounded-full bg-gray-50 border text-xs text-gray-700">
          {s}
        </span>
      ))}
    </div>
  );
}

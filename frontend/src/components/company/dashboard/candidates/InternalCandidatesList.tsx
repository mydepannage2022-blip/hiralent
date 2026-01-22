"use client";

import React, { useMemo, useState } from "react";
import InternalCandidateCard from "./InternalCandidateCard";
import { useInternalCandidates } from "@/src/lib/company/candidates.queries";

export default function InternalCandidatesList() {
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);

  const filters = useMemo(() => ({ q, minScore }), [q, minScore]);
  const { data, isLoading, error } = useInternalCandidates(filters);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search candidate name, headline, skills..."
          className="w-full md:w-2/3 border border-gray-200 rounded-lg px-3 py-2 outline-none"
        />
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full md:w-48 border border-gray-200 rounded-lg px-3 py-2 outline-none"
        >
          <option value={0}>All scores</option>
          <option value={70}>70%+</option>
          <option value={80}>80%+</option>
          <option value={90}>90%+</option>
        </select>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">Loading...</div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-red-700">
          Failed to load internal candidates.
        </div>
      ) : !data?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="font-semibold text-gray-900">No candidates found</p>
          <p className="text-sm text-gray-600">Try adjusting filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((item: any) => (
            <InternalCandidateCard key={item.candidate_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

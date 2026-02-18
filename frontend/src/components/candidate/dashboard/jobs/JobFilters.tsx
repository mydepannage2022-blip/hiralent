"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { JobListQuery } from "../../../../types/candidate.jobs.types";

export default function JobFilters({
  query,
  onChange,
  onClear,
}: {
  query: JobListQuery;
  onChange: (q: JobListQuery) => void;
  onClear: () => void;
}) {
  const set = (patch: Partial<JobListQuery>) => {
    onChange({ ...query, ...patch, page: 1 });
  };

  const hasActive =
    !!query.search ||
    !!query.level ||
    (query.skills?.length ?? 0) > 0 ||
    query.eligible !== undefined;

  // ✅ Keep raw input so user can type commas freely
  const [skillsText, setSkillsText] = useState<string>((query.skills ?? []).join(","));

  // ✅ If query.skills changes from outside (clear / tab switch), sync text
  useEffect(() => {
    setSkillsText((query.skills ?? []).join(","));
  }, [useMemo(() => (query.skills ?? []).join("|"), [query.skills])]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActive && (
          <button
            onClick={() => {
              onClear();
              setSkillsText(""); // ✅ reset draft too
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <input
          value={query.search ?? ""}
          onChange={(e) => set({ search: e.target.value || undefined })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="backend, data engineer..."
        />
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Experience level</label>
        <select
          value={query.level ?? ""}
          onChange={(e) => set({ level: e.target.value || undefined })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="entry">Entry</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="executive">Executive</option>
        </select>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Eligible only</label>
        <select
          value={query.eligible === undefined ? "" : String(query.eligible)}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return set({ eligible: undefined });
            return set({ eligible: v === "true" });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="true">Eligible</option>
          <option value="false">Not eligible</option>
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Skills (comma separated)
        </label>

        <input
          value={skillsText}
          onChange={(e) => {
            const raw = e.target.value;

            // ✅ allow typing commas freely (including trailing commas)
            setSkillsText(raw);

            // ✅ still update query.skills array for backend filtering
            const skills = raw
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);

            set({ skills: skills.length ? skills : undefined });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="nodejs,postgresql,react"
        />
      </div>
    </div>
  );
}

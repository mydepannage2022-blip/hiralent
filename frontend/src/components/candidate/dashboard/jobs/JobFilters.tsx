"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";
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

  const [skillsText, setSkillsText] = useState<string>(
    (query.skills ?? []).join(", ")
  );

  useEffect(() => {
    setSkillsText((query.skills ?? []).join(", "));
  }, [useMemo(() => (query.skills ?? []).join("|"), [query.skills])]);

  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-gray-400 bg-white";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">Filters</span>
        {hasActive && (
          <button
            onClick={() => { onClear(); setSkillsText(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query.search ?? ""}
              onChange={(e) => set({ search: e.target.value || undefined })}
              className={`${inputClass} pl-8`}
              placeholder="backend, data engineer…"
            />
          </div>
        </div>

        {/* Experience level */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Experience
          </label>
          <div className="relative">
            <select
              value={query.level ?? ""}
              onChange={(e) => set({ level: e.target.value || undefined })}
              className={`${inputClass} appearance-none cursor-pointer pr-8`}
            >
              <option value="">All levels</option>
              <option value="entry">Entry</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="executive">Executive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Eligibility */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Eligibility
          </label>
          <div className="flex gap-1.5">
            {[
              { label: "All", value: "" },
              { label: "Eligible", value: "true" },
              { label: "Not eligible", value: "false" },
            ].map((opt) => {
              const current = query.eligible === undefined ? "" : String(query.eligible);
              const isActive = current === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    opt.value === ""
                      ? set({ eligible: undefined })
                      : set({ eligible: opt.value === "true" })
                  }
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Skills
          </label>
          <input
            value={skillsText}
            onChange={(e) => {
              const raw = e.target.value;
              setSkillsText(raw);
              const skills = raw.split(",").map((x) => x.trim()).filter(Boolean);
              set({ skills: skills.length ? skills : undefined });
            }}
            className={inputClass}
            placeholder="react, python, sql…"
          />
          <p className="mt-1 text-[11px] text-gray-400">Separate with commas</p>

          {(query.skills ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(query.skills ?? []).map((sk) => (
                <span
                  key={sk}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px]"
                >
                  {sk}
                  <button
                    onClick={() => {
                      const newSkills = (query.skills ?? []).filter((s) => s !== sk);
                      setSkillsText(newSkills.join(", "));
                      set({ skills: newSkills.length ? newSkills : undefined });
                    }}
                    className="hover:text-gray-900 ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
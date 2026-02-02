"use client";

import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useCandidateApplications } from "@/src/lib/candidate/applications.queries";
import ApplicationsList from "@/src/components/candidate/dashboard/applications/ApplicationsList";

export default function ApplicationsPage() {
  const q = useCandidateApplications();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const items = q.data?.items ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((x) => {
      const title = (x.job?.title ?? "").toLowerCase();
      const loc = (x.job?.location ?? "").toLowerCase();
      const st = (x.status ?? "").toLowerCase();
      return title.includes(s) || loc.includes(s) || st.includes(s);
    });
  }, [q.data?.items, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header row: search + count */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-96">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full outline-none text-sm"
                placeholder="Search by job title, location, status..."
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600">
              <SlidersHorizontal className="w-4 h-4" />
              <span>{filtered.length}</span>
            </div>
          </div>
        </div>

        <ApplicationsList items={filtered} isLoading={q.isLoading} />
      </div>
    </div>
  );
}

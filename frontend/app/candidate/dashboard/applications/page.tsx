"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useCandidateApplications } from "@/src/lib/candidate/applications.queries";
import ApplicationsList from "@/src/components/candidate/dashboard/applications/ApplicationsList";

const PAGE_SIZE = 6;

export default function ApplicationsPage() {
  const q = useCandidateApplications();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Filter
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

  // Reset to page 1 when search changes
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  // Paginate
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-96 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full outline-none text-sm text-gray-800 placeholder:text-gray-400"
            placeholder="Search by title, location, status…"
          />
          {filtered.length > 0 && (
            <span className="text-xs text-gray-400 shrink-0">{filtered.length}</span>
          )}
        </div>

        {/* List */}
        <ApplicationsList items={paginated} isLoading={q.isLoading} />

        {/* Pagination — only show if more than one page */}
        {!q.isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 pb-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors font-medium ${
                    p === page
                      ? "bg-[#1B73E8] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
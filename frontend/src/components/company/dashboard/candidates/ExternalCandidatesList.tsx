"use client";

import React, { useMemo, useState } from "react";
import ExternalCandidateCard from "./ExternalCandidateCard";
import { useExternalCandidates, useExternalSources } from "@/src/lib/company/candidates.queries";

export default function ExternalCandidatesList() {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 12;

  const filters = useMemo(
    () => ({ q: q.trim() || undefined, source: source || undefined, status: status || undefined, page, limit }),
    [q, source, status, page]
  );

  const sourcesQ = useExternalSources();
  const listQ = useExternalCandidates(filters);

  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search external candidates (ex: Data Engineer)..."
            className="w-full md:flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none"
          />

          <select
            value={source}
            onChange={(e) => {
              setPage(1);
              setSource(e.target.value);
            }}
            className="w-full md:w-56 border border-gray-200 rounded-lg px-3 py-2 outline-none"
            disabled={sourcesQ.isLoading}
          >
            <option value="">All sources</option>
            {(sourcesQ.data?.sources ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="w-full md:w-56 border border-gray-200 rounded-lg px-3 py-2 outline-none"
          >
            <option value="">All status</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="SHORTLISTED">SHORTLISTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {listQ.isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">Loading...</div>
      ) : listQ.isError ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-red-700">
          Failed to load external candidates.
          <div className="text-xs text-gray-500 mt-2">
            {String((listQ.error as any)?.message ?? listQ.error)}
          </div>
        </div>
      ) : !items.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="font-semibold text-gray-900">No external candidates found</p>
          <p className="text-sm text-gray-600">Try adjusting filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((item) => (
              <ExternalCandidateCard key={item.source_id} item={item} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              Page <span className="font-semibold">{page}</span> /{" "}
              <span className="font-semibold">{totalPages}</span> — Total{" "}
              <span className="font-semibold">{total}</span>
            </div>

            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
                onClick={() => setPage(1)}
                disabled={page <= 1}
              >
                First
              </button>
              <button
                className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
              <button
                className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                Last
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

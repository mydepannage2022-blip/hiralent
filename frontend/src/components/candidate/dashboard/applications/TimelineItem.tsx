// frontend/src/components/candidate/dashboard/applications/TimelineItem.tsx
"use client";

import React from "react";
import type { ApplicationTimelineItemDTO } from "../../../../types/candidate.applications.types";

export default function TimelineItem({ item }: { item: ApplicationTimelineItemDTO }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            Trigger: {item.trigger ?? "—"}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(item.created_at).toLocaleString()} • {item.source ?? "—"}
          </p>
        </div>

        <div className="text-right text-xs text-gray-600">
          <p>Rel: <span className="font-semibold text-gray-900">{item.relevance_score}</span></p>
          <p>Vec: <span className="font-semibold text-gray-900">{item.vector_score ?? 0}</span></p>
        </div>
      </div>

      {(item.reason_codes?.length || item.missing_skills?.length) ? (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {!!item.reason_codes?.length && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Reason codes</p>
              <ul className="text-xs text-gray-700 space-y-0.5">
                {item.reason_codes.slice(0, 8).map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            </div>
          )}

          {!!item.missing_skills?.length && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Missing skills</p>
              <div className="flex flex-wrap gap-2">
                {item.missing_skills.slice(0, 12).map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

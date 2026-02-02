"use client";

import React, { useMemo } from "react";
import { Loader2, Clock } from "lucide-react";
import type { ApplicationTimelineItemDTO } from "../../../../types/candidate.applications.types";
import TimelineItem from "./TimelineItem";

export default function Timeline({
  items,
  isLoading,
}: {
  items: ApplicationTimelineItemDTO[];
  isLoading: boolean;
}) {
  const sorted = useMemo(() => {
    const arr = [...(items ?? [])];
    arr.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return arr;
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!sorted?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-gray-700 font-medium">No timeline events yet.</p>
        <p className="text-gray-500 text-sm mt-1">
          Events will appear as your application gets processed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((it, idx) => (
        <TimelineItem
          key={it.history_id}
          item={it}
          isFirst={idx === 0}
          isLast={idx === sorted.length - 1}
        />
      ))}
    </div>
  );
}

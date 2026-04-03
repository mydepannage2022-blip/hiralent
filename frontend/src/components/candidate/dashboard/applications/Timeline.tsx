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
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#1B73E8]" />
        <p className="text-xs text-gray-400">Loading timeline…</p>
      </div>
    );
  }

  if (!sorted?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">No updates yet</p>
        <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
          Events will appear here as your application is processed.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-1 pb-4">
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
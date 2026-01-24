// frontend/src/components/candidate/dashboard/applications/Timeline.tsx
"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { ApplicationTimelineItemDTO } from "../../../../types/candidate.applications.types";
import TimelineItem from "./TimelineItem";

export default function Timeline({
  items,
  isLoading,
}: {
  items: ApplicationTimelineItemDTO[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-700">No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <TimelineItem key={it.history_id} item={it} />
      ))}
    </div>
  );
}

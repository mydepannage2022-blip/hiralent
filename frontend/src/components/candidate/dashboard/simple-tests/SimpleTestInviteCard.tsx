"use client";

import React from "react";
import { Clock, Play, MapPin, FlaskConical } from "lucide-react";
import type { UiSimpleTestInvite } from "@/src/lib/simpleTest/simpleTest.api";

type Props = {
  invite: UiSimpleTestInvite;
  loading?: boolean;
  onStart: () => void;
};

export default function SimpleTestInviteCard({ invite, loading, onStart }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors">

      {/* Left — icon + info */}
      <div className="min-w-0 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate text-[14px]">
            {invite.jobTitle ?? "Warm-up Test"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
            {invite.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {invite.location}
              </span>
            )}
            {invite.timeLimitMin && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {invite.timeLimitMin} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right — status badge + button */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {invite.status ?? "Accepted"}
        </span>

        <button
          onClick={onStart}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          {loading ? "Starting..." : "Start"}
        </button>
      </div>

    </div>
  );
}
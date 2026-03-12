"use client";

import React from "react";
import { Clock, Play, MapPin } from "lucide-react";
import type { UiSimpleTestInvite } from "@/src/lib/simpleTest/simpleTest.api";

type Props = {
  invite: UiSimpleTestInvite;
  loading?: boolean;
  onStart: () => void;
};

export default function SimpleTestInviteCard({
  invite,
  loading,
  onStart,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            {invite.jobTitle ?? "Job"}
          </h3>

          <div className="text-sm text-slate-600 flex items-center gap-4 flex-wrap">
            {invite.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {invite.location}
              </span>
            )}

            {invite.timeLimitMin && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {invite.timeLimitMin} min
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500">
            {invite.testTitle ?? "Simple Warm-up Test"}
          </div>

          <div className="text-xs text-emerald-600 font-medium">
            Unlimited attempts • Candidate-only score
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-3">
          <span className="text-xs px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-medium">
            {invite.status}
          </span>

          <button
            onClick={onStart}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {loading ? "Starting..." : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

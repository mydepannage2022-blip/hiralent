"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String((params as any)?.sessionId || "");

  return (
    <div className="min-h-screen bg-[#05070b] text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-bold">Assessment Submitted</div>
        <div className="text-sm text-white/70 mt-2">
          Session: {sessionId ? sessionId.slice(0, 8) : "—"}
        </div>

        <div className="grid grid-cols-1 gap-3 mt-6">
          <button
            onClick={() =>
              router.push(`/candidate/dashboard/skills-assessment/results/${sessionId}`)
            }
            disabled={!sessionId}
            className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold disabled:opacity-50"
          >
            View Results
          </button>

          <button
            onClick={() => router.push("/candidate/dashboard/skills-assessment/history")}
            className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            Back to History
          </button>
        </div>
      </div>
    </div>
  );
}

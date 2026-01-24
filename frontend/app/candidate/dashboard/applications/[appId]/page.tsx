"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useApplicationTimeline } from "@/src/lib/candidate/applications.queries";
import Timeline from "@/src/components/candidate/dashboard/applications/Timeline";

export default function ApplicationDetailsPage() {
  const params = useParams();

  // ✅ Normalize appId: string | string[] | undefined -> string | null
  const appId: string | null = useMemo(() => {
    const raw = (params as any)?.appId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return null;
  }, [params]);

  // ✅ Run query only if appId exists
  const q = useApplicationTimeline(appId ?? "", { enabled: !!appId });

  if (!appId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-red-700">Missing application id in URL.</p>
        </div>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900">Application timeline</h1>
          <p className="text-sm text-gray-600">Application ID: {appId}</p>

          {q.data?.application && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700">
                Status: {q.data.application.status}
              </span>
              <span className="px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700">
                Job ID: {q.data.application.job_id}
              </span>
            </div>
          )}

          {q.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Failed to load timeline: {String((q.error as any)?.message || q.error)}
            </div>
          )}
        </div>

        <Timeline items={q.data?.timeline ?? []} isLoading={q.isLoading} />
      </div>
    </div>
  );
}

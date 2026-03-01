"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import { useCandidateAssessmentHistory } from "@/src/lib/assessments/assessmentHistory.queries";

type UiRow = {
  sessionId: string;
  title: string;
  submittedAt: string | null;
  status: string;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString();
}

export default function Page() {
  const { data, isLoading, error } = useCandidateAssessmentHistory();

  const rows: UiRow[] = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    return items
      .map((it: any) => {
        const sessionId = String(it.sessionId ?? "");
        const title = String(it.title ?? it.assessmentTitle ?? "Skills Assessment");
        const submittedAt = (it.submittedAt ?? null) as string | null;
        const status = String(it.status ?? "SUBMITTED").toUpperCase();
        return { sessionId, title, submittedAt, status };
      })
      .filter((x) => Boolean(x.sessionId) && x.status === "SUBMITTED")
      .sort((a, b) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });
  }, [data]);

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        {/* compact top row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[#111]">Assessment History</div>
            <div className="text-sm text-gray-500">Your submitted assessments.</div>
          </div>

          <SmartLink
            href="/candidate/dashboard/skills-assessment"
            className="text-sm text-[#005DDC] hover:underline"
          >
            Back to Hub
          </SmartLink>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-14 bg-gray-200 rounded" />
              <div className="h-14 bg-gray-200 rounded" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-600">
            {String((error as any)?.message || error)}
          </div>
        ) : rows.length ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {rows.map((r, idx) => (
                <motion.div
                  key={r.sessionId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.18) }}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#111] truncate">{r.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Submitted: <span className="text-[#111]">{formatDate(r.submittedAt)}</span>
                    </div>
                  </div>

                  <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Submitted
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="text-[#111] font-semibold">No Assessments Yet</div>
            <div className="text-sm text-gray-500 mt-1">
              Complete an invited assessment to see it here.
            </div>
            <SmartLink
              href="/candidate/dashboard/skills-assessment/invites"
              className="inline-flex mt-5 px-5 py-2.5 rounded-lg bg-[#005DDC] text-white hover:bg-[#004EB7] font-semibold"
            >
              View Invites
            </SmartLink>
          </div>
        )}
      </div>
    </div>
  );
}

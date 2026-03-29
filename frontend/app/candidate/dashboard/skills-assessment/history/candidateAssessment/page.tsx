"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import { useCandidateAssessmentHistory } from "@/src/lib/assessments/assessmentHistory.queries";
import { ArrowLeft, Trophy, Clock, CheckCircle2 } from "lucide-react";

/* ── ALL ORIGINAL DATA LOGIC — UNTOUCHED ── */

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
  return t.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── UI helpers ── */

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
);

const FadeUp: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: "easeOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── MAIN ── */

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
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Top bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between"
        >
          <SmartLink
            href="/candidate/dashboard/skills-assessment"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </SmartLink>

        </motion.div>

        {/* ── History list ── */}
        <FadeUp delay={0.05}>
          <div className="space-y-2.5">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Assessment History
                </h2>
              </div>
              {!isLoading && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  {rows.length} submitted
                </span>
              )}
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full flex-shrink-0" />
                  </div>
                ))}
              </div>

            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">
                {String((error as any)?.message || error)}
              </div>

            ) : rows.length ? (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {rows.map((r, idx) => (
                  <motion.div
                    key={r.sessionId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.18) }}
                    className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                  >
                    {/* Icon + info */}
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-[14px]">
                          {r.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(r.submittedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Submitted badge */}
                    <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Submitted
                    </span>
                  </motion.div>
                ))}
              </div>

            ) : (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
                <div className="text-gray-900 font-semibold">No completed assessments yet</div>
                <div className="text-sm text-gray-500 mt-1">
                  Complete an invited assessment to see it here.
                </div>
                <SmartLink
                  href="/candidate/dashboard/skills-assessment/invites"
                  className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-[#1B73E8] text-white hover:bg-[#1557B0] transition-colors text-sm font-semibold"
                >
                  View Invites
                </SmartLink>
              </div>
            )}

          </div>
        </FadeUp>

      </div>
    </div>
  );
}
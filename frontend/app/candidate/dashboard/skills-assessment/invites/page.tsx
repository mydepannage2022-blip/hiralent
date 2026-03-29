"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import { useAssessmentInvites } from "@/src/lib/invites/invites.queries";
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";

/* ── ALL ORIGINAL DATA LOGIC — UNTOUCHED ── */

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) ? t < Date.now() : false;
}

type UiInviteRow = {
  inviteId: string;
  assessmentId: string | null;
  status: string;
  expired: boolean;
  expiresAt: string | null;
  jobTitle: string | null;
  assessmentTitle: string;
  durationMin: number | null;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString();
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

export default function AssessmentInvitesPage() {
  const router = useRouter();
  const { data: invites = [], isLoading, error } = useAssessmentInvites();

  const rows: UiInviteRow[] = useMemo(() => {
    return (invites || []).map((i: any) => {
      const inviteId = String(i.inviteId ?? i.invite_id ?? "");
      const assessmentId = (i.assessmentId ?? i.assessment_id ?? null) as string | null;
      const expiresAt = (i.expiresAt ?? i.expires_at ?? null) as string | null;
      const status = String(i.status ?? "PENDING").toUpperCase();
      return {
        inviteId,
        assessmentId,
        status,
        expired: isExpired(expiresAt),
        expiresAt,
        jobTitle: (i.jobTitle ?? i?.application?.job?.title ?? null) as string | null,
        assessmentTitle: (i.assessmentTitle ?? i?.assessment?.title ?? "Skills Assessment") as string,
        durationMin: (i.durationMin ?? i.duration_min ?? i?.assessment?.time_limit ?? null) as number | null,
      };
    });
  }, [invites]);

  const pendingCount = rows.filter((r) => !r.expired && r.status === "PENDING").length;

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

          {/* ── pending + total badges side by side ── */}
          {!isLoading && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#1B73E8] border border-blue-100">
                {pendingCount} pending
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {rows.length} total
              </span>
            </div>
          )}
        </motion.div>

        {/* ── Invitations list ── */}
        <FadeUp delay={0.05}>
          <div className="space-y-2.5">

            {/* Section header — only label + icon, no duplicate badges */}
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#1B73E8]" />
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                All Invitations
              </h2>
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
                    <Skeleton className="h-8 w-20 rounded-xl flex-shrink-0" />
                  </div>
                ))}
              </div>

            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">
                {String((error as any)?.message || error)}
              </div>

            ) : rows.length ? (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {rows.map((r, idx) => {
                  const canOpen = !r.expired && r.status === "PENDING";
                  return (
                    <motion.div
                      key={r.inviteId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.18) }}
                      onClick={() => canOpen && router.push(`/candidate/dashboard/skills-assessment/invites/${r.inviteId}`)}
                      className={`px-5 py-4 flex items-center justify-between gap-4 transition-colors ${canOpen ? "hover:bg-gray-50/70 cursor-pointer" : "opacity-50"}`}
                    >
                      {/* Icon + info */}
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${canOpen ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-200"}`}>
                          <ClipboardList className={`w-4 h-4 ${canOpen ? "text-[#1B73E8]" : "text-gray-400"}`} />
                        </div>

                        <div className="min-w-0">
                          {/* Title */}
                          <div className="font-semibold text-gray-900 truncate text-[14px]">
                            {r.assessmentTitle}
                          </div>

                          {/* Meta row — no "Job:" label, just the value */}
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                            {r.jobTitle && (
                              <span className="text-gray-500">{r.jobTitle}</span>
                            )}
                            {r.durationMin && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {r.durationMin} min
                              </span>
                            )}
                            {r.expiresAt && (
                              <span className={`flex items-center gap-1 font-medium ${r.expired ? "text-rose-500" : "text-amber-600"}`}>
                                <CalendarClock className="w-3 h-3" />
                                {r.expired ? "Expired" : `Expires: ${formatDate(r.expiresAt)}`}
                              </span>
                            )}
                            {!r.assessmentId && (
                              <span className="text-rose-500">Missing assessmentId</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right — status badge + button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          r.expired
                            ? "bg-red-50 border-red-200 text-red-600"
                            : r.status === "PENDING"
                            ? "bg-blue-50 border-blue-200 text-[#1B73E8]"
                            : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}>
                          {r.expired ? "Expired" : r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/candidate/dashboard/skills-assessment/invites/${r.inviteId}`);
                          }}
                          disabled={!canOpen}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1B73E8] text-white hover:bg-[#1557B0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                        >
                          Open
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            ) : (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-6 h-6 text-[#1B73E8]" />
                </div>
                <div className="text-gray-900 font-semibold">No invites found</div>
                <div className="text-sm text-gray-500 mt-1">
                  When a company invites you, it will appear here.
                </div>
              </div>
            )}

          </div>
        </FadeUp>

      </div>
    </div>
  );
}
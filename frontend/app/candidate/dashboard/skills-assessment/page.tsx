"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Sparkles,
  ChevronRight,
  Clock,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ArrowUpRight,
  Trophy,
  Zap,
} from "lucide-react";

import { useAssessmentInvites } from "@/src/lib/invites/invites.queries";
import { useCandidateAssessmentHistory } from "@/src/lib/assessments/assessmentHistory.queries";
import { useSimpleTestInvites } from "@/src/lib/simpleTest/simpleTest.queries";

/* ─────────────────────────── helpers ─────────────────────────── */

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) ? t < Date.now() : false;
}

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

function formatExpiry(d: string | null) {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  const diff = t.getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return `${days} days left`;
  if (days === 1) return "1 day left";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;
  return "Expiring soon";
}

/* ─────────────────────────── types ─────────────────────────── */

type UiPendingInvite = {
  inviteId: string;
  assessmentId: string | null;
  jobTitle: string | null;
  assessmentTitle: string;
  expiresAt: string | null;
  durationMin: number | null;
  status: string;
};

type UiRecentAssessment = {
  sessionId: string;
  title: string;
  submittedAt: string | null;
};

/* ─────────────────────────── skeleton ─────────────────────────── */

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
);

/* ────────────────────────── FadeUp helper ──────────────────────── */

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const FadeUp: React.FC<FadeUpProps> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: "easeOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ─────────────────────────── main ─────────────────────────── */

export default function AssessmentHubPage() {
  const router = useRouter();

  const {
    data: invites = [],
    isLoading: invitesLoading,
    error: invitesError,
  } = useAssessmentInvites();

  const {
    data: history = [],
    isLoading: historyLoading,
    error: historyError,
  } = useCandidateAssessmentHistory();

  const {
    data: simpleInvites = [],
    isLoading: simpleInvitesLoading,
    isError: simpleInvitesError,
  } = useSimpleTestInvites();

  /* ── pending invites ── */
  const pendingInvites: UiPendingInvite[] = useMemo(() => {
    return (invites || [])
      .map((i: any) => {
        const inviteId = String(i.inviteId ?? i.invite_id ?? "");
        const assessmentId = (i.assessmentId ?? i.assessment_id ?? null) as string | null;
        const expiresAt = (i.expiresAt ?? i.expires_at ?? null) as string | null;
        const status = String(i?.status ?? "PENDING").toUpperCase();
        return {
          inviteId,
          assessmentId,
          status,
          expiresAt,
          jobTitle: (i.jobTitle ?? i?.application?.job?.title ?? null) as string | null,
          assessmentTitle: (i.assessmentTitle ?? i?.assessment?.title ?? "Skills Assessment") as string,
          durationMin: (i.durationMin ?? i.duration_min ?? i?.assessment?.time_limit ?? null) as number | null,
        };
      })
      .filter((x: UiPendingInvite) => x.inviteId && x.status === "PENDING" && !isExpired(x.expiresAt));
  }, [invites]);

  /* ── recent assessments ── */
  const recentAssessments: UiRecentAssessment[] = useMemo(() => {
    const arr = Array.isArray(history) ? history : [];
    return arr
      .filter((h: any) => String(h.status ?? "").toUpperCase() === "SUBMITTED")
      .sort((a: any, b: any) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 3)
      .map((h: any) => ({
        sessionId: String(h.sessionId ?? ""),
        title: String(h.title ?? "Skills Assessment"),
        submittedAt: (h.submittedAt ?? null) as string | null,
      }))
      .filter((x: UiRecentAssessment) => Boolean(x.sessionId));
  }, [history]);

  const warmupCount = Array.isArray(simpleInvites) ? simpleInvites.length : 0;

  return (
    // ✅ no extra colored background: let the layout/page background be default
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ✅ Start Assessment placed "in its place" (inside the page header line) */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center"
        >
          <SmartLink
            href="/candidate/dashboard/skills-assessment/start"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B73E8] text-white rounded-full hover:bg-[#1557B0] transition-colors text-sm font-semibold shadow-sm"
          >
            <Zap className="w-4 h-4" />
            Start Assessment
          </SmartLink>
        </motion.div>

        {/* ── Warm-up / Simple Tests ── */}
        <FadeUp delay={0.05}>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Warm-up Tests
              </h2>
            </div>

            {/* ✅ brighter luminous green, less "dark" */}
            <div
              onClick={() => router.push("/candidate/dashboard/simple-tests")}
              className="relative overflow-hidden rounded-2xl cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              style={{
                background: "linear-gradient(135deg, #34D399 0%, #22C55E 45%, #16A34A 100%)",
              }}
            >
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/14 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/12 pointer-events-none" />

              <div className="relative p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/18 border border-white/30 flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-6 h-6 text-white" />
                  </div>

                  <div>
                    <div className="text-white font-bold text-[15px] leading-snug">
                      Practice before the real assessment
                    </div>
                    <div className="text-emerald-50/95 text-sm mt-1">
                      Optional · unlimited attempts · only visible to you
                    </div>

                    {/* ✅ keep only essential info */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/22 text-white border border-white/35">
                        <Sparkles className="w-3 h-3" />
                        {simpleInvitesLoading
                          ? "Loading…"
                          : simpleInvitesError
                          ? "Unavailable"
                          : `${warmupCount} available`}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/candidate/dashboard/simple-tests");
                  }}
                  className="shrink-0 self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  Start Warm-up
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ── Pending Invitations ── */}
        <FadeUp delay={0.1}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#1B73E8]" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Pending Invitations
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {!invitesLoading && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#1B73E8] border border-blue-100">
                    {pendingInvites.length} pending
                  </span>
                )}

                <SmartLink
                  href="/candidate/dashboard/skills-assessment/invites"
                  className="text-xs font-semibold text-[#1B73E8] hover:underline flex items-center gap-1"
                >
                  View All Invites
                  <ChevronRight className="w-3.5 h-3.5" />
                </SmartLink>
              </div>
            </div>

            {invitesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((n) => (
                  <div key={n} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
            ) : invitesError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">
                {String((invitesError as any)?.message || invitesError)}
              </div>
            ) : pendingInvites.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingInvites.map((inv, idx) => {
                  const expiry = formatExpiry(inv.expiresAt);
                  const isUrgent = expiry?.includes("h left") || expiry?.includes("soon");
                  return (
                    <motion.div
                      key={inv.inviteId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      whileHover={{ y: -2 }}
                      onClick={() => router.push(`/candidate/dashboard/skills-assessment/invites/${inv.inviteId}`)}
                      className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#1B73E8]/40 hover:shadow-[0_8px_24px_rgba(27,115,232,0.08)] transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate text-[15px]">
                            {inv.assessmentTitle}
                          </div>

                          {inv.jobTitle ? (
                            <div className="text-sm text-gray-500 mt-0.5 truncate">{inv.jobTitle}</div>
                          ) : null}

                          <div className="flex flex-wrap gap-2 mt-3">
                            {inv.durationMin ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                                <Clock className="w-3 h-3" />
                                {inv.durationMin} min
                              </span>
                            ) : null}

                            {expiry ? (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                                  isUrgent
                                    ? "bg-rose-50 border-rose-200 text-rose-700"
                                    : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}
                              >
                                <CalendarClock className="w-3 h-3" />
                                {expiry}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/candidate/dashboard/skills-assessment/invites/${inv.inviteId}`);
                          }}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1B73E8] text-white hover:bg-[#1557B0] transition-colors text-sm font-semibold"
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
                <div className="text-gray-900 font-semibold">No invitations right now</div>
                <div className="text-sm text-gray-500 mt-1">Invites will appear here when available.</div>
              </div>
            )}
          </div>
        </FadeUp>

        {/* ── Recent Assessments ── */}
        <FadeUp delay={0.15}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Recent Assessments
                </h2>
              </div>

              <SmartLink
                href="/candidate/dashboard/skills-assessment/history/candidateAssessment"
                className="text-xs font-semibold text-[#1B73E8] hover:underline flex items-center gap-1"
              >
                View All History
                <ChevronRight className="w-3.5 h-3.5" />
              </SmartLink>
            </div>

            {historyLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : historyError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">
                {String((historyError as any)?.message || historyError)}
              </div>
            ) : recentAssessments.length ? (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {recentAssessments.map((a, idx) => (
                  <motion.div
                    key={a.sessionId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-[14px]">
                          {a.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(a.submittedAt)}
                        </div>
                      </div>
                    </div>
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
                <div className="text-sm text-gray-500 mt-1">Your submitted assessments will show up here.</div>
              </div>
            )}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
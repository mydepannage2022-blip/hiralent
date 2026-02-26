"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FlaskConical,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { useAssessmentInvites } from "@/src/lib/invites/invites.queries";
import { useCandidateAssessmentHistory } from "@/src/lib/assessments/assessmentHistory.queries";
import { useSimpleTestInvites } from "@/src/lib/simpleTest/simpleTest.queries";

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) ? t < Date.now() : false;
}

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

function formatDate(d: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString();
}

export default function AssessmentHubPage() {
  const router = useRouter();

  const { data: invites = [], isLoading: invitesLoading, error: invitesError } =
    useAssessmentInvites();

  const {
    data: history = [],
    isLoading: historyLoading,
    error: historyError,
  } = useCandidateAssessmentHistory();

  // ✅ Simple Tests (Warm-up)
  const {
    data: simpleInvites = [],
    isLoading: simpleInvitesLoading,
    isError: simpleInvitesError,
  } = useSimpleTestInvites();

  const pendingInvites: UiPendingInvite[] = useMemo(() => {
    return (invites || [])
      .map((i: any) => {
        const inviteId = String(i.inviteId ?? i.invite_id ?? "");
        const assessmentId = (i.assessmentId ?? i.assessment_id ?? null) as
          | string
          | null;
        const expiresAt = (i.expiresAt ?? i.expires_at ?? null) as
          | string
          | null;
        const status = String(i?.status ?? "PENDING").toUpperCase();

        return {
          inviteId,
          assessmentId,
          status,
          expiresAt,
          jobTitle: (i.jobTitle ?? i?.application?.job?.title ?? null) as
            | string
            | null,
          assessmentTitle: (i.assessmentTitle ??
            i?.assessment?.title ??
            "Skills Assessment") as string,
          durationMin: (i.durationMin ??
            i.duration_min ??
            i?.assessment?.time_limit ??
            null) as number | null,
        };
      })
      .filter(
        (x: UiPendingInvite) =>
          x.inviteId && x.status === "PENDING" && !isExpired(x.expiresAt)
      );
  }, [invites]);

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

  const openInvite = (inviteId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/invites/${inviteId}`);
  };

  const openWarmup = () => {
    router.push(`/candidate/dashboard/simple-tests`);
  };

  const warmupCount = Array.isArray(simpleInvites) ? simpleInvites.length : 0;

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <SmartLink
            href="/candidate/dashboard/skills-assessment/start"
            className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors text-sm font-semibold"
          >
            Start Assessments
          </SmartLink>

          <SmartLink
            href="/candidate/dashboard/skills-assessment/invites"
            className="text-sm text-[#005DDC] hover:underline"
          >
            View All Invites
          </SmartLink>
        </div>

        {/* ✅ Warm-up (Simple Tests) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-semibold text-[#111]">
                Simple Tests
              </h2>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-emerald-700" />
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-[#111]">
                      Practice before the real assessment
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Optional, unlimited attempts — and your score is visible
                      only to you.
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-[#111]">
                        {simpleInvitesLoading
                          ? "Loading…"
                          : simpleInvitesError
                          ? "Warm-up unavailable"
                          : `${warmupCount} available`}
                      </span>

                      <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Not counted in assessment history
                      </span>
                    </div>
                  </div>
                </div>

                {simpleInvitesError ? (
                  <div className="mt-3 text-sm text-rose-600">
                    Could not load warm-up tests right now.
                  </div>
                ) : null}
              </div>

              <button
                onClick={openWarmup}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold"
              >
                Start Warm-up
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Pending Invitations */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#111]">
              Pending Invitations
            </h2>
            <span className="text-xs text-gray-500">
              {pendingInvites.length} pending
            </span>
          </div>

          {invitesLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-14 bg-gray-200 rounded" />
              </div>
            </div>
          ) : invitesError ? (
            <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-600">
              {String((invitesError as any)?.message || invitesError)}
            </div>
          ) : pendingInvites.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.inviteId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openInvite(inv.inviteId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      openInvite(inv.inviteId);
                  }}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111] truncate">
                        {inv.assessmentTitle}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Job:{" "}
                        <span className="text-[#111]">
                          {inv.jobTitle ?? "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {inv.durationMin ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-[#111]">
                            {inv.durationMin} min
                          </span>
                        ) : null}
                        {inv.expiresAt ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-[#111]">
                            Expires: {formatDate(inv.expiresAt)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvite(inv.inviteId);
                      }}
                      className="shrink-0 px-4 py-2 rounded-lg bg-[#005DDC] text-white hover:bg-[#004EB7] text-sm font-semibold"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <div className="text-[#111] font-semibold">
                No invitations right now
              </div>
              <div className="text-sm text-gray-500 mt-1">
                When a company invites you, it will appear here.
              </div>
            </div>
          )}
        </motion.section>

        {/* Recent Assessments */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#111]">
              Recent Assessments
            </h2>
            <SmartLink
              href="/candidate/dashboard/skills-assessment/history/candidateAssessment"
              className="text-sm text-[#005DDC] hover:underline"
            >
              View All History
            </SmartLink>
          </div>

          {historyLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-14 bg-gray-200 rounded" />
              </div>
            </div>
          ) : historyError ? (
            <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-600">
              {String((historyError as any)?.message || historyError)}
            </div>
          ) : recentAssessments.length ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-100">
                {recentAssessments.map((a) => (
                  <div
                    key={a.sessionId}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111] truncate">
                        {a.title}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Submitted:{" "}
                        <span className="text-[#111]">
                          {formatDate(a.submittedAt)}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Submitted
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <div className="text-[#111] font-semibold">
                No assessments completed yet
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Complete your first invited assessment to see it here.
              </div>
              <SmartLink
                href="/candidate/dashboard/skills-assessment/invites"
                className="inline-flex mt-5 px-5 py-2.5 rounded-lg bg-[#005DDC] text-white hover:bg-[#004EB7] font-semibold"
              >
                View Invites
              </SmartLink>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

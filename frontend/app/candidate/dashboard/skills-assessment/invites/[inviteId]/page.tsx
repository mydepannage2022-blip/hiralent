"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import {
  useAssessmentInvites,
  useAcceptAssessmentInvite,
} from "@/src/lib/invites/invites.queries";
import { useStartAssessmentSession } from "@/src/lib/assessments/candidateAssessment.queries";
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  CalendarClock,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ── ALL ORIGINAL DATA LOGIC — UNTOUCHED ── */

function safeStr(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.trim() ? s : null;
}

function parseDateMaybe(d?: string | null): Date | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isFinite(t.getTime()) ? t : null;
}

function isExpired(expiresAt?: string | null) {
  const dt = parseDateMaybe(expiresAt);
  if (!dt) return false;
  return dt.getTime() < Date.now();
}

function normalizeInvite(raw: any) {
  const inviteId = safeStr(raw?.inviteId ?? raw?.invite_id) ?? "";
  const assessmentId = safeStr(raw?.assessmentId ?? raw?.assessment_id);
  const applicationId = safeStr(raw?.applicationId ?? raw?.application_id);
  const status = safeStr(raw?.status) ?? "PENDING";
  const expiresAt = safeStr(raw?.expiresAt ?? raw?.expires_at);
  const assessmentTitle =
    safeStr(raw?.assessmentTitle ?? raw?.assessment_title ?? raw?.assessment?.title) ?? null;
  const jobTitle =
    safeStr(raw?.jobTitle ?? raw?.job_title ?? raw?.application?.job?.title) ?? null;
  const durationMinRaw =
    raw?.durationMin ?? raw?.duration_min ?? raw?.assessment?.time_limit ?? raw?.assessment?.time_limit_min ?? null;
  const durationMin =
    typeof durationMinRaw === "number" ? durationMinRaw
    : typeof durationMinRaw === "string" ? Number(durationMinRaw)
    : null;
  return {
    inviteId,
    assessmentId: assessmentId ?? null,
    applicationId: applicationId ?? null,
    status: String(status).toUpperCase(),
    expiresAt: expiresAt ?? null,
    assessmentTitle,
    jobTitle,
    durationMin: Number.isFinite(durationMin as any) ? (durationMin as number) : null,
  };
}

function statusLabel(status: string) {
  const s = status.toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "ACCEPTED") return "Accepted";
  if (s === "DECLINED") return "Declined";
  if (s === "EXPIRED") return "Expired";
  return s;
}

function formatDate(d: string | null) {
  const dt = parseDateMaybe(d);
  if (!dt) return "—";
  return dt.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── UI helpers ── */

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

const RULES = [
  "No tab switching abuse — browser activity is monitored.",
  "No external copy/paste outside the editor.",
  "Once submitted, you cannot edit your answers.",
  "The timer is strict — your session may expire automatically.",
];

/* ── MAIN ── */

export default function InviteRulesPage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = String((params as any)?.inviteId || "").trim();

  const { data: invites = [], isLoading, error, refetch } = useAssessmentInvites();
  const acceptMut = useAcceptAssessmentInvite();
  const startSessionMut = useStartAssessmentSession();

  const [acceptedRules, setAcceptedRules] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inv = useMemo(() => {
    const arr = Array.isArray(invites) ? invites : [];
    const found = arr.find((x: any) => {
      const id = safeStr(x?.inviteId ?? x?.invite_id);
      return id === inviteId;
    });
    return found ? normalizeInvite(found) : null;
  }, [invites, inviteId]);

  const expiresAt = inv?.expiresAt ?? null;
  const expired = isExpired(expiresAt);
  const status = inv?.status ? String(inv.status).toUpperCase() : "PENDING";
  const assessmentId = inv?.assessmentId ?? null;
  const busy = submitting || acceptMut.isPending || startSessionMut.isPending;
  const title = inv?.assessmentTitle ?? "Skills Assessment";
  const jobTitle = inv?.jobTitle ?? (inv?.applicationId ? `Application ${inv.applicationId.slice(0, 8)}` : null);
  const durationMin = inv?.durationMin ?? null;

  const disabledReason = (() => {
    if (!inviteId) return "Missing inviteId in route";
    if (!inv) return "Invite not found";
    if (!assessmentId) return "Missing assessmentId on invite";
    if (expired) return "Invite expired";
    if (status !== "PENDING") return `Invite status is ${statusLabel(status)}`;
    if (!acceptedRules) return "You must accept the rules first";
    if (busy) return "Processing...";
    return null;
  })();

  const onStart = async () => {
    setLocalErr(null);
    try {
      setSubmitting(true);
      if (!inv) { await refetch(); throw new Error("Invite not found (please refresh)"); }
      if (!assessmentId) throw new Error("Missing assessmentId on invite");
      if (expired) throw new Error("Invite expired");
      if (status !== "PENDING") throw new Error(`Invite status is ${statusLabel(status)}`);
      if (!acceptedRules) throw new Error("You must accept the rules first");
      await acceptMut.mutateAsync({ inviteId });
      const sessionId = await startSessionMut.mutateAsync({ assessmentId });
      if (typeof window !== "undefined") {
        localStorage.setItem("last_assessment_session_id", String(sessionId));
      }
      router.push(`/assessment/session/${sessionId}`);
    } catch (e: any) {
      setLocalErr(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">

      {/* ── Back link — outside centered container, sticks to left ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="px-4 sm:px-6 pt-6"
      >
        <SmartLink
          href="/candidate/dashboard/skills-assessment/invites"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invites
        </SmartLink>
      </motion.div>

      {/* ── Centered content ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Loading ── */}
        {isLoading ? (
          <FadeUp delay={0.05}>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-10 bg-gray-100 rounded mt-4" />
            </div>
          </FadeUp>
        ) : error ? (
          <FadeUp delay={0.05}>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">
              {String((error as any)?.message || error)}
              <button onClick={() => refetch()} className="mt-3 block text-sm px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 transition-colors">
                Retry
              </button>
            </div>
          </FadeUp>
        ) : !inv ? (
          <FadeUp delay={0.05}>
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-gray-900 font-semibold">Invite not found</div>
              <button onClick={() => refetch()} className="mt-3 text-sm text-[#1B73E8] hover:underline">Refresh</button>
            </div>
          </FadeUp>
        ) : (
          <>
            {/* ── Invite info card ── */}
            <FadeUp delay={0.05}>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#1B73E8]" />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Assessment Details
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="font-semibold text-gray-900 text-[15px]">{title}</div>
                  {jobTitle && <div className="text-sm text-gray-500 mt-0.5">{jobTitle}</div>}

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      expired ? "bg-red-50 border-red-200 text-red-600"
                      : status === "PENDING" ? "bg-blue-50 border-blue-200 text-[#1B73E8]"
                      : status === "ACCEPTED" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}>
                      {expired ? "Expired" : statusLabel(status)}
                    </span>

                    {durationMin && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {durationMin} min
                      </span>
                    )}

                    {expiresAt && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${expired ? "text-rose-500" : "text-amber-600"}`}>
                        <CalendarClock className="w-3 h-3" />
                        Expires: {formatDate(expiresAt)}
                      </span>
                    )}
                  </div>

                  {!assessmentId && (
                    <div className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                      Missing assessmentId — cannot start session. Fix API response to include assessmentId.
                    </div>
                  )}
                </div>
              </div>
            </FadeUp>

            {/* ── Rules card ── */}
            <FadeUp delay={0.08}>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Assessment Rules
                  </h2>
                </div>

                <div className="px-5 py-4 space-y-2.5">
                  {RULES.map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-amber-600">{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>

                {/* Accept checkbox */}
                <div className="px-5 pb-5">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    acceptedRules ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
                  }`}>
                    <input
                      type="checkbox"
                      checked={acceptedRules}
                      onChange={(e) => setAcceptedRules(e.target.checked)}
                      disabled={busy || expired || status !== "PENDING"}
                      className="w-4 h-4 accent-[#1B73E8]"
                    />
                    <span className={`text-sm font-medium ${acceptedRules ? "text-emerald-800" : "text-gray-700"}`}>
                      I have read and accept the assessment rules
                    </span>
                    {acceptedRules && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />}
                  </label>
                </div>
              </div>
            </FadeUp>

            {/* ── Error ── */}
            {localErr && (
              <FadeUp delay={0}>
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{localErr}</p>
                </div>
              </FadeUp>
            )}

            {/* ── Start button ── */}
            <FadeUp delay={0.1}>
              <button
                onClick={onStart}
                disabled={Boolean(disabledReason)}
                className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  disabledReason
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#1B73E8] text-white hover:bg-[#1557B0] shadow-sm"
                }`}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  "Accept Rules & Start Assessment"
                )}
              </button>

              {disabledReason && !busy && (
                <p className="text-xs text-center text-gray-400 mt-2">{disabledReason}</p>
              )}
            </FadeUp>
          </>
        )}
      </div>
    </div>
  );
}
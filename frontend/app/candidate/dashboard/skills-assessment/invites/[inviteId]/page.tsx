"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SmartLink from "@/src/components/layout/SmartLink";
import {
  useAssessmentInvites,
  useAcceptAssessmentInvite,
} from "@/src/lib/invites/invites.queries";
import { useStartAssessmentSession } from "@/src/lib/assessments/candidateAssessment.queries";

/** utils */
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
  // ✅ accept both camelCase + snake_case
  const inviteId = safeStr(raw?.inviteId ?? raw?.invite_id) ?? "";
  const assessmentId = safeStr(raw?.assessmentId ?? raw?.assessment_id);
  const applicationId = safeStr(raw?.applicationId ?? raw?.application_id);
  const status = safeStr(raw?.status) ?? "PENDING";
  const expiresAt = safeStr(raw?.expiresAt ?? raw?.expires_at);

  // display fields (optional)
  const assessmentTitle =
    safeStr(raw?.assessmentTitle ?? raw?.assessment_title ?? raw?.assessment?.title) ??
    null;

  const jobTitle =
    safeStr(raw?.jobTitle ?? raw?.job_title ?? raw?.application?.job?.title) ??
    null;

  const durationMinRaw =
    raw?.durationMin ??
    raw?.duration_min ??
    raw?.assessment?.time_limit ??
    raw?.assessment?.time_limit_min ??
    null;

  const durationMin =
    typeof durationMinRaw === "number"
      ? durationMinRaw
      : typeof durationMinRaw === "string"
      ? Number(durationMinRaw)
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
  if (s === "PENDING") return "PENDING";
  if (s === "ACCEPTED") return "ACCEPTED";
  if (s === "DECLINED") return "DECLINED";
  if (s === "EXPIRED") return "EXPIRED";
  return s;
}

function formatDate(d: string | null) {
  const dt = parseDateMaybe(d);
  return dt ? dt.toLocaleString() : "—";
}

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
  const blockedByStatus =
    status !== "PENDING" ? `Invite status is ${statusLabel(status)}` : null;

  const assessmentId = inv?.assessmentId ?? null;

  const busy = submitting || acceptMut.isPending || startSessionMut.isPending;

  const title = inv?.assessmentTitle ?? "Skills Assessment";
  const jobTitle =
    inv?.jobTitle ??
    (inv?.applicationId ? `Application: ${inv.applicationId.slice(0, 8)}` : "Job: —");

  const durationMin = inv?.durationMin ?? null;

  const disabledReason = (() => {
    if (!inviteId) return "Missing inviteId in route";
    if (!inv) return "Invite not found";
    if (!assessmentId) return "Missing assessmentId on invite";
    if (expired) return "Invite expired";
    if (status !== "PENDING") return blockedByStatus ?? "Invite is not pending";
    if (!acceptedRules) return "You must accept the rules first";
    if (busy) return "Processing...";
    return null;
  })();

  const onStart = async () => {
    setLocalErr(null);

    try {
      setSubmitting(true);

      // 🔁 if invite not found, refetch once (robust when user opens page directly)
      if (!inv) {
        await refetch();
        throw new Error("Invite not found (please refresh invites list)");
      }

      if (!assessmentId) throw new Error("Missing assessmentId on invite");
      if (expired) throw new Error("Invite expired");
      if (status !== "PENDING") throw new Error(`Invite status is ${statusLabel(status)} (expected PENDING)`);
      if (!acceptedRules) throw new Error("You must accept the rules first");

      // 1) accept invite
      await acceptMut.mutateAsync({ inviteId });

      // 2) start session from assessmentId
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
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold text-[#222]">Assessment Rules</div>
            <div className="text-sm text-[#757575]">Please read and accept before starting.</div>
          </div>

          <SmartLink
            href="/candidate/dashboard/skills-assessment/invites"
            className="text-sm text-[#005DDC] hover:underline"
          >
            Back to Invites
          </SmartLink>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-lg p-6 text-sm text-red-600">
            {String((error as any)?.message || error)}
            <div className="mt-3">
              <button
                onClick={() => refetch()}
                className="text-sm px-3 py-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !inv ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-[#757575]">
            Invite not found.{" "}
            <button onClick={() => refetch()} className="text-[#005DDC] hover:underline">
              Refresh
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="font-semibold text-[#222]">{title}</div>

              <div className="text-sm text-[#757575] mt-1">
                <span className="text-[#222]">{jobTitle}</span>
              </div>

              <div className="text-xs text-[#757575] mt-2">
                Status: {statusLabel(status)}
                {typeof durationMin === "number" ? ` • ${durationMin} min` : ""}
                {expiresAt ? ` • Expires: ${formatDate(expiresAt)}` : ""}
                {expired ? " • (Expired)" : ""}
              </div>

              {!assessmentId ? (
                <div className="mt-3 text-xs text-red-600">
                  Missing assessmentId in invite row (cannot start session). Fix API response to include assessmentId.
                </div>
              ) : null}
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-[#444] space-y-2">
                <div className="font-semibold">Rules</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No tab switching abuse (monitored).</li>
                  <li>No external copy/paste outside editor.</li>
                  <li>Once submitted, you cannot edit answers.</li>
                  <li>Timer is strict; session may expire automatically.</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 text-sm text-[#444]">
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="mt-1"
                  disabled={busy || expired || status !== "PENDING"}
                />
                I have read and accept the assessment rules.
              </label>

              {localErr ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
                  {localErr}
                </div>
              ) : null}

              <button
                onClick={onStart}
                disabled={Boolean(disabledReason)}
                title={disabledReason ?? undefined}
                className="w-full px-4 py-3 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] disabled:opacity-60 font-semibold"
              >
                {busy ? "Starting..." : "Accept Rules & Start"}
              </button>

              {/* little helper */}
              {disabledReason && !busy ? (
                <div className="text-xs text-[#757575]">
                  {disabledReason}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


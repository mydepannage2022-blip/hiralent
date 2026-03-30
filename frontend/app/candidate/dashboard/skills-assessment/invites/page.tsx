"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SmartLink from "@/src/components/layout/SmartLink";
import { useAssessmentInvites } from "@/src/lib/invites/invites.queries";

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

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[#111]">Assessment Invites</div>
            <div className="text-sm text-gray-500">Open an invite, accept rules, then start.</div>
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
            </div>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-600">
            {String((error as any)?.message || error)}
          </div>
        ) : rows.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((r, idx) => {
              const canOpen = !r.expired && r.status === "PENDING";
              return (
                <motion.div
                  key={r.inviteId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.18) }}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111] truncate">{r.assessmentTitle}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Job: <span className="text-[#111]">{r.jobTitle ?? "—"}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-[#111]">
                          {r.status}
                        </span>
                        {r.durationMin ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-[#111]">
                            {r.durationMin} min
                          </span>
                        ) : null}
                        <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-[#111]">
                          Expires: {formatDate(r.expiresAt)}
                        </span>
                        {r.expired ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-red-50 border border-red-100 text-red-700">
                            Expired
                          </span>
                        ) : null}
                      </div>

                      {!r.assessmentId ? (
                        <div className="mt-3 text-xs text-red-600">
                          Missing assessmentId (backend must return assessment_id)
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => router.push(`/candidate/dashboard/skills-assessment/invites/${r.inviteId}`)}
                      disabled={!canOpen}
                      className="shrink-0 px-4 py-2 rounded-lg bg-[#005DDC] text-white hover:bg-[#004EB7] disabled:opacity-50 text-sm font-semibold"
                    >
                      Open
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="text-[#111] font-semibold">No invites found</div>
            <div className="text-sm text-gray-500 mt-1">
              When a company invites you, it will appear here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

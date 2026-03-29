"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, MessageSquare } from "lucide-react";

export type InternalCandidateItem = {
  candidate_id: string;
  full_name?: string | null;
  headline?: string | null;
  skills?: string[];
  applied_count?: number | null;
  fit_score?: number | null;
  linkedin_url?: string | null;
  profile_picture_url?: string | null;
};

type Props = {
  item: InternalCandidateItem;
  onInvite?: (id: string) => void;
  onChat?: (id: string) => void;
};

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function normalizeFit(score?: number | null) {
  if (score == null) return null;
  const v = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function fitTone(fit: number | null) {
  if (fit == null) return "bg-gray-50 text-gray-700 border-gray-200";
  if (fit >= 85) return "bg-green-50 text-green-700 border-green-200";
  if (fit >= 70) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

export default function InternalCandidateCard({ item, onInvite, onChat }: Props) {
  const router = useRouter();
  if (!item) return null;

  const id = String(item.candidate_id);
  const fullName = item.full_name ?? "—";
  const headline = item.headline ?? "—";
  const skills = (item.skills ?? []).slice(0, 8);
  const fit = normalizeFit(item.fit_score);

  return (
    <div
      className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition cursor-pointer"
      onClick={() => router.push(`/company/dashboard/candidates/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/company/dashboard/candidates/${id}`);
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border bg-gray-50 flex items-center justify-center">
              {item.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.profile_picture_url}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-blue-700">
                  {initials(fullName)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{fullName}</div>
              <div className="truncate text-sm text-muted-foreground mt-0.5">
                {headline}
              </div>

              <div className="mt-3">
                {skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border bg-gray-50 px-2 py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No skills</div>
                )}
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${fitTone(
              fit
            )}`}
          >
            Fit: {fit ?? "—"}%
          </span>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              onChat?.(id);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}

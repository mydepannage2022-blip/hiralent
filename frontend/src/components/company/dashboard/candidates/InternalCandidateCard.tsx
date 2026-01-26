"use client";

import React from "react";
import { ExternalLink, UserPlus } from "lucide-react";

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
};

export default function InternalCandidateCard({ item, onInvite }: Props) {
  // 🛡️ SAFE GUARD (no more crashes)
  if (!item) return null;

  const fullName = item.full_name ?? "—";
  const headline = item.headline ?? "—";
  const skills = item.skills ?? [];
  const applied = item.applied_count ?? 0;
  const fit =
    typeof item.fit_score === "number"
      ? Math.round(item.fit_score)
      : null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">{fullName}</div>
          <div className="text-sm text-muted-foreground truncate">{headline}</div>

          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
            {item.linkedin_url ? (
              <a
                href={item.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Click to view profile
              </a>
            ) : (
              <span>Click to view profile</span>
            )}
          </div>
        </div>

        <div className="rounded-full border px-3 py-1 text-xs shrink-0">
          Fit: {fit ?? "—"}%
        </div>
      </div>

      <div className="mt-3">
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 8).map((s) => (
              <span
                key={s}
                className="rounded-full border bg-gray-50 px-2 py-1 text-xs"
              >
                {s}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No skills</div>
        )}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Applied: {applied}
      </div>

      {/* ✅ Only Invite */}
      <div className="mt-4 flex justify-end">
        <button
          className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
          onClick={() => onInvite?.(item.candidate_id)}
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </button>
      </div>
    </div>
  );
}

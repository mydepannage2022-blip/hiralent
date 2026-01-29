"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, UserPlus, Ban, ExternalLink } from "lucide-react";

export type InternalCandidateListItemDTO = {
  candidate_id: string;
  full_name?: string | null;
  headline?: string | null;
  location?: string | null;
  city?: string | null;
  skills?: string[];
  profile_picture_url?: string | null;
  fit_score?: number | null;

  // optional (if you add later)
  status?: string | null; // e.g. ASSESSMENT_REQUIRED
  applied_at?: string | null; // ISO
  linkedin_url?: string | null;
};

type Props = {
  item: InternalCandidateListItemDTO;
  onInvite?: (id: string) => void;
  onChat?: (id: string) => void;
  onReject?: (id: string) => void;
};

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function statusLabel(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.replaceAll("_", " ");
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

export default function InternalCandidateCard({
  item,
  onInvite,
  onChat,
  onReject,
}: Props) {
  const router = useRouter();

  const id = String(item.candidate_id);
  const fullName = item.full_name ?? "Candidate";
  const headline = item.headline ?? "—";
  const fit =
    typeof item.fit_score === "number"
      ? Math.max(0, Math.min(100, Math.round(item.fit_score)))
      : null;

  const statusText = statusLabel(item.status);
  const appliedLabel = formatDate(item.applied_at);

  const profileUrl = item.linkedin_url ?? null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 p-4">
        <button
          className="flex flex-1 items-start gap-4 text-left"
          onClick={() =>
            router.push(`/company/dashboard/candidates/${id}`)
          }
        >
          {/* Avatar */}
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

          {/* Main */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-base font-semibold">{fullName}</div>

              {statusText ? (
                <span className="rounded-full border bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  {statusText}
                </span>
              ) : null}
            </div>

            <div className="mt-1 truncate text-sm text-muted-foreground">
              {headline}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {profileUrl ? (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Click to view profile
                </a>
              ) : (
                <span>Click to view profile</span>
              )}

              {appliedLabel ? <span>· Applied {appliedLabel}</span> : null}
            </div>

            {/* Skills */}
            <div className="mt-3">
              {Array.isArray(item.skills) && item.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.skills.slice(0, 10).map((s) => (
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
          </div>
        </button>

        {/* Fit pill */}
        <div className="shrink-0 rounded-full border px-3 py-1 text-xs">
          Fit: {fit ?? "—"}%
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t p-3">
        <button
          className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
          onClick={() => onInvite?.(id)}
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
          onClick={() => onChat?.(id)}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
          onClick={() => onReject?.(id)}
        >
          <Ban className="h-4 w-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Github,
  Linkedin,
  UserPlus,
} from "lucide-react";
import CandidateSkills from "./CandidateSkills";

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function statusLabel(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.replaceAll("_", " ").toLowerCase();
}

function pickSourceIcon(source?: string | null) {
  const s = String(source ?? "").toLowerCase();

  if (s.includes("github")) return Github;
  if (s.includes("linkedin")) return Linkedin;

  // if later you add more sources, keep fallback:
  return Globe;
}

export default function ExternalCandidateCard({
  item,
  onInvite,
}: {
  item: any;
  onInvite?: (sourceId: string) => void;
}) {
  const router = useRouter();

  const sourceId = String(item?.source_id ?? "");
  const fullName = item?.full_name ?? "Unnamed";
  const headline = item?.headline ?? "—";
  const city = item?.city ?? "";
  const location = item?.location ?? "—";
  const source = item?.source ?? "source";
  const status = statusLabel(item?.status);

  const SourceIcon = pickSourceIcon(source);

  return (
    <div className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4 p-4">
        {/* Left clickable area -> details page */}
        <button
          type="button"
          className="flex flex-1 items-start gap-4 text-left min-w-0"
          onClick={() =>
            router.push(`/company/dashboard/candidates/external/${sourceId}`)
          }
        >
          {/* Avatar (initials only) */}
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border bg-gray-50 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-700">
              {initials(fullName)}
            </span>
          </div>

          {/* Content */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-base font-semibold">{fullName}</div>

              <span className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                <SourceIcon className="h-3.5 w-3.5" />
                {String(source).toLowerCase()}
              </span>

              {status ? (
                <span className="rounded-full border bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  {status}
                </span>
              ) : null}
            </div>

            <div className="mt-1 truncate text-sm text-muted-foreground">
              {headline}
            </div>

            <div className="mt-1 truncate text-xs text-gray-500">
              {city ? `${city}, ` : ""}
              {location}
            </div>

            <div className="mt-3">
              <CandidateSkills skills={item?.skills ?? []} />
            </div>
          </div>
        </button>

        {/* Right actions (NO footer / NO separator) */}
        <div className="shrink-0">
          <button
            type="button"
            disabled={!onInvite}
            title={
              onInvite
                ? "Invite this candidate"
                : "Assessment invites for sourced candidates are coming soon"
            }
            className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              if (onInvite) onInvite(sourceId);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}

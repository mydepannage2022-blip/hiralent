"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, MapPin, Briefcase } from "lucide-react";
import type { CandidateApplicationsListItemDTO } from "../../../../types/candidate.applications.types";

function statusLabel(status?: string | null) {
  const s = (status || "").toUpperCase();

  if (s.includes("ASSESSMENT")) return "Skills assessment required";
  if (s.includes("REVIEW") || s.includes("PENDING")) return "Under review";
  if (s.includes("INTERVIEW")) return "Interview stage";
  if (s.includes("OFFER")) return "Offer received";
  if (s.includes("REJECT")) return "Not selected";
  if (s.includes("HIRED") || s.includes("ACCEPT") || s.includes("APPROV"))
    return "Approved";
  if (s.includes("APPLIED")) return "Application submitted";

  return status ? status.replaceAll("_", " ") : "Application update";
}

function statusPill(status?: string | null) {
  const s = (status || "").toUpperCase();

  if (s.includes("HIRED") || s.includes("APPROV") || s.includes("ACCEPT")) {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (s.includes("REJECT")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (s.includes("ASSESSMENT")) {
    return "bg-yellow-50 text-yellow-800 border-yellow-200";
  }
  if (s.includes("REVIEW") || s.includes("PENDING") || s.includes("INTERVIEW") || s.includes("OFFER")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function formatDt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function nextStepHint(status?: string | null) {
  const s = (status || "").toUpperCase();
  if (s.includes("ASSESSMENT")) return "Next step: complete the skills assessment.";
  if (s.includes("REVIEW") || s.includes("PENDING")) return "Next step: wait for the employer review.";
  if (s.includes("INTERVIEW")) return "Next step: interview scheduling / preparation.";
  if (s.includes("OFFER")) return "Next step: review your offer details.";
  if (s.includes("REJECT")) return "This application is closed.";
  return "We’ll notify you if anything changes.";
}

export default function ApplicationCard({ item }: { item: CandidateApplicationsListItemDTO }) {
  const router = useRouter();

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (item.job?.location) parts.push(item.job.location);
    if (item.job?.experience_level) parts.push(item.job.experience_level);
    return parts.join(" • ");
  }, [item.job?.location, item.job?.experience_level]);

  return (
    <div
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
      onClick={() => router.push(`/candidate/dashboard/applications/${item.application_id}`)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.job?.title ?? "Job"}</h3>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {item.job?.location ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {item.job?.experience_level ?? "—"}
            </span>
          </div>

          {subtitle ? <p className="mt-1 text-xs text-gray-500 truncate">{subtitle}</p> : null}
        </div>

        <span
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusPill(item.status)}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>

      {/* Helpful hint */}
      <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
        <p className="text-sm text-gray-700">{nextStepHint(item.status)}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          Applied: {formatDt(item.applied_at)}
        </p>

        <div className="text-sm font-medium text-blue-600 group-hover:text-blue-700 inline-flex items-center gap-1">
          View timeline <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

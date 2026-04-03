"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ArrowRight,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import type { CandidateApplicationsListItemDTO } from "../../../../types/candidate.applications.types";

type StatusConfig = {
  label: string;
  hint: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: React.ReactNode;
};

function getStatusConfig(status?: string | null): StatusConfig {
  const s = (status || "").toUpperCase();

  if (s.includes("ASSESSMENT"))
    return {
      label: "Assessment suggested",
      hint: "Based on your score, you may be invited to a skills assessment. This is algorithmic — not a confirmation.",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-400",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };

  if (s.includes("INTERVIEW"))
    return {
      label: "Interview suggested",
      hint: "Your profile scored well. You may be invited to an interview — no recruiter has confirmed this yet.",
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-400",
      icon: <Sparkles className="w-3.5 h-3.5" />,
    };

  if (s.includes("HIRED") || s.includes("APPROV") || s.includes("ACCEPT"))
    return {
      label: "Approved",
      hint: "Your application has been approved.",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };

  if (s.includes("REJECT"))
    return {
      label: "Not progressing",
      hint: "Your profile didn't meet the criteria for this role. No action needed.",
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      dot: "bg-red-400",
      icon: <XCircle className="w-3.5 h-3.5" />,
    };

  if (s.includes("OFFER"))
    return {
      label: "Offer received",
      hint: "You have received an offer. Check your timeline for details.",
      bg: "bg-blue-50",
      text: "text-[#1B73E8]",
      border: "border-blue-200",
      dot: "bg-[#1B73E8]",
      icon: <FileText className="w-3.5 h-3.5" />,
    };

  if (s.includes("REVIEW") || s.includes("PENDING"))
    return {
      label: "Under review",
      hint: "Your application is being evaluated by our system. Most applications don't move past this stage.",
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
      dot: "bg-sky-400",
      icon: <Clock className="w-3.5 h-3.5" />,
    };

  return {
    label: "Submitted",
    hint: "Your application is in. We'll notify you if anything changes.",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
    dot: "bg-gray-300",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  };
}

function formatDt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ApplicationCard({ item }: { item: CandidateApplicationsListItemDTO }) {
  const router = useRouter();
  const cfg = getStatusConfig(item.status);

  const meta = useMemo(() => {
    const parts: string[] = [];
    if (item.job?.location) parts.push(item.job.location);
    if (item.job?.experience_level) parts.push(item.job.experience_level);
    return parts;
  }, [item.job?.location, item.job?.experience_level]);

  return (
    <div
      onClick={() => router.push(`/candidate/dashboard/applications/${item.application_id}`)}
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Colored top accent bar */}
      <div className={`h-1 w-full ${cfg.dot}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-[15px] leading-snug truncate group-hover:text-[#1B73E8] transition-colors">
              {item.job?.title ?? "Job position"}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {item.job?.location && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  {item.job.location}
                </span>
              )}
              {item.job?.experience_level && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Briefcase className="w-3 h-3 text-gray-400" />
                  {item.job.experience_level}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        {/* Hint banner */}
        <div className={`rounded-xl px-3.5 py-2.5 border ${cfg.bg} ${cfg.border} flex items-start gap-2.5 mb-4`}>
          <span className={`${cfg.text} mt-0.5 shrink-0`}>{cfg.icon}</span>
          <p className={`text-xs leading-relaxed ${cfg.text}`}>{cfg.hint}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-gray-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            Applied {formatDt(item.applied_at)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B73E8] group-hover:gap-2 transition-all">
            View timeline
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
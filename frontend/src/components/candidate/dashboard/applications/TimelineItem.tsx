"use client";

import React, { useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import type { ApplicationTimelineItemDTO } from "../../../../types/candidate.applications.types";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "interview";

function normalizeSource(source?: string | null) {
  return (source || "").toLowerCase();
}

function isApplyEvent(item: ApplicationTimelineItemDTO) {
  return normalizeSource(item.source).includes("apply");
}

function eventTone(item: ApplicationTimelineItemDTO): Tone {
  if (isApplyEvent(item)) return "neutral";

  const t = (item.trigger || "").toUpperCase();

  if (t.includes("REJECT")) return "danger";
  if (t.includes("INTERVIEW")) return "interview";
  if (t.includes("ASSESSMENT")) return "warning";
  if (t.includes("APPROV") || t.includes("ELIGIBLE") || t.includes("MATCH")) return "success";
  if (t.includes("REVIEW") || t.includes("PENDING")) return "info";

  return "neutral";
}

type ToneConfig = {
  dot: string;
  line: string;
  icon: React.ReactNode;
  label: string;
  labelColor: string;
  cardBorder: string;
  cardAccent: string;
  softBg: string;
};

const TONES: Record<Tone, ToneConfig> = {
  neutral: {
    dot: "bg-gray-300 border-gray-200",
    line: "bg-gray-200",
    icon: <Send className="h-3.5 w-3.5" />,
    label: "Submitted",
    labelColor: "text-gray-500",
    cardBorder: "border-gray-200",
    cardAccent: "bg-gray-400",
    softBg: "bg-white",
  },
  info: {
    dot: "bg-blue-500 border-blue-200",
    line: "bg-blue-100",
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Under review",
    labelColor: "text-blue-600",
    cardBorder: "border-blue-200",
    cardAccent: "bg-blue-500",
    softBg: "bg-blue-50/30",
  },
  warning: {
    dot: "bg-amber-400 border-amber-200",
    line: "bg-amber-100",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Assessment may be requested",
    labelColor: "text-amber-700",
    cardBorder: "border-amber-200",
    cardAccent: "bg-amber-400",
    softBg: "bg-amber-50/30",
  },
  interview: {
    dot: "bg-violet-500 border-violet-200",
    line: "bg-violet-100",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    label: "Interview may be considered",
    labelColor: "text-violet-700",
    cardBorder: "border-violet-200",
    cardAccent: "bg-violet-500",
    softBg: "bg-violet-50/30",
  },
  success: {
    dot: "bg-emerald-500 border-emerald-200",
    line: "bg-emerald-100",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Potential match",
    labelColor: "text-emerald-700",
    cardBorder: "border-emerald-200",
    cardAccent: "bg-emerald-500",
    softBg: "bg-emerald-50/30",
  },
  danger: {
    dot: "bg-red-400 border-red-200",
    line: "bg-red-100",
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Not progressing",
    labelColor: "text-red-700",
    cardBorder: "border-red-200",
    cardAccent: "bg-red-400",
    softBg: "bg-red-50/30",
  },
};

function getContent(item: ApplicationTimelineItemDTO): {
  title: string;
  description: string;
  note?: string;
} {
  if (isApplyEvent(item)) {
    return {
      title: "Application submitted",
      description:
        "Your application has been received and added to the review flow.",
    };
  }

  const t = (item.trigger || "").toUpperCase();

  if (t.includes("REJECT")) {
    return {
      title: "Application closed",
      description:
        "Your application is not moving forward at the moment.",
    };
  }

  if (t.includes("INTERVIEW")) {
    return {
      title: "Interview may be considered",
      description:
        "Your profile currently looks relevant, but no interview is confirmed at this stage.",
    };
  }

  if (t.includes("ASSESSMENT")) {
    return {
      title: "Assessment may be requested",
      description:
        "Your profile match suggests that an assessment could be requested, but this is not confirmed yet.",
      note: "Improving missing skills may strengthen your application.",
    };
  }

  if (t.includes("APPROV") || t.includes("ELIGIBLE") || t.includes("MATCH")) {
    return {
      title: "Potential profile match",
      description:
        "Your profile appears to align with part of the role requirements.",
    };
  }

  if (t.includes("REVIEW") || t.includes("PENDING")) {
    return {
      title: "Under review",
      description:
        "Your application is currently being reviewed. No next step is confirmed yet.",
    };
  }

  return {
    title: "Status updated",
    description:
      "A new application update is available.",
  };
}

function formatDt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TimelineItem({
  item,
  isFirst,
  isLast,
}: {
  item: ApplicationTimelineItemDTO;
  isFirst: boolean;
  isLast: boolean;
}) {
  const tone = useMemo(() => eventTone(item), [item.trigger, item.source]);
  const cfg = TONES[tone];
  const content = useMemo(() => getContent(item), [item.trigger, item.source]);

  const tips = item.missing_skills ?? [];

  return (
    <div className="relative flex gap-4">
      <div className="flex w-5 shrink-0 flex-col items-center">
        <div className={`z-10 mt-5 h-3.5 w-3.5 rounded-full border-2 ${cfg.dot}`} />
        {!isLast && <div className={`mt-1 w-px flex-1 ${cfg.line}`} style={{ minHeight: 28 }} />}
      </div>

      <div
        className={`mb-4 flex-1 overflow-hidden rounded-xl border ${cfg.cardBorder} ${cfg.softBg} shadow-sm`}
      >
        <div className={`h-1 w-full ${cfg.cardAccent}`} />

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cfg.labelColor}`}
            >
              {cfg.icon}
              {isFirst ? `${cfg.label} · Latest` : cfg.label}
            </span>

            <span className="text-xs text-gray-400">{formatDt(item.created_at)}</span>
          </div>

          <p className="text-base font-semibold text-gray-900">{content.title}</p>

          <p className="mt-2 text-sm leading-6 text-gray-600">{content.description}</p>

          {content.note && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-700">{content.note}</p>
            </div>
          )}

          {tips.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <TrendingUp className="h-3.5 w-3.5 text-[#1B73E8]" />
                Skills that may improve your fit
              </p>

              <div className="flex flex-wrap gap-1.5">
                {tips.slice(0, 12).map((sk) => (
                  <span
                    key={sk}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
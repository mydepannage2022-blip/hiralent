"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  Circle,
  ChevronDown,
} from "lucide-react";
import type { ApplicationTimelineItemDTO } from "../../../../types/candidate.applications.types";

type Tone = "success" | "warning" | "danger" | "info";

function normalizeSource(source?: string | null) {
  return (source || "").toLowerCase();
}

function isApplyEvent(item: ApplicationTimelineItemDTO) {
  // backend: source can be "apply" or contains it
  const s = normalizeSource(item.source);
  return s.includes("apply");
}

function eventTone(item: ApplicationTimelineItemDTO): Tone {
  if (isApplyEvent(item)) return "info";

  const t = (item.trigger || "").toUpperCase();
  if (t.includes("REJECT")) return "danger";
  if (t.includes("ASSESSMENT")) return "warning";
  if (t.includes("APPROV") || t.includes("ELIGIBLE") || t.includes("MATCH"))
    return "success";
  return "info";
}

function pillForTone(tone: Tone) {
  switch (tone) {
    case "success":
      return "bg-green-50 text-green-700 border-green-200";
    case "warning":
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    case "danger":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function dotForTone(tone: Tone) {
  switch (tone) {
    case "success":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "danger":
      return "bg-red-500";
    default:
      return "bg-blue-500";
  }
}

function iconForTone(tone: Tone) {
  switch (tone) {
    case "success":
      return CheckCircle2;
    case "warning":
      return Info;
    case "danger":
      return AlertTriangle;
    default:
      return Circle;
  }
}

function humanTitle(item: ApplicationTimelineItemDTO) {
  if (isApplyEvent(item)) return "Application submitted";

  const t = (item.trigger || "").toUpperCase();
  if (t.includes("ASSESSMENT")) return "Skills assessment required";
  if (t.includes("REVIEW") || t.includes("PENDING"))
    return "Application under review";
  if (t.includes("REJECT")) return "Application closed";
  if (t.includes("APPROV") || t.includes("ELIGIBLE"))
    return "Application progressing";

  return "Application updated";
}

function humanDescription(item: ApplicationTimelineItemDTO) {
  if (isApplyEvent(item)) return "Your application was successfully submitted.";

  const t = (item.trigger || "").toUpperCase();
  if (t.includes("ASSESSMENT"))
    return "To move forward, please complete the required skills assessment (if available).";
  if (t.includes("REVIEW") || t.includes("PENDING"))
    return "Your application is being reviewed. We’ll notify you when there’s an update.";
  if (t.includes("REJECT"))
    return "This application has been closed. You can continue applying to other jobs.";
  if (t.includes("APPROV") || t.includes("ELIGIBLE"))
    return "Good news — your application is progressing.";

  return "We’ll keep you posted as your application progresses.";
}

function formatDt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
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
  const Icon = useMemo(() => iconForTone(tone), [tone]);

  const tips = item.missing_skills ?? [];
  const hasTips = tips.length > 0;
  const [openTips, setOpenTips] = useState(false);

  return (
    <div className="relative pl-10">
      {!isLast && (
        <div className="absolute left-[18px] top-6 bottom-[-18px] w-px bg-gray-200" />
      )}

      <div
        className={`absolute left-[12px] top-5 w-3 h-3 rounded-full ${dotForTone(
          tone
        )}`}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${pillForTone(
                  tone
                )}`}
              >
                {isFirst ? "Latest update" : "Update"}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Icon className="w-4 h-4 text-gray-700" />
              <span className="truncate">{humanTitle(item)}</span>
            </div>

            <p className="mt-1 text-sm text-gray-700">
              {humanDescription(item)}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              {formatDt(item.created_at)}
            </p>
          </div>
        </div>

        {hasTips && (
          <div className="mt-4">
            <button
              onClick={() => setOpenTips((v) => !v)}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <span className="font-medium">Improve your profile</span>
              <ChevronDown
                className={`w-4 h-4 transition ${openTips ? "rotate-180" : ""}`}
              />
            </button>

            {openTips && (
              <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Suggested skills to add
                </p>
                <div className="flex flex-wrap gap-2">
                  {tips.slice(0, 14).map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded-full text-xs bg-white border border-gray-200 text-gray-700"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Adding relevant skills can help improve your match over time.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

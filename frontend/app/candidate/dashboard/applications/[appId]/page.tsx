"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, BadgeCheck, TrendingUp } from "lucide-react";

import { useApplicationTimeline } from "@/src/lib/candidate/applications.queries";
import Timeline from "@/src/components/candidate/dashboard/applications/Timeline";

function statusLabel(status?: string | null) {
  const s = (status || "").toUpperCase();
  if (s.includes("ASSESSMENT")) return "Skills assessment required";
  if (s.includes("REVIEW") || s.includes("PENDING")) return "Under review";
  if (s.includes("INTERVIEW")) return "Interview stage";
  if (s.includes("OFFER")) return "Offer received";
  if (s.includes("REJECT")) return "Not selected";
  if (s.includes("HIRED") || s.includes("ACCEPT") || s.includes("APPROV")) return "Approved";
  if (s.includes("APPLIED")) return "Application submitted";
  return status ? status.replaceAll("_", " ").toLowerCase() : "Application update";
}

function statusPill(status?: string | null) {
  const s = (status || "").toUpperCase();
  if (s.includes("HIRED") || s.includes("APPROV") || s.includes("ACCEPT"))
    return "bg-green-50 text-green-700 border-green-200";
  if (s.includes("REJECT")) return "bg-red-50 text-red-700 border-red-200";
  if (s.includes("ASSESSMENT")) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (s.includes("REVIEW") || s.includes("PENDING") || s.includes("INTERVIEW") || s.includes("OFFER"))
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function shortRef(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

function matchPill() {
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function formatMatch(v?: number | null) {
  if (v === null || v === undefined) return null;
  return `${Math.round(v)}%`;
}

/* -----------------------------
   ✅ Deduplicate timeline items
------------------------------ */

function normalizeText(v: any): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toSecondTimestamp(v: any): string {
  if (!v) return "";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "";
  return String(Math.floor(t / 1000));
}

function makeTimelineKey(it: any): string {
  const status = normalizeText(it?.status ?? it?.event_status ?? it?.type ?? it?.kind);
  const title = normalizeText(it?.title ?? it?.label ?? it?.name);
  const msg = normalizeText(it?.message ?? it?.description ?? it?.details ?? it?.note);
  const at = toSecondTimestamp(it?.created_at ?? it?.createdAt ?? it?.timestamp ?? it?.date);
  return [status, title, msg, at].join("|");
}

function dedupeTimeline(items: any[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const it of items ?? []) {
    const key = makeTimelineKey(it);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export default function ApplicationDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const appId: string | null = useMemo(() => {
    const raw = (params as any)?.appId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return null;
  }, [params]);

  const q = useApplicationTimeline(appId ?? "", { enabled: !!appId });

  // ✅ IMPORTANT: this hook MUST be before any conditional returns
  const timelineItems = useMemo(() => {
    const raw = q.data?.timeline ?? [];
    return dedupeTimeline(raw);
  }, [q.data?.timeline]);

  const app = q.data?.application;
  const latestMatch = timelineItems?.[0]?.relevance_score ?? null;

  if (!appId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-red-700">Missing application id in URL.</p>
        </div>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h1 className="mt-3 text-xl font-bold text-gray-900">Application timeline</h1>
              <p className="text-sm text-gray-600">
                Follow the exact steps your application went through.
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <span className="font-medium text-gray-900">{shortRef(appId)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {app?.status ? (
              <span
                className={`px-2.5 py-1 rounded-full border text-sm inline-flex items-center gap-2 ${statusPill(
                  app.status
                )}`}
              >
                <BadgeCheck className="w-4 h-4" />
                {statusLabel(app.status)}
              </span>
            ) : null}

            {formatMatch(latestMatch) ? (
              <span
                className={`px-2.5 py-1 rounded-full border text-sm inline-flex items-center gap-2 ${matchPill()}`}
              >
                <TrendingUp className="w-4 h-4" />
                {formatMatch(latestMatch)} Match
              </span>
            ) : null}
          </div>

          {q.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Failed to load timeline: {String((q.error as any)?.message || q.error)}
            </div>
          )}
        </div>

        <Timeline items={timelineItems} isLoading={q.isLoading} />
      </div>
    </div>
  );
}

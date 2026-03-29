"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, Info } from "lucide-react";

import { useApplicationTimeline } from "@/src/lib/candidate/applications.queries";
import Timeline from "@/src/components/candidate/dashboard/applications/Timeline";

function statusLabel(status?: string | null) {
  const s = (status || "").toUpperCase();

  if (s.includes("ASSESSMENT")) return "Assessment may be requested";
  if (s.includes("REVIEW") || s.includes("PENDING")) return "Under review";
  if (s.includes("INTERVIEW")) return "Interview may be considered";
  if (s.includes("OFFER")) return "Offer stage";
  if (s.includes("REJECT")) return "Not selected";
  if (s.includes("HIRED") || s.includes("ACCEPT") || s.includes("APPROV")) return "Approved";
  if (s.includes("APPLIED")) return "Application submitted";

  return status ? status.replaceAll("_", " ").toLowerCase() : "Application update";
}

function statusPill(status?: string | null) {
  const s = (status || "").toUpperCase();

  if (s.includes("HIRED") || s.includes("APPROV") || s.includes("ACCEPT")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("REJECT")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (s.includes("ASSESSMENT")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (s.includes("INTERVIEW")) {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }
  if (s.includes("REVIEW") || s.includes("PENDING") || s.includes("OFFER")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
}

function formatMatch(v?: number | null) {
  if (v === null || v === undefined) return null;
  return `${String(v)}%`;
}

function normalizeText(v: any): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
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

  const timelineItems = useMemo(() => {
    const raw = q.data?.timeline ?? [];
    return dedupeTimeline(raw);
  }, [q.data?.timeline]);

  const app = q.data?.application;

  const jobTitle = useMemo(() => {
    for (const it of timelineItems) {
      const t =
        (it as any)?.job_title ??
        (it as any)?.jobTitle ??
        (it as any)?.job?.title ??
        null;

      if (t && typeof t === "string") return t;
    }
    return null;
  }, [timelineItems]);

  const latestMatch = timelineItems?.[0]?.relevance_score ?? null;

  if (!appId) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700">Missing application id in URL.</p>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B73E8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Application
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                {jobTitle ?? "Job application"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Track your application updates here. Some steps are shown based on automated
                matching and should not be treated as confirmed recruiter actions.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {app?.status && (
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusPill(
                      app.status
                    )}`}
                  >
                    {statusLabel(app.status)}
                  </span>
                )}

                {formatMatch(latestMatch) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {formatMatch(latestMatch)} match
                  </span>
                )}
              </div>
            </div>

            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 md:max-w-xs">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-5 text-amber-700">
                  Assessment or interview updates shown here are indicative only and are not
                  guarantees.
                </p>
              </div>
            </div>
          </div>

          {q.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Failed to load timeline.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
            <p className="mt-1 text-sm text-gray-500">
              Recent updates related to this application.
            </p>
          </div>

          <Timeline items={timelineItems} isLoading={q.isLoading} />
        </div>
      </div>
    </div>
  );
}
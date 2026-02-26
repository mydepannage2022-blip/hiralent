"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, Clock, ShieldAlert, X,Wand2, TrendingUp,TrendingDown } from "lucide-react";
import SkillRadarCard, { SkillRadarPoint } from "./SkillRadarCard";
import {
  useAssessmentCandidatesAnalytics,
  useSessionAnalytics,
} from "@/src/lib/company/companyInsights.queries";

type CandidateRow = {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  totalScore?: number | null;
  level?: string | null;
  passed?: boolean | null;
  submittedAt?: string | null;
  timeTakenSec?: number | null;

  profile_picture_url?: string | null;
  profilePictureUrl?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

type Props = {
  token: string;
  assessment: { assessment_id: string; title: string };
  onClose: () => void;
};

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function clampPct(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtDuration(sec?: number | null) {
  if (!sec || !Number.isFinite(sec)) return "—";
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${String(ss).padStart(2, "0")}s`;
}

function statusPill(
  passed?: boolean | null,
  score?: number | null,
  passingScore?: number | null
) {
  if (passed === true)
    return {
      label: "Passed",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  if (passed === false)
    return {
      label: "Not passed",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    };

  const sc = clampPct(score);
  const ps = typeof passingScore === "number" ? passingScore : null;
  if (sc != null && ps != null) {
    if (sc >= ps)
      return {
        label: "Passed",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    return {
      label: "Not passed",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  return {
    label: "Submitted",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

function cleanRecruiterSummary(txt?: string | null) {
  if (!txt) return "—";
  return txt
    .replace(
      /with a score of\s+\d+(\.\d+)?\s+out of\s+a\s+possible\s+\d+(\.\d+)?/gi,
      "with a score recorded"
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pickAvatarUrl(c: CandidateRow | null | undefined): string | null {
  if (!c) return null;
  const raw = c.profile_picture_url ?? c.profilePictureUrl ?? c.avatarUrl ?? null;
  return raw && String(raw).trim() ? String(raw) : null;
}

function normalizeRadar(session: any): SkillRadarPoint[] {
  const categories = session?.radar?.categories;
  const tag = session?.radar?.tag;
  const src =
    Array.isArray(categories) && categories.length
      ? categories
      : Array.isArray(tag)
      ? tag
      : [];
  return (src || [])
    .map((x: any) => ({
      label: String(x?.label ?? x?.skill ?? "").trim(),
      score: clampPct(x?.score) ?? 0,
    }))
    .filter((p: SkillRadarPoint) => !!p.label);
}

function normalizeList(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (!x) return null;
      if (typeof x === "string") return { title: "Note", note: x };
      const skill = x.skill ? String(x.skill) : null;
      const note = x.note ? String(x.note) : null;
      return { title: skill ?? "Item", note: note ?? "" };
    })
    .filter(Boolean) as { title: string; note: string }[];
}

function normalizeRisk(risk: any): { level?: string; anomalies: string[] } {
  const level = risk?.level ? String(risk.level) : undefined;
  const anomalies = Array.isArray(risk?.anomalies) ? risk.anomalies.map(String) : [];
  return { level, anomalies };
}

export default function AssessmentAnalyticsModal({ token, assessment, onClose }: Props) {
  const assessmentId = String(assessment.assessment_id);

  const candidatesQ = useAssessmentCandidatesAnalytics(assessmentId);
  const candidates = useMemo(() => {
    const raw = (candidatesQ.data as any)?.candidates ?? [];
    return (raw as CandidateRow[]) || [];
  }, [candidatesQ.data]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSessionId && candidates.length > 0) {
      setSelectedSessionId(String((candidates[0] as any).sessionId));
    }
  }, [candidates, selectedSessionId]);

  const selected = useMemo(() => {
    if (!selectedSessionId) return null;
    return (
      candidates.find((c) => String((c as any).sessionId) === String(selectedSessionId)) ??
      null
    );
  }, [candidates, selectedSessionId]);

  const sessionQ = useSessionAnalytics(selectedSessionId || "");
  const session = sessionQ.data as any;

  const radar = useMemo(() => normalizeRadar(session), [session]);

  const scorePct = clampPct(session?.final?.totalScore ?? selected?.totalScore) ?? 0;
  const passingScore =
    typeof session?.final?.passingScore === "number" ? session.final.passingScore : null;
  const passed =
    typeof session?.final?.passed === "boolean" ? session.final.passed : (selected?.passed ?? null);

  const status = statusPill(passed, scorePct, passingScore);

  const summary = cleanRecruiterSummary(session?.summary ?? (session?.insight?.summary ?? null));
  const strengths = normalizeList(session?.strengths);
  const weaknesses = normalizeList(session?.weaknesses);
  const recommendations = normalizeList(session?.recommendations);
  const risk = normalizeRisk(session?.risk);

  const avatarUrl = pickAvatarUrl(selected);
  const candidateName = selected?.candidateName ?? session?.candidate?.name ?? "Candidate";
  const candidateEmail = selected?.email ?? session?.candidate?.email ?? null;

  const submittedAt = session?.final?.submittedAt ?? selected?.submittedAt ?? null;
  const timeTaken = session?.final?.timeTakenSec ?? selected?.timeTakenSec ?? null;

  const isLoading = candidatesQ.isLoading || (selectedSessionId ? sessionQ.isLoading : false);
  const isError = candidatesQ.isError || sessionQ.isError;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="relative w-full max-w-7xl h-[88vh] overflow-hidden rounded-3xl bg-white shadow-[0_25px_80px_rgba(15,23,42,0.20)] border border-slate-200 flex flex-col"
        initial={{ scale: 0.98, y: 14, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.98, y: 14, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* HEADER (fixed) — cleaner, less “sparkles everywhere” */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-slate-900">
                    Assessment Analytics
                  </h2>
                  <p className="mt-0.5 text-[12px] text-slate-600 truncate">
                    {assessment.title}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY — IMPORTANT: no global scroll here. Two independent scroll panes */}
        <div className="flex-1 min-h-0 bg-slate-50">
          {isLoading ? (
            <div className="h-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse h-full min-h-[260px]" />
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 animate-pulse h-full min-h-[260px]" />
            </div>
          ) : isError ? (
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Failed to load assessment analytics.
              </div>
            </div>
          ) : (
            <div className="h-full grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 p-6 min-h-0">
              {/* LEFT: Candidates (scroll only here) */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-0">
                <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Candidates</div>
                      <div className="text-[11px] text-slate-500">Completed submissions</div>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                      {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
                    </span>
                  </div>
                </div>

                {candidates.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">No completed candidates yet.</div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                    {candidates.map((c) => {
                      const isActive =
                        String((c as any).sessionId) === String(selectedSessionId);
                      const sc = clampPct((c as any).totalScore) ?? 0;
                      const pill = statusPill((c as any).passed, sc, passingScore);
                      const cAvatar = pickAvatarUrl(c);

                      return (
                        <button
                          key={String((c as any).sessionId)}
                          onClick={() => setSelectedSessionId(String((c as any).sessionId))}
                          className={[
                            "w-full rounded-2xl border px-3 py-3 text-left transition-all",
                            "hover:border-slate-300 hover:bg-slate-50/50",
                            isActive
                              ? "border-blue-300 bg-blue-50/50"
                              : "border-slate-200 bg-white",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                              {cAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cAvatar} alt="avatar" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-semibold text-slate-700">
                                  {initials((c as any).candidateName)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-sm font-semibold text-slate-900">
                                  {(c as any).candidateName ?? "Candidate"}
                                </div>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${pill.cls}`}
                                >
                                  {pill.label}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                                  <span className="font-semibold text-slate-900">{sc}%</span>
                                  <span className="text-slate-500">score</span>
                                </span>

                                {(c as any).level ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                                    {(c as any).level}
                                  </span>
                                ) : null}

                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {fmtDuration((c as any).timeTakenSec)}
                                </span>
                              </div>

                              <div className="mt-2 text-[11px] text-slate-500">
                                Submitted: {fmtDateTime((c as any).submittedAt)}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT: Analytics (scroll only here) */}
              <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white flex flex-col">
                {/* Candidate top bar (fixed inside right panel) */}
                <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-slate-700">
                            {initials(candidateName)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-slate-900">
                          {candidateName}
                        </div>
                        <div className="truncate text-[12px] text-slate-500">
                          {candidateEmail ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}
                      >
                        {status.label}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700">
                        <span className="font-semibold">{scorePct}%</span> score
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
                        <Clock className="h-3.5 w-3.5 inline-block mr-1" />
                        {fmtDuration(timeTaken)}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
                        Submitted: {fmtDateTime(submittedAt)}
                      </span>

                      {risk.level ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Risk: {String(risk.level).toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right content scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
                  <div className="p-5 space-y-5">
                    {/* Summary (full width) */}
                    <motion.div
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Summary</div>
                        </div>

                      </div>

                      <div className="mt-3 text-sm text-slate-700 leading-6 whitespace-pre-line">
                        {summary}
                      </div>
                    </motion.div>

                    {/* Skill Radar (FULL WIDTH, bigger) */}
                    <motion.div
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: 0.03 }}
                    >
                      <SkillRadarCard
                        title={`Skill Radar — ${candidateName}`}
                        radar={radar}
                        scaleLabel="Scale: 0–100"
                        emptyLabel="No radar categories available for this session."
                        heightClass="h-[360px]"
                        outerRadius="82%"
                      />
                    </motion.div>

                    {/* Strength / Weakness / Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <InsightListCard
                        title="Strengths"
                        icon={<TrendingUp className="h-4 w-4" />}
                        tone="good"
                        items={strengths}
                        empty="No strengths detected."
                      />
                      <InsightListCard
                        title="Weaknesses"
                        icon={<TrendingDown className="h-4 w-4" />}
                        tone="warn"
                        items={weaknesses}
                        empty="No weaknesses detected."
                      />
                      <InsightListCard
                        title="Recommendations"
                        icon={<Wand2 className="h-4 w-4" />}
                        tone="info"
                        items={recommendations}
                        empty="No recommendations available."
                      />
                    </div>

                    {/* Risk flags */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Risk Flags</div>
                          <div className="text-[11px] text-slate-500">
                            Signals that may require review
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        {!risk.level && (!risk.anomalies || risk.anomalies.length === 0) ? (
                          <div className="text-sm text-slate-600">No risk flags.</div>
                        ) : (
                          <div className="space-y-2">
                            {risk.level ? (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                <AlertTriangle className="h-4 w-4" />
                                Risk level:{" "}
                                <span className="font-semibold">
                                  {String(risk.level).toUpperCase()}
                                </span>
                              </div>
                            ) : null}

                            {Array.isArray(risk.anomalies) && risk.anomalies.length > 0 ? (
                              <ul className="mt-2 space-y-2">
                                {risk.anomalies.map((a, idx) => (
                                  <li
                                    key={`${a}-${idx}`}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                  >
                                    {a}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question breakdown */}
                    {Array.isArray(session?.questionBreakdown) &&
                    session.questionBreakdown.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                          <div className="text-sm font-semibold text-slate-900">
                            Question Breakdown
                          </div>
                          <span className="text-[11px] px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                            {session.questionBreakdown.length}
                          </span>
                        </div>

                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {session.questionBreakdown.slice(0, 12).map((q: any, idx: number) => {
                            const title = String(q?.title ?? `Question ${idx + 1}`);
                            const type = String(q?.type ?? "").toUpperCase();
                            const sc = clampPct(q?.score) ?? null;

                            return (
                              <div
                                key={`${q?.questionId ?? idx}`}
                                className="rounded-2xl border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                                        {type || "QUESTION"}
                                      </span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900 truncate">
                                      {title}
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <div className="text-[11px] text-slate-500">Score</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                      {sc != null ? `${sc}` : "—"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="pb-2" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function InsightListCard({
  title,
  icon,
  tone,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "good" | "warn" | "info";
  items: { title: string; note: string }[];
  empty: string;
}) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "warn"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "bg-blue-50 text-blue-700 border-blue-100";

  return (
    <motion.div
      className="rounded-2xl border border-slate-200 bg-white p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${toneCls}`}>
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-[11px] text-slate-500">Key points</div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">{empty}</div>
        ) : (
          items.slice(0, 6).map((it, idx) => (
            <div
              key={`${it.title}-${idx}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="text-sm font-semibold text-slate-900">{it.title}</div>
              {it.note ? (
                <div className="mt-1 text-[12px] text-slate-600 leading-5">{it.note}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

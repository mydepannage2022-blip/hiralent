"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  FileCheck,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Clock,
} from "lucide-react";

type Stage = {
  name: string;
  count: string;
  avgScore: string;
  icon: any;
  widthPct: number; // 0..100
  trend: string;
  days: string;
};

const ACCENT = "#005DDC";

const pipelineStages: Stage[] = [
  {
    name: "Applied",
    count: "247",
    avgScore: "76",
    icon: Users,
    widthPct: 100,
    trend: "+12%",
    days: "2.8",
  },
  {
    name: "Assessed",
    count: "186",
    avgScore: "82",
    icon: FileCheck,
    widthPct: 85,
    trend: "+18%",
    days: "1.5",
  },
  {
    name: "Shortlisted",
    count: "48",
    avgScore: "91",
    icon: CheckCircle,
    widthPct: 65,
    trend: "+24%",
    days: "0.8",
  },
  {
    name: "Interview",
    count: "24",
    avgScore: "94",
    icon: MessageSquare,
    widthPct: 45,
    trend: "+32%",
    days: "0.5",
  },
];

const benefits = [
  { text: "AI-ranked candidate lists", icon: TrendingUp },
  { text: "Explainable fit scores", icon: BarChart3 },
  { text: "Integrity-first assessments", icon: ShieldCheck },
];

export default function HireWithConfidence() {
  const interviewIndex = useMemo(
    () => pipelineStages.findIndex((s) => s.name === "Interview"),
    []
  );

  const [activeStage, setActiveStage] = useState<number>(interviewIndex);
  const active = pipelineStages[activeStage] ?? pipelineStages[0];

  const showInterviewDemo = activeStage === interviewIndex;

  return (
    <section className="relative w-full bg-white py-12 md:py-16 overflow-hidden">
      {/* very subtle wash */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-[0.06]"
          style={{ background: ACCENT }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F7FBFF] to-transparent" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl">
        {/* Header (compact) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
              <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
              For Employers
            </div>

            <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-[#0b1b3a] leading-tight">
              Hire with Confidence,{" "}
              <span className="relative inline-block" style={{ color: ACCENT }}>
                Not Volume
                <span
                  className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full"
                  style={{ background: `${ACCENT}22` }}
                />
              </span>
            </h2>

            <p className="mt-3 text-sm md:text-base text-[#64748B] max-w-2xl leading-relaxed">
              See how candidates move from application → assessment → shortlist →{" "}
              <span className="font-semibold text-[#0b1b3a]">AI interview with Hira</span>.
            </p>
          </div>

          <div className="lg:col-span-4 flex lg:justify-end">
            <a
              href="/employers"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0b1b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#162748] transition shadow-sm"
            >
              Start Hiring Smarter
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Main grid (compact) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: pipeline */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#E6ECF8] bg-white p-5 md:p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.16)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#0b1b3a]">
                  Candidate Pipeline
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStage(interviewIndex)}
                  className="text-xs font-semibold text-[#64748B] hover:text-[#0b1b3a] inline-flex items-center gap-1"
                >
                  Jump to Interview <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {pipelineStages.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isActive = idx === activeStage;
                  const isInterview = idx === interviewIndex;

                  return (
                    <button
                      key={stage.name}
                      type="button"
                      onClick={() => setActiveStage(idx)}
                      className={[
                        "w-full text-left rounded-2xl border px-4 py-3 transition",
                        isActive
                          ? "border-[#005DDC]/35 bg-[#F7FBFF]"
                          : "border-[#E6ECF8] bg-white hover:bg-[#FBFDFF]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-2xl flex items-center justify-center border"
                          style={{
                            borderColor: isActive ? `${ACCENT}2A` : "#E6ECF8",
                            background: isActive ? `${ACCENT}10` : "#F8FAFC",
                            color: isActive ? ACCENT : "#64748B",
                          }}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="text-sm font-semibold text-[#0b1b3a] truncate">
                                {stage.name}
                              </div>

                              {isInterview && (
                                <span
                                  className="text-[10px] font-extrabold rounded-full px-2 py-0.5 border"
                                  style={{
                                    color: ACCENT,
                                    borderColor: `${ACCENT}2A`,
                                    background: `${ACCENT}10`,
                                  }}
                                >
                                  Hira interview
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-xs text-[#64748B] whitespace-nowrap">
                                {stage.count}
                              </div>
                              <div
                                className="text-xs font-bold whitespace-nowrap"
                                style={{ color: isActive ? ACCENT : "#0b1b3a" }}
                              >
                                {stage.avgScore}%
                              </div>
                            </div>
                          </div>

                          {/* compact progress */}
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#EEF2F7] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: isInterview ? ACCENT : "#0b1b3a" }}
                              initial={false}
                              animate={{ width: `${stage.widthPct}%`, opacity: isActive ? 1 : 0.35 }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                          </div>

                          {/* micro metrics (compact) */}
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-[#64748B]">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {stage.days}d avg
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {stage.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* tiny summary */}
              <div className="mt-5 pt-4 border-t border-[#E6ECF8] grid grid-cols-3 gap-3">
                {[
                  { value: "86%", label: "Avg fit" },
                  { value: "24", label: "Roles" },
                  { value: "4.8x", label: "Faster" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-[#E6ECF8] bg-[#FBFDFF] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#0b1b3a]">{s.value}</div>
                    <div className="text-[11px] font-semibold text-[#64748B]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: demo interview + benefits */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-[#E6ECF8] bg-white p-5 md:p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0b1b3a]">
                    {showInterviewDemo ? "Interview demo" : "Employer benefits"}
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    {showInterviewDemo
                      ? "A quick glimpse of Hira interviewing a candidate."
                      : "Clean signals. Faster decisions."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStage(showInterviewDemo ? 0 : interviewIndex)}
                  className="text-xs font-semibold rounded-full border px-3 py-1.5 transition"
                  style={{
                    borderColor: "#E6ECF8",
                    background: "#FBFDFF",
                    color: "#0b1b3a",
                  }}
                >
                  {showInterviewDemo ? "Back" : "See demo"}
                </button>
              </div>

              {/* Interview demo */}
              <AnimatePresence mode="wait">
                {showInterviewDemo ? (
                  <motion.div
                    key="demo"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.22 }}
                    className="mt-5"
                  >
                    <div className="rounded-2xl border border-[#E6ECF8] bg-[#FBFDFF] p-4">
                      {/* top row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Put your avatar in /public/images/hira_avatar.png */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/images/hira-avatar.png"
                            alt="Hira"
                            className="h-10 w-10 rounded-2xl object-cover border border-[#E6ECF8]"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#0b1b3a] flex items-center gap-2">
                              Hira • AI Interviewer
                              <span
                                className="text-[10px] font-extrabold rounded-full px-2 py-0.5 border"
                                style={{
                                  color: ACCENT,
                                  borderColor: `${ACCENT}2A`,
                                  background: `${ACCENT}10`,
                                }}
                              >
                                Live
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              Role: Senior Frontend • 12 min
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] font-semibold text-[#64748B]">
                          Score: <span className="text-[#0b1b3a] font-extrabold">94%</span>
                        </div>
                      </div>

                      {/* chat bubbles */}
                      <div className="mt-4 space-y-2.5">
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05, duration: 0.22 }}
                          className="max-w-[92%] rounded-2xl border border-[#E6ECF8] bg-white px-3 py-2"
                        >
                          <div className="text-[11px] font-semibold text-[#0b1b3a]">
                            Hira
                          </div>
                          <div className="text-[12px] text-[#475569] leading-relaxed">
                            Walk me through a production bug you fixed. What signal did you trust first?
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, x: 6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12, duration: 0.22 }}
                          className="ml-auto max-w-[92%] rounded-2xl px-3 py-2"
                          style={{
                            background: `${ACCENT}10`,
                            border: `1px solid ${ACCENT}22`,
                          }}
                        >
                          <div className="text-[11px] font-semibold text-[#0b1b3a]">
                            Candidate
                          </div>
                          <div className="text-[12px] text-[#0b1b3a] leading-relaxed">
                            I started from logs + user repro steps, then validated the API latency spike and
                            narrowed it to a cache invalidation issue…
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.18, duration: 0.22 }}
                          className="max-w-[92%] rounded-2xl border border-[#E6ECF8] bg-white px-3 py-2"
                        >
                          <div className="text-[11px] font-semibold text-[#0b1b3a] flex items-center gap-2">
                            Hira
                            <span className="text-[10px] font-semibold text-[#64748B]">
                              Follow-up
                            </span>
                          </div>
                          <div className="text-[12px] text-[#475569] leading-relaxed">
                            Nice. If you had 30 minutes only, what would you ship first to reduce risk?
                          </div>
                        </motion.div>
                      </div>

                      {/* footer chips */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["Communication", "Problem solving", "Ownership"].map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold rounded-full border px-2.5 py-1 bg-white"
                            style={{ borderColor: "#E6ECF8", color: "#0b1b3a" }}
                          >
                            {t}
                          </span>
                        ))}
                        <span
                          className="text-[10px] font-extrabold rounded-full border px-2.5 py-1"
                          style={{
                            borderColor: `${ACCENT}2A`,
                            background: `${ACCENT}10`,
                            color: ACCENT,
                          }}
                        >
                          Strong hire signal
                        </span>
                      </div>
                    </div>

                    <a
                      href="/employers"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                      style={{
                        background: "#0b1b3a",
                      }}
                    >
                      Explore AI Interviews
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </motion.div>
                ) : (
                  <motion.div
                    key="benefits"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.22 }}
                    className="mt-5"
                  >
                    <div className="space-y-3">
                      {benefits.map((b) => {
                        const Icon = b.icon;
                        return (
                          <div
                            key={b.text}
                            className="flex items-start gap-3 rounded-2xl border border-[#E6ECF8] bg-[#FBFDFF] p-3"
                          >
                            <div
                              className="h-9 w-9 rounded-2xl flex items-center justify-center border"
                              style={{
                                borderColor: `${ACCENT}2A`,
                                background: `${ACCENT}10`,
                                color: ACCENT,
                              }}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-sm font-semibold text-[#0b1b3a] leading-snug">
                              {b.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#E6ECF8] bg-white p-4">
                      <div className="text-xs font-semibold text-[#0b1b3a]">
                        Current stage
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-[#0b1b3a]">
                          {active.name}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {active.count} • {active.avgScore}%
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* compact trust */}
              <div className="mt-5 pt-4 border-t border-[#E6ECF8] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                <span>Trusted by 500+ companies</span>
                <span className="hidden sm:inline">•</span>
                <span>89% faster hiring</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2, Lock, Hash, ClipboardList,
  FileCheck2, Users, Search,
} from "lucide-react";

/* ── Local profile images from /public/images/ ── */
const AVATARS = {
  maria:  "/images/people1.png",
  khalid: "/images/people2.png",
  sara:   "/images/people3.png",
  johan:  "/images/people4.png",
};

/* ── Animated counter ── */
function Counter({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 40; let cur = 0;
    const id = setInterval(() => {
      cur += target / steps;
      if (cur >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(cur));
    }, 30);
    return () => clearInterval(id);
  }, [target]);
  return <>{val}</>;
}

/* ── Sparkline ── */
const PTS = [36, 30, 28, 31, 20, 18, 22, 16, 14, 10];
function Sparkline() {
  const W = 220, H = 38;
  const min = Math.min(...PTS), max = Math.max(...PTS);
  const px = (i: number) => (i / (PTS.length - 1)) * W;
  const py = (v: number) => H - ((v - min) / (max - min)) * (H - 8) - 4;
  const d = PTS.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  const area = `${d} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#005DDC" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#005DDC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <motion.path d={d} fill="none" stroke="#005DDC" strokeWidth="2.2" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }} />
      {/* Live dot */}
      <circle cx={px(PTS.length - 1)} cy={py(PTS[PTS.length - 1])} r="3.5" fill="#005DDC" />
      <circle cx={px(PTS.length - 1)} cy={py(PTS[PTS.length - 1])} r="3.5" fill="#005DDC" opacity="0.35">
        <animate attributeName="r" values="3.5;8;3.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Device shell ── */
function DeviceShell({
  children, title, titleIcon, className = "", style,
}: {
  children: React.ReactNode;
  title: string;
  titleIcon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-white ${className}`}
      style={{
        boxShadow:
          "0 0 0 1.5px rgba(210,228,255,0.95)," +
          "0 2px 0 2px rgba(255,255,255,0.9) inset," +
          "0 28px 72px -18px rgba(0,48,130,0.22)," +
          "0 8px 24px -6px rgba(0,93,220,0.12)",
        ...style,
      }}>
      {/* Top shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,1) 40%,rgba(255,255,255,1) 60%,transparent 100%)" }} />
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2.5"
        style={{ borderBottom: "1px solid rgba(226,234,248,0.7)" }}>
        <div className="flex items-center gap-2">
          {titleIcon && (
            <div className="h-[22px] w-[22px] rounded-[7px] bg-[#EFF6FF] grid place-items-center">
              {titleIcon}
            </div>
          )}
          <span className="text-[12.5px] font-extrabold tracking-[-0.01em] text-[#0b1b3a]">{title}</span>
        </div>
        <div className="flex gap-1.5">
          {["#F1F5F9", "#F1F5F9", "#F1F5F9", "#005DDC"].map((c, i) => (
            <span key={i} className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

/* ── Avatar ── */
function Avatar({ src, size = 32, ring }: { src: string; size?: number; ring?: boolean }) {
  return (
    <div className="relative flex-shrink-0 rounded-full overflow-hidden"
      style={{
        width: size, height: size,
        boxShadow: ring
          ? "0 0 0 2.5px white, 0 4px 14px rgba(0,93,220,0.22)"
          : "0 0 0 1.5px rgba(226,234,248,0.9)",
      }}>
      <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
    </div>
  );
}

/* ── Tag pill ── */
const TAG: Record<string, { bg: string; border: string; text: string }> = {
  "Reviewing":        { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569" },
  "Candidate called": { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" },
  "Assessment":       { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
};

/* ════════════════════════════════════════════
   PIPELINE DATA
════════════════════════════════════════════ */
const PIPELINE = [
  { label: "New candidates", val: 62, pct: 0.55, color: "#005DDC" },
  { label: "Screened",       val: 12, pct: 0.25, color: "#22C55E" },
  { label: "Assessment",     val: 16, pct: 0.42, color: "#8B5CF6" },
  { label: "Interview",      val:  7, pct: 0.18, color: "#F59E0B" },
];

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
const Employer = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -26 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <section className="relative w-full overflow-hidden bg-white font-sans">
      {/* BG */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.32]"
          style={{ backgroundImage: "linear-gradient(to right,rgba(2,8,23,0.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(2,8,23,0.03) 1px,transparent 1px)", backgroundSize: "72px 72px" }} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F5F9FF] to-transparent" />
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-16 md:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">

          {/* ── LEFT ── */}
          <motion.div className="lg:col-span-5"
            variants={headingVariants} initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-4 py-2 text-xs font-semibold text-[#0b1b3a]">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#EAF2FF]">
                <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
              </span>
              For Employers
            </div>
            <h2 className="mt-6 text-[42px] leading-[1.05] md:text-5xl font-extrabold tracking-tight text-[#0b1b3a]">
              Are you an employer?
            </h2>
            <div className="mt-3 text-lg font-medium text-[#64748B]">Post roles and hire with signal — not noise.</div>
            <p className="mt-4 text-sm md:text-base text-[#64748B] leading-relaxed max-w-xl">
              You can find various solutions by accessing our platform. We're committed to maintaining
              the quality of user service — with structured workflows, assessments, and clean collaboration.
            </p>
            <motion.div className="mt-8"
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.5 }}>
              <div className="relative w-full max-w-xl overflow-hidden rounded-[26px] border border-[#E6ECF8] bg-white/90 shadow-[0_22px_55px_-45px_rgba(2,8,23,0.28)] backdrop-blur">
                <div className="absolute inset-0 bg-gradient-to-br from-[#005DDC]/[0.04] via-transparent to-transparent" />
                <div className="relative flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F3F7FF] text-[#005DDC]">
                    <Search size={17} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#94A3B8]">Post a Job →</div>
                    <div className="text-xs font-semibold text-[#94A3B8] mt-1">No credit card required • 5 min setup</div>
                  </div>
                  <Link href="/auth/login">
                    <motion.button
                      className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-[#005DDC] px-5 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
                      style={{ boxShadow: "0 12px 32px -10px rgba(0,93,220,0.45)" }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      Post a Job
                    </motion.button>
                  </Link>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-white/90 px-4 py-2 text-xs font-semibold text-[#0b1b3a] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
                <span>Clean workflows</span>
                <span className="text-[#94A3B8]">•</span>
                <span>Fast hiring</span>
              </div>
            </motion.div>
          </motion.div>

          {/* ── RIGHT ── */}
          <div className="lg:col-span-7">
            <div className="relative" style={{ height: 560 }}>

              {/* Ambient glow */}
              <div className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(ellipse 85% 70% at 48% 54%, rgba(180,212,255,0.42) 0%, transparent 70%)" }} />

              {/* ════ CARD 1 — Hiring Overview (left, straight) ════ */}
              <motion.div className="absolute" style={{ left: 0, top: 12, width: "51%", zIndex: 20 }}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }}>
                <DeviceShell title="Hiring overview"
                  titleIcon={
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-[#22C55E] opacity-55" />
                      <span className="relative h-2 w-2 rounded-full bg-[#22C55E]" />
                    </span>
                  }>

                  {/* Company pill */}
                  <div className="flex items-center gap-2 rounded-xl bg-[#F4F8FF] border border-[#E8F0FE] px-2.5 py-2 mb-3">
                    <div className="h-6 w-6 rounded-lg bg-[#DBEAFE] grid place-items-center flex-shrink-0">
                      <ClipboardList size={12} color="#005DDC" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#475569]">ATT. Alliong · 712,4019</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users size={8} color="#94A3B8" />
                        <span className="text-[9px] font-semibold text-[#94A3B8]">Collected to review</span>
                      </div>
                    </div>
                  </div>

                  {/* Big stat + avatar */}
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <div className="text-[48px] font-black text-[#0b1b3a] leading-none tabular-nums tracking-tight">
                        <Counter target={23} />
                      </div>
                      <div className="text-[11px] font-semibold text-[#94A3B8] mt-1">New applications</div>
                      <div className="text-[9.5px] font-medium text-[#CBD5E1] mt-0.5">Oct 3 — Apr 11</div>
                    </div>
                    <div className="relative flex-shrink-0 mb-1">
                      <Avatar src={AVATARS.maria} size={54} ring />
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#005DDC] text-white text-[9px] font-black px-2 py-0.5 whitespace-nowrap"
                        style={{ boxShadow: "0 2px 10px rgba(0,93,220,0.40)" }}>
                        12
                      </div>
                    </div>
                  </div>

                  {/* Sparkline */}
                  <Sparkline />
                  <div className="flex justify-between text-[9px] font-medium text-[#CBD5E1] mt-0.5 mb-3">
                    <span>Apr 5</span><span>Apr 11</span>
                  </div>

                  <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#E8EEF8] to-transparent" />

                  {/* Pipeline section */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 size={12} color="#64748B" />
                      <span className="text-[12px] font-extrabold text-[#0b1b3a]">Pipeline</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#94A3B8] cursor-pointer hover:text-[#005DDC] transition-colors">×</span>
                  </div>
                  <div className="space-y-2.5">
                    {PIPELINE.map(({ label, val, pct, color }, i) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl grid place-items-center flex-shrink-0"
                          style={{ background: `${color}18` }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-[11px] font-bold text-[#334155] truncate">{label}</span>
                            <span className="text-[11px] font-extrabold ml-1 tabular-nums" style={{ color }}>{val}</span>
                          </div>
                          <div className="h-[5px] w-full rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                            <motion.div className="h-full rounded-full" style={{ background: color }}
                              initial={{ width: 0 }} animate={{ width: `${Math.round(pct * 100)}%` }}
                              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.35 + i * 0.1 }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    className="mt-4 w-full rounded-2xl bg-[#005DDC] py-2.5 text-[12.5px] font-bold text-white flex items-center justify-center gap-2"
                    style={{ boxShadow: "0 10px 28px -8px rgba(0,93,220,0.45)" }}
                    whileHover={{ scale: 1.015, boxShadow: "0 14px 36px -8px rgba(0,93,220,0.55)" }}
                    whileTap={{ scale: 0.98 }}>
                    <FileCheck2 size={13} />
                    View details
                  </motion.button>
                </DeviceShell>
              </motion.div>

              {/* ════ CARD 2 — Pipeline (top right, +5°) ════ */}
              <motion.div className="absolute" style={{ right: 0, top: 0, width: "48%", zIndex: 10 }}
                initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: 0.09 }}>
                <div style={{ transform: "rotate(5deg)", transformOrigin: "bottom left" }}>
                  <DeviceShell title="Pipeline"
                    titleIcon={<ClipboardList size={11} color="#005DDC" />}>
                    <div className="space-y-2">
                      {[
                        { name: "Khalid A.", meta: "Together stories", tag: "Reviewing",         avatar: AVATARS.khalid },
                        { name: "Sara D.",   meta: "Candidate called", tag: "Candidate called",  avatar: AVATARS.sara   },
                        { name: "Johan G.",  meta: "Anton ornert",     tag: "Assessment",         avatar: AVATARS.johan  },
                      ].map(({ name, meta, tag, avatar }) => {
                        const t = TAG[tag] ?? TAG["Reviewing"];
                        return (
                          <div key={name}
                            className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-colors"
                            style={{ background: "#FAFCFF", border: "1px solid #EAF0FA" }}>
                            <Avatar src={avatar} size={32} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-extrabold text-[#0b1b3a] truncate">{name}</div>
                              <div className="text-[9.5px] font-semibold text-[#94A3B8] truncate">{meta}</div>
                            </div>
                            <span className="flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[9.5px] font-extrabold"
                              style={{ background: t.bg, borderColor: t.border, color: t.text }}>
                              {tag}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </DeviceShell>
                </div>
              </motion.div>

              {/* ════ CARD 3 — Assessments (bottom right, -6°) ════ */}
              <motion.div className="absolute" style={{ right: 6, bottom: 0, width: "52%", zIndex: 30 }}
                initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: 0.16 }}>
                <div style={{ transform: "rotate(-6deg)", transformOrigin: "top left" }}>
                  <DeviceShell title="Assessments"
                    titleIcon={<FileCheck2 size={11} color="#005DDC" />}>

                    {/* Candidate header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={AVATARS.maria} size={40} ring />
                        <div>
                          <div className="text-[13px] font-extrabold text-[#0b1b3a]">Maria S.</div>
                          <div className="text-[10px] font-semibold text-[#94A3B8]">JavaScript Fundamentals</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#64748B]"
                        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
                        89%
                        <CheckCircle2 size={11} color="#22C55E" />
                      </div>
                    </div>

                    {/* Score card */}
                    <div className="rounded-2xl border border-[#EAF0FA] p-3 mb-3" style={{ background: "#FAFCFF" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11.5px] font-extrabold text-[#0b1b3a]">JavaScript Fundamentals</span>
                        <span className="rounded-xl bg-[#005DDC] px-2 py-0.5 text-[10.5px] font-extrabold text-white">89%</span>
                      </div>
                      <div className="h-[7px] w-full rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg,#005DDC,#60A5FA)" }}
                          initial={{ width: 0 }} animate={{ width: "89%" }}
                          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.6 }} />
                      </div>
                      <div className="mt-1.5 text-[9.5px] font-semibold text-[#94A3B8]">Score — top 20%</div>
                    </div>

                    {/* Task rows */}
                    {[
                      { label: "QA/Test Automation" },
                      { label: "Logical Reasoning"  },
                    ].map(({ label }) => (
                      <div key={label}
                        className="flex items-center justify-between rounded-2xl border border-[#EAF0FA] px-3 py-2.5 mb-2"
                        style={{ background: "#FAFCFF" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-xl bg-[#EFF6FF] grid place-items-center flex-shrink-0">
                            <CheckCircle2 size={13} color="#005DDC" />
                          </div>
                          <span className="text-[12px] font-extrabold text-[#0b1b3a]">{label}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="h-7 w-7 rounded-xl border border-[#E6ECF8] bg-white grid place-items-center">
                            <Lock size={11} color="#94A3B8" />
                          </div>
                          <div className="h-7 w-7 rounded-xl border border-[#E6ECF8] bg-white grid place-items-center">
                            <Hash size={11} color="#94A3B8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </DeviceShell>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Employer;
"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Check,
  Briefcase,
  MapPin,
  Sparkles,
  ShieldCheck,
  Code2,
} from "lucide-react";

const LOGO_SRC = "/images/logo.png";

/**
 * ✅ Updates based on your feedback:
 * - Less empty space on the right: preview is centered + slightly smaller + non-sticky by default
 * - Title size matches other sections (already smaller)
 * - Hiring scene: NO big icon, more “decision workspace” UI like your screenshot
 * - Hiring scene looks cleaner + more modern (cards, pills, subtle borders)
 * - Matching scene: tightened + more product-feel
 */

const steps = [
  {
    number: 1,
    title: "Build Your Profile",
    description:
      "Upload your CV. We extract skills, experience, and generate a verified profile - automatically.",
    chips: ["CV parsed", "Skills extracted"],
    meta: "Verified",
  },
  {
    number: 2,
    title: "Get Matched",
    description:
      "AI ranks jobs or candidates using real compatibility signals - not keyword guessing.",
    chips: ["Fit score", "Why this match"],
    meta: "Matching",
  },
  {
    number: 3,
    title: "Prove Your Skills",
    description:
      "Assessments validate skills with real execution, scoring, and full transparency.",
    chips: ["Test cases", "Run code"],
    meta: "Assessment",
  },
  {
    number: 4,
    title: "Hire or Get Hired",
    description:
      "Companies decide faster. Candidates earn fair opportunities based on proof.",
    chips: ["Shortlist", "Offer-ready"],
    meta: "Decision",
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="relative w-full bg-white overflow-hidden">
      {/* light theme glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.05] blur-3xl" />
        <div className="absolute bottom-[-150px] right-[-130px] h-96 w-96 rounded-full bg-[#005DDC] opacity-[0.045] blur-3xl" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-12 md:py-14">
        {/* header (same scale as other sections) */}
        <motion.div
          className="mb-8 md:mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-[#0b1b3a] tracking-tight leading-[1.15]">
            From profile to offer - in 4 steps
          </h2>
          <p className="mt-2 max-w-2xl text-sm md:text-base text-[#64748B]">
            A simple flow for candidates and employers - powered by real signals.
          </p>
        </motion.div>

        {/*  Better balance: right preview slightly narrower and centered */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start">
          {/* LEFT */}
          <motion.div
            className="lg:col-span-6 flex flex-col"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
          >
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <div
                  key={step.number}
                  className="group cursor-pointer"
                  onMouseEnter={() => setActiveStep(i)}
                  onFocus={() => setActiveStep(i)}
                  tabIndex={0}
                >
                  <div
                    className={[
                      "relative flex gap-4 md:gap-5 py-4 md:py-5 rounded-2xl transition",
                      isActive
                        ? "bg-[#F7FBFF]"
                        : "bg-transparent hover:bg-[#FBFDFF]",
                    ].join(" ")}
                  >
                    {/* left accent */}
                    <motion.div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#005DDC]"
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0,
                        scaleY: isActive ? 1 : 0.6,
                      }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    />

                    {/* number pill */}
                    <div className="flex-shrink-0 pl-3 md:pl-4 pt-0.5">
                      <div
                        className={[
                          "h-10 w-10 rounded-2xl flex items-center justify-center border text-sm font-semibold transition",
                          isActive
                            ? "border-[#005DDC] bg-[#EAF3FF] text-[#005DDC]"
                            : "border-[#E6ECF8] bg-white text-[#94A3B8]",
                        ].join(" ")}
                      >
                        {step.number}
                      </div>
                    </div>

                    {/* text */}
                    <div className="flex-1 pr-3 md:pr-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[16px] md:text-[18px] font-semibold text-[#0b1b3a] tracking-tight">
                          {step.title}
                        </h3>
                        {isActive && (
                          <motion.span
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0b1b3a]"
                            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                          >
                            <CheckCircle2 className="h-4 w-4 text-[#005DDC]" />
                            {step.meta}
                          </motion.span>
                        )}
                      </div>

                      <motion.div
                        initial={false}
                        animate={{
                          height: isActive ? "auto" : 0,
                          opacity: isActive ? 1 : 0,
                          marginTop: isActive ? 8 : 0,
                        }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-[14px] md:text-[15px] text-[#64748B] leading-relaxed max-w-md">
                          {step.description}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {step.chips.map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0b1b3a]"
                              style={{
                                border: "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {i < steps.length - 1 && (
                    <div className="relative h-px bg-[#E2E8F0] ml-[62px] md:ml-[72px]">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-[#005DDC]"
                        initial={false}
                        animate={{ width: isActive ? "100%" : "0%" }}
                        transition={{ duration: 0.32, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-6 ml-[62px] md:ml-[72px]">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#005DDC] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition"
              >
                Get Matched Now
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* RIGHT (more compact + centered) */}
          <motion.div
            className="lg:col-span-6 flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: 0.05, ease: "easeOut" }}
          >
            <div className="w-full max-w-[520px]">
              <div className="relative rounded-[22px] border border-[#E6ECF8] bg-[#FAFBFC] shadow-[0_18px_45px_-36px_rgba(0,0,0,0.18)] overflow-hidden aspect-square max-h-[420px] mx-auto">
                <AnimatePresence mode="wait">
                  {activeStep === 0 && <SceneProfile key="s0" />}
                  {activeStep === 1 && <SceneMatchEnhanced key="s1" />}
                  {activeStep === 2 && <SceneAssess key="s2" />}
                  {activeStep === 3 && <SceneHireEnhanced key="s3" />}
                </AnimatePresence>
              </div>
              <div className="mt-3 text-xs text-[#94A3B8] text-center">
                Hover a step to preview the experience.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   SCENE 1 — Profile build (kept)
============================================================ */
function SceneProfile() {
  const skills = [
    { name: "React", x: -115, y: -95, delay: 0.7 },
    { name: "TypeScript", x: 105, y: -75, delay: 0.8 },
    { name: "Node.js", x: -95, y: 55, delay: 0.9 },
    { name: "PostgreSQL", x: 115, y: 75, delay: 1.0 },
    { name: "Docker", x: -35, y: -125, delay: 1.1 },
    { name: "AWS", x: 45, y: 125, delay: 1.15 },
    { name: "GraphQL", x: 135, y: 5, delay: 1.2 },
    { name: "REST API", x: -135, y: -15, delay: 1.25 },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="absolute rounded-full border border-dashed border-[#005DDC]/[0.07]"
        style={{ width: 340, height: 340 }}
      />

      <motion.div
        className="relative z-10 flex items-center gap-3"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        {/* CV */}
        <div className="relative w-24 h-32 rounded-lg bg-white border border-[#E2E8F0] shadow-md flex flex-col p-2.5 overflow-hidden">
          <div className="w-full space-y-1.5 mb-1.5">
            <div className="h-2 w-[55%] rounded bg-[#0b1b3a]/12" />
            <div className="h-1.5 w-[80%] rounded bg-[#0b1b3a]/6" />
            <div className="h-1.5 w-[65%] rounded bg-[#0b1b3a]/6" />
          </div>
          <div className="h-px w-full bg-[#E2E8F0]" />
          <div className="w-full space-y-1.5 mt-1.5">
            <div className="h-1.5 w-[85%] rounded bg-[#0b1b3a]/6" />
            <div className="h-1.5 w-[45%] rounded bg-[#0b1b3a]/6" />
            <div className="h-1.5 w-[70%] rounded bg-[#0b1b3a]/6" />
          </div>

          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-[#005DDC]"
            initial={{ top: "8%" }}
            animate={{ top: ["8%", "90%", "8%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: "0 0 10px 2px rgba(0,93,220,0.2)" }}
          />

          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-t-md bg-[#005DDC] px-2 py-0.5">
            <span className="text-[7px] font-semibold text-white">resume.pdf</span>
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-[#005DDC]/40" />

        {/* profile card */}
        <motion.div
          className="w-32 rounded-xl bg-white border border-[#E2E8F0] shadow-md p-3"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-[#00A35A]/25 flex-shrink-0">
              <img
                src="/images/avatar-sarah.jpg"
                alt="Sarah"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#0b1b3a] truncate">
                Sarah Ahmed
              </p>
              <p className="text-[8px] text-[#64748B]">Full-Stack</p>
            </div>
          </div>

          <div className="h-3.5 rounded-full bg-[#00A35A]/10 px-1.5 flex items-center gap-0.5 w-fit mb-2">
            <Check className="h-2 w-2 text-[#00A35A]" />
            <span className="text-[7px] font-bold text-[#00A35A]">
              Verified
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {["React", "TS", "Node", "PG"].map((s, j) => (
              <motion.span
                key={s}
                className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[7px] font-medium text-[#475569]"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + j * 0.1, duration: 0.2 }}
              >
                {s}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {skills.map((s) => (
        <motion.div
          key={s.name}
          className="absolute z-20"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: s.x, y: s.y, opacity: 1, scale: 1 }}
          transition={{
            delay: s.delay,
            duration: 0.45,
            type: "spring",
            stiffness: 130,
            damping: 14,
          }}
        >
          <div className="rounded-md bg-white border border-[#E2E8F0] px-2.5 py-1 shadow-sm text-[10px] font-semibold text-[#0b1b3a] whitespace-nowrap flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00A35A]" />
            {s.name}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ============================================================
   SCENE 2 — Matching (tighter + more “workspace”)
============================================================ */
function SceneMatchEnhanced() {
  const candidates = [
    {
      name: "Sarah A.",
      score: 94,
      img: "/images/avatar-sarah.jpg",
      y: -56,
      reason: "React + Node depth",
    },
    {
      name: "James K.",
      score: 87,
      img: "/images/avatar-james.jpg",
      y: 10,
      reason: "Strong system design",
    },
    {
      name: "Priya M.",
      score: 82,
      img: "/images/avatar-priya.jpg",
      y: 78,
      reason: "Great TS + SQL",
    },
  ];

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* top header */}
      <div className="absolute left-5 right-5 top-5 z-30 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0b1b3a] border border-[#E6ECF8] shadow-sm">
          <Sparkles className="h-4 w-4 text-[#005DDC]" />
          Matching
          <span className="text-[#94A3B8] font-semibold">workspace</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0b1b3a] px-3 py-1.5 text-[11px] font-semibold text-white/90">
          <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
          Live
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {/* softer rings */}
        <div
          className="absolute rounded-full border border-dashed border-[#005DDC]/[0.06]"
          style={{ width: 330, height: 330 }}
        />
        <div
          className="absolute rounded-full border border-[#005DDC]/[0.05]"
          style={{ width: 245, height: 245 }}
        />

        {/* Job card */}
        <motion.div
          className="absolute z-20"
          style={{ right: 28, top: "50%", transform: "translateY(-50%)" }}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          <div className="w-[170px] rounded-2xl bg-white border border-[#E6ECF8] shadow-[0_18px_45px_-36px_rgba(0,0,0,0.22)] overflow-hidden">
            <div className="bg-[#EAF3FF] px-3 py-2 border-b border-[#E6ECF8]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-[#005DDC] flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-white/90" strokeWidth={1.6} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#0b1b3a] truncate">
                    Senior Full-Stack
                  </p>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-[#64748B]" strokeWidth={1.5} />
                    <span className="text-[9px] text-[#64748B]">
                      Remote • €80–100k
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-3 py-3">
              <div className="text-[10px] font-semibold text-[#0b1b3a]">
                Must-have
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["React", "Node", "TS", "SQL"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[#F7FBFF] border border-[#E6ECF8] px-2 py-1 text-[9px] font-semibold text-[#0b1b3a]"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-3 rounded-xl bg-[#F7FBFF] border border-[#E6ECF8] p-2.5">
                <div className="flex items-center justify-between text-[9px] text-[#64748B]">
                  <span>Readiness</span>
                  <span className="font-semibold text-[#0b1b3a]">High</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#E6ECF8] overflow-hidden">
                  <motion.div
                    className="h-2 rounded-full bg-[#005DDC]"
                    initial={{ width: "18%" }}
                    animate={{ width: ["18%", "74%", "62%", "86%", "78%"] }}
                    transition={{
                      duration: 4.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{ opacity: 0.85 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Candidates */}
        {candidates.map((c, i) => (
          <motion.div
            key={c.name}
            className="absolute z-20"
            style={{ left: 22, top: `calc(34% + ${c.y}px)` }}
            initial={{ x: -32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.28 + i * 0.12, duration: 0.35 }}
          >
            <div className="rounded-2xl bg-white border border-[#E6ECF8] shadow-sm px-2.5 py-2 flex items-center gap-2.5 w-[190px]">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-[#E2E8F0] flex-shrink-0">
                <img src={c.img} alt={c.name} className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold text-[#0b1b3a] truncate">
                    {c.name}
                  </p>
                  <span
                    className="text-[12px] font-extrabold"
                    style={{ color: c.score >= 90 ? "#005DDC" : "#64748B" }}
                  >
                    {c.score}%
                  </span>
                </div>

                <p className="text-[9px] text-[#94A3B8]">fit score • explainable</p>

                <div className="mt-1.5 h-2 w-full rounded-full bg-[#E6ECF8] overflow-hidden">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: c.score >= 90 ? "#005DDC" : "#94A3B8",
                      opacity: 0.8,
                    }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${c.score}%` }}
                    transition={{
                      delay: 0.45 + i * 0.1,
                      duration: 0.45,
                      ease: "easeOut",
                    }}
                  />
                </div>

                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#F7FBFF] border border-[#E6ECF8] px-2 py-1 text-[9px] font-semibold text-[#0b1b3a] w-fit">
                  <Sparkles className="h-3 w-3 text-[#005DDC]" />
                  {c.reason}
                </div>
              </div>
            </div>

            {/* connection line */}
            <svg
              className="absolute pointer-events-none"
              style={{
                left: "100%",
                top: "50%",
                width: 112 - i * 10,
                height: 2,
                transform: "translateY(-50%)",
              }}
            >
              <motion.line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke={c.score >= 90 ? "#005DDC" : "#94A3B8"}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.26 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
              />
            </svg>
          </motion.div>
        ))}

        {/* center tag */}
        <motion.div
          className="absolute z-30 rounded-full bg-[#0b1b3a] px-3.5 py-1.5"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.25 }}
        >
          <span className="text-[10px] font-semibold text-white">AI matching</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   SCENE 3 — assessment radar (kept)
============================================================ */
function SceneAssess() {
  const dims = [
    { label: "Logic", value: 0.9 },
    { label: "Speed", value: 0.75 },
    { label: "Memory", value: 0.85 },
    { label: "Style", value: 0.7 },
    { label: "Edge cases", value: 0.65 },
    { label: "Accuracy", value: 0.95 },
  ];

  const n = dims.length;
  const R = 100;
  const cx = 150;
  const cy = 145;

  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(a) * R * v, y: cy + Math.sin(a) * R * v };
  };

  const shape = dims
    .map((d, i) => {
      const p = pt(i, d.value);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <svg width="300" height="290" viewBox="0 0 300 290" className="relative z-10">
        {[0.25, 0.5, 0.75, 1].map((lv) => (
          <polygon
            key={lv}
            points={Array.from({ length: n })
              .map((_, i) => {
                const p = pt(i, lv);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="0.8"
          />
        ))}

        {dims.map((_, i) => {
          const p = pt(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#E2E8F0"
              strokeWidth="0.6"
            />
          );
        })}

        <motion.polygon
          points={shape}
          fill="#7C3AED"
          fillOpacity={0.1}
          stroke="#7C3AED"
          strokeWidth="1.8"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, type: "spring", stiffness: 70 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {dims.map((d, i) => {
          const p = pt(i, d.value);
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="white"
              stroke="#7C3AED"
              strokeWidth="1.8"
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 1, r: 3.5 }}
              transition={{ delay: 0.7 + i * 0.08 }}
            />
          );
        })}
      </svg>

      {dims.map((d, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = Math.cos(a) * (R + 42);
        const ly = Math.sin(a) * (R + 42);
        return (
          <motion.div
            key={i}
            className="absolute z-20 text-center"
            style={{
              left: `calc(50% + ${lx}px)`,
              top: `calc(48% + ${ly}px)`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 + i * 0.06 }}
          >
            <p className="text-[9px] font-semibold text-[#0b1b3a]">{d.label}</p>
            <p className="text-[9px] font-bold text-[#7C3AED]">
              {Math.round(d.value * 100)}
            </p>
          </motion.div>
        );
      })}

      <motion.div
        className="absolute z-20 flex flex-col items-center"
        style={{ top: "47%", left: "50%", transform: "translate(-50%, -50%)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.15 }}
      >
        <span className="text-[22px] font-bold text-[#7C3AED] leading-none">86</span>
        <span className="text-[8px] text-[#94A3B8] mt-0.5">skill score</span>
      </motion.div>

      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-[#0b1b3a] px-3.5 py-2 flex items-center gap-2.5"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.35 }}
      >
        <div className="flex gap-0.5">
          {[true, true, true, true, true, false].map((passed, t) => (
            <motion.div
              key={t}
              className={`h-2 w-2 rounded-full ${passed ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5 + t * 0.06, type: "spring", stiffness: 200 }}
            />
          ))}
        </div>
        <span className="text-[9px] font-semibold text-white/60">5/6 passed</span>
        <div className="h-2.5 w-px bg-white/10" />
        <span className="text-[9px] font-semibold text-white/60">142ms</span>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   SCENE 4 — Hire/Get Hired (REWORKED to match your taste)
   - no big icons
   - cleaner decision workspace
   - resembles your reference card (top bar, candidate, 3 signals, CTA)
============================================================ */
function SceneHireEnhanced() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* subtle background blobs */}
      <div className="absolute inset-0">
        <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-[#00A35A] opacity-[0.06] blur-2xl" />
        <div className="absolute right-10 bottom-10 h-28 w-28 rounded-full bg-[#005DDC] opacity-[0.06] blur-2xl" />
      </div>

      {/* main decision card */}
      <motion.div
        className="relative z-20 w-[260px]"
        initial={{ y: 14, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, type: "spring", stiffness: 120, damping: 16 }}
      >
        <div className="rounded-[26px] bg-white border border-[#E6ECF8] shadow-[0_24px_60px_-44px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* top bar */}
          <div className="px-4 py-3 bg-[#F7FBFF] border-b border-[#E6ECF8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-full bg-white border border-[#E6ECF8] flex items-center justify-center overflow-hidden">
                  <img
                    src={LOGO_SRC}
                    alt="logo"
                    className="h-6 w-6 object-contain"
                    draggable={false}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#0b1b3a] truncate">
                    Decision workspace
                  </p>
                  <p className="text-[10px] text-[#94A3B8] truncate">
                    offer-ready candidate
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#EAFBF2] px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                <span className="text-[11px] font-bold text-[#00A35A]">Ready</span>
              </div>
            </div>
          </div>

          {/* candidate card */}
          <div className="px-4 pt-4">
            <div className="rounded-2xl border border-[#E6ECF8] bg-white shadow-sm p-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl overflow-hidden border border-[#E2E8F0]">
                  <img
                    src="/images/avatar-sarah.jpg"
                    alt="Sarah"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-extrabold text-[#0b1b3a] truncate">
                    Sarah A.
                  </p>
                  <p className="text-[10px] text-[#64748B] truncate">
                    Senior Full-Stack Developer
                  </p>
                </div>

                <div className="rounded-2xl bg-[#EAF3FF] border border-[#DCEBFF] px-3 py-2 text-center">
                  <p className="text-[12px] font-extrabold text-[#005DDC] leading-none">
                    94%
                  </p>
                  <p className="text-[9px] text-[#64748B] mt-0.5">match</p>
                </div>
              </div>
            </div>
          </div>

          {/* signals */}
          <div className="px-4 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <SignalPill
                tint="#EAFBF2"
                dot="#00A35A"
                label="Verified"
                value="Yes"
              />
              <SignalPill
                tint="#EAF3FF"
                dot="#005DDC"
                label="Fit"
                value="High"
              />
              <SignalPill
                tint="#F3EEFF"
                dot="#7C3AED"
                label="Score"
                value="86"
              />
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 pt-3 pb-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full rounded-2xl bg-[#00A35A] py-3 text-[12px] font-extrabold text-white shadow-[0_18px_40px_-28px_rgba(0,163,90,0.45)]"
            >
              Send Offer
            </motion.button>

            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className="text-[#94A3B8]">Evidence attached</span>
              <span className="font-semibold text-[#0b1b3a]">3 signals</span>
            </div>
          </div>
        </div>

        {/* bottom caption pill (small, clean) */}
        <motion.div
          className="mt-4 mx-auto w-fit rounded-full bg-[#0b1b3a] px-4 py-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <span className="text-[11px] font-semibold text-white/90">
            Hire with confidence
          </span>
        </motion.div>
      </motion.div>

      {/* tiny floating chips (subtle, not noisy) */}
      <FloatChip
        text="Profile verified"
        color="#00A35A"
        x={-120}
        y={-82}
        delay={0.25}
      />
      <FloatChip text="94% match" color="#005DDC" x={120} y={-60} delay={0.32} />
      <FloatChip text="Score 86" color="#7C3AED" x={-95} y={84} delay={0.4} />
    </motion.div>
  );
}

function SignalPill({
  tint,
  dot,
  label,
  value,
}: {
  tint: string;
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E6ECF8] bg-white p-2">
      <div className="rounded-xl px-2 py-2" style={{ background: tint }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-[#64748B] leading-none">
              {label}
            </p>
            <p className="text-[12px] font-extrabold text-[#0b1b3a] leading-tight">
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatChip({
  text,
  color,
  x,
  y,
  delay,
}: {
  text: string;
  color: string;
  x: number;
  y: number;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute z-10"
      initial={{ opacity: 0, x: x * 1.4, y: y * 1.4, scale: 0.9 }}
      animate={{ opacity: 1, x: x * 0.42, y: y * 0.42, scale: 1 }}
      transition={{ delay, duration: 0.55, type: "spring", stiffness: 110, damping: 16 }}
    >
      <div
        className="rounded-full bg-white border px-3 py-2 shadow-sm"
        style={{ borderColor: `${color}30` }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-semibold" style={{ color }}>
            {text}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

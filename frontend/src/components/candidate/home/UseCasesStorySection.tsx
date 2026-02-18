"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Code2, Globe2 } from "lucide-react";

type UseKey = "international" | "screening" | "bias" | "relocation";

const USE_CASES: Array<{
  key: UseKey;
  title: string;
  oneLiner: string;
  icon: React.ElementType;
  accent: string;
  story: { headline: string; bullets: string[]; outcome: string };
}> = [
  {
    key: "international",
    title: "Hiring remote & international engineers",
    oneLiner: "Match + verify talent across borders with consistent signals.",
    icon: Globe2,
    accent: "#005DDC",
    story: {
      headline: "A company needs a senior engineer — globally.",
      bullets: [
        "Shortlist is ranked by skill fit (not keywords).",
        "Profiles show structured skills + proof badges.",
        "Hiring team sees the same signal across countries.",
      ],
      outcome: "Outcome: faster shortlist with less uncertainty.",
    },
  },
  {
    key: "screening",
    title: "Fair technical screening at scale",
    oneLiner: "Assessments produce measurable proof for every candidate.",
    icon: Code2,
    accent: "#7C3AED",
    story: {
      headline: "Screen 200 candidates without drowning in interviews.",
      bullets: [
        "Real code execution in multiple languages.",
        "Automated test cases + runtime metrics.",
        "Integrity checks reduce noise and cheating.",
      ],
      outcome: "Outcome: clear reports, fewer interviews, better hires.",
    },
  },
  {
    key: "bias",
    title: "Reducing bias with skill-based evaluation",
    oneLiner: "Evidence beats intuition. Skills convince.",
    icon: ShieldCheck,
    accent: "#00A35A",
    story: {
      headline: "Teams want signal — not assumptions.",
      bullets: [
        "Skills are extracted and structured consistently.",
        "Assessments add proof to the profile.",
        "Scoring stays transparent and explainable.",
      ],
      outcome: "Outcome: more objective decisions, better candidate trust.",
    },
  },
  {
    key: "relocation",
    title: "Managing relocation alongside hiring",
    oneLiner: "Agencies + case tracking in the same platform.",
    icon: Sparkles,
    accent: "#005DDC",
    story: {
      headline: "Hiring success includes arrival + integration.",
      bullets: [
        "Document flow tracked like a pipeline.",
        "Candidates and employers see the same status.",
        "Agencies operate within one workspace.",
      ],
      outcome: "Outcome: less chaos, faster onboarding, fewer surprises.",
    },
  },
];

export default function UseCasesStorySection() {
  const [active, setActive] = useState<UseKey>("international");
  const current = useMemo(() => USE_CASES.find((u) => u.key === active)!, [active]);

  return (
    <section className="relative w-full bg-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-12 md:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
              <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
              Use Cases
            </div>

            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-[#0b1b3a] leading-[1.12]">
              Built for Real Hiring Scenarios
            </h2>

            <p className="mt-2 text-sm md:text-base text-[#64748B]">
              Hiralent adapts to how modern teams actually hire.
            </p>
          </div>

          <a
            href="/product"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E6ECF8] bg-white px-5 py-3 text-sm font-semibold text-[#0b1b3a] hover:bg-[#F7FBFF] transition"
          >
            See the product flow
            <ArrowRight className="h-4 w-4 text-[#005DDC]" />
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
          {/* Use case selector */}
          <div className="lg:col-span-5 rounded-3xl border border-[#E6ECF8] bg-white p-5 md:p-6 shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)]">
            <div className="text-sm font-semibold text-[#0b1b3a]">Choose a scenario</div>

            <div className="mt-4 space-y-2">
              {USE_CASES.map((u) => {
                const Icon = u.icon;
                const isActive = u.key === active;

                return (
                  <button
                    key={u.key}
                    onClick={() => setActive(u.key)}
                    className={[
                      "w-full text-left rounded-2xl border p-4 transition",
                      isActive
                        ? "bg-[#F7FBFF] border-[#005DDC]/25"
                        : "bg-white border-[#E6ECF8] hover:bg-[#FBFDFF]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-2xl border flex items-center justify-center"
                        style={{
                          borderColor: isActive ? `${u.accent}25` : "#E6ECF8",
                          background: isActive ? `${u.accent}12` : "#F7FBFF",
                          color: u.accent,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#0b1b3a]">{u.title}</div>
                        <div className="text-[12px] text-[#64748B] mt-1">{u.oneLiner}</div>
                      </div>

                      {/* active indicator (no text) */}
                      {isActive && (
                        <div
                          className="mt-1 h-2.5 w-2.5 rounded-full"
                          style={{ background: u.accent }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Story card */}
          <div className="lg:col-span-7 rounded-3xl border border-[#E6ECF8] bg-gradient-to-br from-[#F8FBFF] to-white p-6 shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)] overflow-hidden">
            <div className="text-sm font-semibold text-[#0b1b3a]">Story preview</div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mt-4"
              >
                <div className="rounded-2xl bg-white border border-[#E6ECF8] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-[#0b1b3a] tracking-tight">
                        {current.story.headline}
                      </div>
                      <div className="mt-2 text-sm text-[#64748B]">
                        Here’s how Hiralent handles it end-to-end:
                      </div>
                    </div>

                    <div
                      className="h-10 w-10 rounded-2xl border flex items-center justify-center"
                      style={{
                        borderColor: `${current.accent}25`,
                        background: `${current.accent}12`,
                        color: current.accent,
                      }}
                    >
                      {React.createElement(current.icon, { className: "h-5 w-5" })}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {current.story.bullets.map((b, i) => (
                      <motion.div
                        key={b}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 * i, duration: 0.22 }}
                        className="flex items-start gap-3"
                      >
                        <span
                          className="mt-2 h-2 w-2 rounded-full"
                          style={{ background: current.accent, opacity: 0.85 }}
                        />
                        <div className="text-sm font-medium text-[#0b1b3a]">{b}</div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="mt-5 rounded-xl border p-4"
                    style={{
                      borderColor: `${current.accent}20`,
                      background: `${current.accent}0D`,
                    }}
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="text-sm font-semibold" style={{ color: current.accent }}>
                      {current.story.outcome}
                    </div>
                    <div className="text-[12px] text-[#64748B] mt-1">
                      Product-first storytelling — no blog vibe.
                    </div>
                  </motion.div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#64748B] border border-[#E6ECF8]">
                      Evidence • Transparency • Speed
                    </span>

                    <a
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#005DDC] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition"
                    >
                      Start with Hiralent
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 text-xs text-[#64748B]">
              Each scenario opens a short animated story card — product-focused social proof.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

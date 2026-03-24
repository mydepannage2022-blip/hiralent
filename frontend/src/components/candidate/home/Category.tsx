"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Code2,
  Globe2,
  BadgeCheck,
  ArrowRight,
  Check,
  Timer,
  Cpu,
  Shield,
  Upload,
  Star,
  Briefcase,
  X,
  GitBranch,
  Zap,
} from "lucide-react";

type TabKey = "global" | "profiles" | "matching" | "assessments";

const EARTH_SRC = "/images/earth-real.png";

const flagUrls: Record<string, string> = {
  US: "https://flagcdn.com/w80/us.png",
  BR: "https://flagcdn.com/w80/br.png",
  MA: "https://flagcdn.com/w80/ma.png",
  DE: "https://flagcdn.com/w80/de.png",
  GB: "https://flagcdn.com/w80/gb.png",
  IN: "https://flagcdn.com/w80/in.png",
  JP: "https://flagcdn.com/w80/jp.png",
  FR: "https://flagcdn.com/w80/fr.png",
  SG: "https://flagcdn.com/w80/sg.png",
};

const FLAG_CODES = ["US", "FR", "GB", "DE", "MA", "BR", "IN", "JP", "SG"] as const;

export default function WhyHiralentDifferentCompact() {
  const tabs = useMemo(
    () => [
      {
        key: "global" as const,
        label: "Global Hiring",
        title: "Global Hiring Ready",
        desc: "Hire internationally with consistent workflows and scoring across countries and teams.",
        accent: "#005DDC",
        icon: Globe2,
        proof: "Global pipeline ready",
        bullets: ["International pipeline", "Global coverage flags", "Consistent scoring"],
        cta: "Explore Global",
      },
      {
        key: "profiles" as const,
        label: "Verified Profiles",
        title: "Verified Talent Profiles",
        desc: "Turn CVs into structured profiles with skills, achievements and clean signals employers trust.",
        accent: "#00A35A",
        icon: ShieldCheck,
        proof: "Profile structured",
        bullets: ["CV parsing + enrichment", "Badges & achievements", "ATS-friendly resume"],
        cta: "Explore Profiles",
      },
      {
        key: "matching" as const,
        label: "AI Matching",
        title: "AI Skill Matching",
        desc: "Rank jobs or candidates with explainable compatibility — skills, experience and role needs (not keywords).",
        accent: "#005DDC",
        icon: Sparkles,
        proof: "Explainable fit score",
        bullets: ["Skill-based ranking", "Why this match", "Shortlist faster"],
        cta: "Explore Matching",
      },
      {
        key: "assessments" as const,
        label: "Assessments",
        title: "Skill Verification & Assessments",
        desc: "Real code execution with tests, runtime metrics, and integrity checks — proof that's shareable.",
        accent: "#7C3AED",
        icon: Code2,
        proof: "Execution + integrity",
        bullets: ["Run code (multi-lang)", "Test cases + metrics", "Plagiarism detection"],
        cta: "Explore Assessments",
      },
    ],
    []
  );

  const [active, setActive] = useState<TabKey>("global");
  const [userInteracted, setUserInteracted] = useState(false);
  const current = tabs.find((t) => t.key === active)!;

  // Auto-cycle every 5s unless user clicked a tab
  useEffect(() => {
    if (userInteracted) return;
    const keys: TabKey[] = ["global", "profiles", "matching", "assessments"];
    const interval = setInterval(() => {
      setActive((prev) => {
        const idx = keys.indexOf(prev);
        return keys[(idx + 1) % keys.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [userInteracted]);

  // Resume auto-cycle after 12s of no interaction
  useEffect(() => {
    if (!userInteracted) return;
    const timeout = setTimeout(() => setUserInteracted(false), 12000);
    return () => clearTimeout(timeout);
  }, [userInteracted]);

  const handleTabChange = (key: TabKey) => {
    setActive(key);
    setUserInteracted(true);
  };

  return (
    <section className="relative w-full bg-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[#005DDC] opacity-[0.045] blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#005DDC] opacity-[0.035] blur-3xl" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-9 md:py-11">
        {/* Header — grid aligned with content below */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6 lg:items-end">
          <div className="lg:col-span-5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
              <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
              Hiralent core
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-[#0b1b3a] leading-[1.15]">
              Built for modern hiring - with proof.
            </h2>
            <p className="mt-2 text-sm md:text-base text-[#64748B]">
              Verified profiles, explainable matching, live assessments, and global readiness.
            </p>
          </div>
          <div className="lg:col-span-7">
            <TabRail tabs={tabs} active={active} onChange={handleTabChange} />
          </div>
        </div>

        {/* Content */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
          {/* LEFT */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="lg:col-span-5 rounded-3xl border border-[#E6ECF8] bg-white p-5 md:p-6 shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)]"
            >
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: "#F7FBFF",
                  border: "1px solid rgba(0,93,220,0.16)",
                  color: "#005DDC",
                }}
              >
                <BadgeCheck className="h-4 w-4" />
                {current.proof}
              </div>

              <h3 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight text-[#0b1b3a]">
                {current.title}
              </h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{current.desc}</p>

              <div className="mt-4 space-y-2">
                {current.bullets.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: current.accent, opacity: 0.9 }}
                    />
                    <span className="font-medium text-[#0b1b3a]">{b}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#64748B] border border-[#E6ECF8]">
                  Fair evaluation • Transparent results
                </span>
                <a
                  href="/auth/login"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#005DDC] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition"
                >
                  {current.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* RIGHT */}
          <div className="lg:col-span-7 rounded-3xl border border-[#E6ECF8] bg-gradient-to-br from-[#F8FBFF] to-white shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)] overflow-hidden">
            <div className="relative p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-xs font-semibold text-[#0b1b3a]">
                  Preview
                  <span className="ml-2 font-medium text-[#64748B]">
                    •{" "}
                    {active === "global"
                      ? "Global coverage"
                      : active === "profiles"
                      ? "Profile builder"
                      : active === "matching"
                      ? "Match engine"
                      : "Code runner"}
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-[#22C55E]"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  Live
                </div>
              </div>

              <div className="relative flex items-center justify-center min-h-[300px]">
                <AnimatePresence mode="wait">
                  {active === "global" && (
                    <motion.div
                      key="global"
                      initial={{ opacity: 0, scale: 0.985 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.985 }}
                      transition={{ duration: 0.25 }}
                      className="relative flex items-center justify-center"
                    >
                      <motion.div
                        className="absolute rounded-full border border-[#005DDC]/10"
                        style={{ width: 320, height: 320 }}
                        animate={{ scale: [1, 1.02, 1], opacity: [0.1, 0.15, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute rounded-full border border-dashed border-[#005DDC]/12"
                        style={{ width: 250, height: 250 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="absolute rounded-full border border-[#005DDC]/8"
                        style={{ width: 190, height: 190 }}
                        animate={{ scale: [1, 1.01, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                      <motion.div
                        className="relative z-20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full bg-[#005DDC] blur-2xl"
                          animate={{ opacity: [0.08, 0.14, 0.08] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        <img
                          src={EARTH_SRC}
                          alt="Earth"
                          className="relative h-[230px] w-[230px] md:h-[260px] md:w-[260px] object-contain select-none"
                          draggable={false}
                        />
                      </motion.div>
                      <FlagOrbit />
                    </motion.div>
                  )}

                  {active === "profiles" && <ProfilePreview key="profiles" />}
                  {active === "matching" && <MatchPreview key="matching" />}
                  {active === "assessments" && <AssessmentPreview key="assessments" />}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================
   Tab Rail
============================ */
function TabRail({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: TabKey; label: string; accent: string; icon: any }[];
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === active));

  return (
    <div className="relative w-full">
      <div className="flex w-full items-center gap-1 rounded-2xl border border-[#E6ECF8] bg-white p-1 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.18)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={[
                "relative flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition",
                isActive ? "text-[#0b1b3a]" : "text-[#64748B] hover:text-[#0b1b3a]",
              ].join(" ")}
            >
              <span
                className="h-8 w-8 rounded-xl flex items-center justify-center border flex-shrink-0"
                style={{
                  borderColor: isActive ? `${t.accent}33` : "rgba(230,236,248,1)",
                  backgroundColor: isActive ? `${t.accent}12` : "#F7FBFF",
                  color: t.accent,
                }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline whitespace-nowrap">{t.label}</span>
              {isActive && (
                <span
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border flex items-center justify-center"
                  style={{ borderColor: `${t.accent}40` }}
                >
                  <Check className="h-3 w-3" style={{ color: t.accent }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-[3px] w-full rounded-full bg-[#EAF3FF] border border-[#E6ECF8] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#005DDC]"
          key={active}
          initial={{ width: `${(activeIndex / tabs.length) * 100}%` }}
          animate={{ width: `${((activeIndex + 1) / tabs.length) * 100}%` }}
          transition={{ duration: 5, ease: "linear" }}
        />
      </div>
    </div>
  );
}

/* ============================
   Flag Orbit (Global)
============================ */
function FlagOrbit() {
  const radius = 145;
  return (
    <motion.div
      className="absolute z-10"
      animate={{ rotate: 360 }}
      transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      style={{ width: 0, height: 0 }}
    >
      {FLAG_CODES.map((code, i) => {
        const angle = (i * 360) / FLAG_CODES.length;
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(Math.cos(rad) * radius * 1000) / 1000;
        const y = Math.round(Math.sin(rad) * radius * 1000) / 1000;
        return (
          <motion.div
            key={code}
            className="absolute"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: "translate(-50%, -50%)",
            }}
            animate={{ y: [-3, 3, -3], scale: [1, 1.05, 1] }}
            transition={{ duration: 3.5 + i * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
          >
            <div className="h-8 w-8 rounded-full bg-white border-2 border-white shadow-md overflow-hidden">
              <img src={flagUrls[code]} alt={code} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ============================
   PROFILE PREVIEW — CV to Structured Profile
============================ */
function ProfilePreview() {
  const skills = ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "GraphQL", "Figma"];
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setScanned(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: CV upload / raw */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-3.5 w-3.5 text-[#94A3B8]" />
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
              Uploaded CV
            </span>
          </div>

          {/* Fake CV lines */}
          <div className="space-y-2">
            <div className="h-2.5 w-[70%] rounded bg-[#E2E8F0]" />
            <div className="h-2 w-[90%] rounded bg-[#F1F5F9]" />
            <div className="h-2 w-[60%] rounded bg-[#F1F5F9]" />
            <div className="h-2 w-[80%] rounded bg-[#F1F5F9]" />
            <div className="h-px w-full bg-[#E2E8F0] my-2" />
            <div className="h-2.5 w-[50%] rounded bg-[#E2E8F0]" />
            <div className="h-2 w-[75%] rounded bg-[#F1F5F9]" />
            <div className="h-2 w-[85%] rounded bg-[#F1F5F9]" />
            <div className="h-2 w-[45%] rounded bg-[#F1F5F9]" />
          </div>

          {/* Scan line animation */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-[#00A35A]"
            initial={{ top: "15%", opacity: 0.8 }}
            animate={{ top: ["15%", "90%", "15%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: "0 0 12px 2px rgba(0,163,90,0.3)" }}
          />
        </div>

        {/* Right: Structured profile */}
        <div className="rounded-xl border border-[#00A35A]/20 bg-[#00A35A]/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00A35A]" />
              <span className="text-[10px] font-bold text-[#00A35A] uppercase tracking-wider">
                Structured Profile
              </span>
            </div>
            <motion.div
              className="flex items-center gap-1 rounded-full bg-[#00A35A]/10 px-2 py-0.5"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Check className="h-2.5 w-2.5 text-[#00A35A]" />
              <span className="text-[9px] font-bold text-[#00A35A]">Verified</span>
            </motion.div>
          </div>

          {/* Profile card */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-[#00A35A]/20 flex-shrink-0">
              <img src="/images/avatar-sarah.jpg" alt="Sarah Ahmed" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#0b1b3a]">Sarah Ahmed</p>
              <p className="text-[10px] text-[#64748B]">Full-Stack Developer • 4yr exp</p>
            </div>
          </div>

          {/* Skills extracted */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {skills.map((s, i) => (
              <motion.span
                key={s}
                className="rounded-md bg-white border border-[#E2E8F0] px-2 py-0.5 text-[10px] font-semibold text-[#0b1b3a]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.25, type: "spring" }}
              >
                {s}
              </motion.span>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Skills", val: "24", color: "#00A35A" },
              { label: "Badges", val: "8", color: "#005DDC" },
              { label: "ATS", val: "98%", color: "#7C3AED" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="rounded-lg bg-white border border-[#E2E8F0] p-2 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 + i * 0.12 }}
              >
                <p className="text-[13px] font-extrabold" style={{ color: s.color }}>
                  {s.val}
                </p>
                <p className="text-[9px] text-[#94A3B8]">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom connector arrow */}
      <motion.div
        className="flex items-center justify-center mt-3 gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00A35A]/20 to-transparent" />
        <span className="text-[10px] font-semibold text-[#00A35A] flex items-center gap-1">
          <Zap className="h-3 w-3" /> CV parsed in 2.4s
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00A35A]/20 to-transparent" />
      </motion.div>
    </motion.div>
  );
}

/* ============================
   MATCH PREVIEW — Candidate ↔ Job connection
============================ */
function MatchPreview() {
  const candidates = [
    { name: "Sarah A.", role: "Full-Stack", score: 94, skills: ["React", "Node", "TS"], img: "/images/avatar-sarah.jpg" },
    { name: "James K.", role: "Frontend", score: 87, skills: ["React", "CSS", "Figma"], img: "/images/avatar-james.jpg" },
    { name: "Priya M.", role: "Backend", score: 82, skills: ["Python", "SQL", "Docker"], img: "/images/avatar-priya.jpg" },
  ];

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {/* Job card at top */}
      <motion.div
        className="rounded-xl border border-[#005DDC]/20 bg-[#005DDC]/[0.03] p-3 mb-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#005DDC]/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-[#005DDC]" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#0b1b3a]">Senior Full-Stack Developer</p>
              <p className="text-[10px] text-[#64748B]">Acme Corp • Remote • €80-100k</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#005DDC]/10 px-2.5 py-1">
            <Sparkles className="h-3 w-3 text-[#005DDC]" />
            <span className="text-[10px] font-bold text-[#005DDC]">AI matching</span>
          </div>
        </div>
        <div className="flex gap-1.5 mt-2">
          {["React", "Node.js", "TypeScript", "PostgreSQL"].map((s) => (
            <span key={s} className="rounded bg-white border border-[#E2E8F0] px-1.5 py-0.5 text-[9px] font-medium text-[#475569]">
              {s}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Connection line */}
      <div className="flex justify-center my-1">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <svg width="2" height="16">
            <motion.line
              x1="1" y1="0" x2="1" y2="16"
              stroke="#005DDC"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            />
          </svg>
          <motion.div
            className="h-5 w-5 rounded-full bg-[#005DDC] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </motion.div>
          <svg width="2" height="16">
            <motion.line
              x1="1" y1="0" x2="1" y2="16"
              stroke="#005DDC"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Candidate cards */}
      <div className="space-y-2">
        {candidates.map((c, i) => (
          <motion.div
            key={c.name}
            className="rounded-xl border border-[#E2E8F0] bg-white p-3 hover:border-[#005DDC]/20 transition-colors"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.15, duration: 0.35 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-full overflow-hidden border-2 border-[#E2E8F0] flex-shrink-0"
                >
                  <img src={c.img} alt={c.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#0b1b3a]">{c.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {c.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[9px] font-medium text-[#475569]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score ring + percentage */}
              <div className="flex items-center gap-2">
                <ScoreRing value={c.score} size={32} delay={1.2 + i * 0.15} />
                <div className="text-right">
                  <motion.p
                    className="text-[14px] font-extrabold text-[#005DDC]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 + i * 0.15 }}
                  >
                    {c.score}%
                  </motion.p>
                  <p className="text-[9px] text-[#94A3B8]">fit score</p>
                </div>
              </div>
            </div>

            {/* Fit bar */}
            <div className="mt-2 h-1 rounded-full bg-[#F1F5F9]">
              <motion.div
                className="h-full rounded-full bg-[#005DDC]"
                initial={{ width: 0 }}
                animate={{ width: `${c.score}%` }}
                transition={{ delay: 1.4 + i * 0.15, duration: 0.7, ease: "easeOut" }}
                style={{ opacity: 0.7 }}
              />
            </div>

            {/* Match reason */}
            <motion.div
              className="mt-2 flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 + i * 0.15 }}
            >
              <Check className="h-3 w-3 text-[#00A35A]" />
              <span className="text-[10px] text-[#64748B]">
                {i === 0
                  ? "Strong skill overlap + experience match"
                  : i === 1
                  ? "UI expertise aligns with role needs"
                  : "Backend depth matches stack requirements"}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ScoreRing({ value, size, delay = 0 }: { value: number; size: number; delay?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F5F9" strokeWidth="3" fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#005DDC"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ delay, duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

/* ============================
   ASSESSMENT PREVIEW — Mini terminal
============================ */
function AssessmentPreview() {
  const tests = [
    { name: "basic_pair", pass: true },
    { name: "negative_nums", pass: true },
    { name: "large_array", pass: true },
    { name: "duplicates", pass: true },
    { name: "single_elem", pass: false },
    { name: "zero_target", pass: true },
    { name: "edge_case", pass: true },
  ];

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-xl border border-[#1e2433] bg-[#0d1117] overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#161b22]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[10px] font-mono text-white/35">assessment-runner</span>
          <div className="flex items-center gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-semibold text-white/40">LIVE</span>
          </div>
        </div>

        {/* Code + Challenge in two cols */}
        <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
          {/* Challenge */}
          <div className="p-3">
            <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">
              Challenge
            </span>
            <p className="mt-2 text-[11px] font-semibold text-white/80">
              <span className="text-[#79C0FF] font-mono">twoSum()</span>
            </p>
            <p className="mt-1 text-[10px] text-white/35 leading-relaxed">
              Return indices of two numbers that add up to target.
            </p>
            <div className="mt-2 rounded-md bg-white/[0.03] border border-white/[0.06] p-2 font-mono text-[10px]">
              <span className="text-white/30">→ </span>
              <span className="text-[#7EE787]">[0, 1]</span>
            </div>
          </div>

          {/* Code */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">
                Solution
              </span>
              <span className="text-[9px] font-mono text-white/25">py</span>
            </div>
            <pre className="mt-2 text-[10px] leading-[1.6] font-mono">
              <span className="text-[#FF7B72]">def</span>{" "}
              <span className="text-[#D2A8FF]">twoSum</span>
              <span className="text-white/50">(n, t):</span>
              {"\n"}
              <span className="text-white/35">{"  "}s = {"{}"}</span>
              {"\n"}
              <span className="text-[#FF7B72]">{"  "}for</span>{" "}
              <span className="text-white/50">i,v</span>{" "}
              <span className="text-[#FF7B72]">in</span>{" "}
              <span className="text-[#D2A8FF]">enumerate</span>
              <span className="text-white/50">(n):</span>
              {"\n"}
              <span className="text-[#FF7B72]">{"    "}if</span>{" "}
              <span className="text-white/50">t-v</span>{" "}
              <span className="text-[#FF7B72]">in</span>{" "}
              <span className="text-white/50">s:</span>
              {"\n"}
              <span className="text-[#FF7B72]">{"      "}return</span>{" "}
              <span className="text-white/50">[s[t-v],i]</span>
              {"\n"}
              <span className="text-white/35">{"    "}s[v]=i</span>
            </pre>
          </div>
        </div>

        {/* Test results */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">
              Tests
            </span>
            <motion.span
              className="text-[9px] font-bold text-[#22C55E]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
            >
              6/7 PASSED
            </motion.span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {tests.map((t, i) => (
              <motion.div
                key={t.name}
                className="flex items-center gap-2 rounded-md px-2 py-1"
                style={{
                  backgroundColor: t.pass ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                }}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.25 }}
              >
                {t.pass ? (
                  <Check className="h-2.5 w-2.5 text-[#22C55E] flex-shrink-0" />
                ) : (
                  <X className="h-2.5 w-2.5 text-[#EF4444] flex-shrink-0" />
                )}
                <span className="text-[9px] font-mono text-white/50 truncate">{t.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Metrics bar */}
        <div className="border-t border-white/[0.06] px-3 py-2 flex items-center gap-3 bg-[#161b22]">
          <TermMetric icon={Timer} label="Runtime" value="142ms" />
          <div className="h-3 w-px bg-white/[0.06]" />
          <TermMetric icon={Cpu} label="Memory" value="38MB" />
          <div className="h-3 w-px bg-white/[0.06]" />
          <TermMetric icon={Shield} label="Plagiarism" value="6%" />
          <motion.div
            className="ml-auto rounded-md bg-[#7C3AED] px-2.5 py-1 text-[9px] font-bold text-white"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Submit
          </motion.div>
        </div>
      </div>

      {/* Floating score */}
      <motion.div
        className="flex items-center justify-between mt-3 rounded-lg border border-[#E2E8F0] bg-white p-2.5"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
            <span className="text-[11px] font-extrabold text-[#7C3AED]">86</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#0b1b3a]">Skill Score</p>
            <p className="text-[9px] text-[#94A3B8]">Top 15% of candidates</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-semibold text-[#00A35A]">
          <Check className="h-3 w-3" />
          Shareable report
        </div>
      </motion.div>
    </motion.div>
  );
}

function TermMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-white/25" strokeWidth={1.5} />
      <div>
        <p className="text-[8px] text-white/25 leading-none">{label}</p>
        <p className="text-[10px] font-semibold text-white/60 leading-tight">{value}</p>
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ArrowRight,
  Check,
  Star,
  Code2,
  Sparkles,
  Shield,
  Zap,
  FileText,
  Cpu,
  User,
  Briefcase,
} from "lucide-react";
import Link from "next/link";

/* ═══════════════════════════════════════════
   Blog data
═══════════════════════════════════════════ */
const blogPosts = [
  {
    id: 1,
    scene: "matching" as const,
    title: "How AI Matching Actually Works at Hiralent",
    author: "Hiralent Team",
    date: "Feb 2026",
    readTime: "5 min",
    tags: ["AI", "Matching"],
    accent: "#005DDC",
    description:
      "We don't match on keywords. Here's how Hiralent scores candidates on real skills, experience depth, and role fit — with full transparency.",
  },
  {
    id: 2,
    scene: "profile" as const,
    title: "Build a Profile That Employers Actually Trust",
    author: "Hiralent Team",
    date: "Jan 2026",
    readTime: "4 min",
    tags: ["Profile", "Tips"],
    accent: "#00A35A",
    description:
      "Your CV is a PDF. Your Hiralent profile is a verified, structured signal. Learn how to go from uploaded resume to 90+ profile score.",
  },
  {
    id: 3,
    scene: "assessment" as const,
    title: "What to Expect in a Hiralent Assessment",
    author: "Hiralent Team",
    date: "Jan 2026",
    readTime: "6 min",
    tags: ["Assessment", "Guide"],
    accent: "#7C3AED",
    description:
      "Real code. Real time. Real feedback. Here's how our skill assessments work, what we measure, and how to prepare.",
  },
];

/* ═══════════════════════════════════════════
   Variants
═══════════════════════════════════════════ */
const headingVariants: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
const BlogSection = () => {
  return (
    <div className="relative w-full flex justify-center items-center bg-white py-16 md:py-20 overflow-hidden">
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.05] blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.035] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F7FBFF] to-transparent" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl flex flex-col justify-center items-center gap-10 md:gap-12">
        {/* Header */}
        <motion.div
          className="flex flex-col justify-center items-center gap-4 text-center"
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
            <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
            Blog & Insights
          </div>

          <h2 className="text-[#0b1b3a] text-2xl lg:text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.15]">
            Latest Career{" "}
            <span className="text-[#005DDC] relative inline-block">
              Insights
              <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#005DDC]/20 rounded-full" />
            </span>
          </h2>

          <motion.p
            className="text-[#64748B] text-sm lg:text-base max-w-2xl leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            No fluff. Practical guides on profiles, matching, and assessments —
            written by the team building the platform.
          </motion.p>
        </motion.div>

        {/* Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {blogPosts.map((post, index) => (
            <motion.div
              key={post.id}
              className="group bg-white rounded-3xl border border-[#E6ECF8] shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)] overflow-hidden cursor-pointer hover:shadow-[0_22px_55px_-38px_rgba(0,0,0,0.28)] transition-shadow duration-300"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
            >
              {/* Animated scene */}
              <div className="relative w-full h-52 overflow-hidden select-none">
                {post.scene === "matching" && <SceneMatching />}
                {post.scene === "profile" && <SceneProfile />}
                {post.scene === "assessment" && <SceneAssessment />}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-[#E6ECF8]" />
              </div>

              {/* Content */}
              <div className="p-5 md:p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                      style={{
                        color: post.accent,
                        borderColor: `${post.accent}22`,
                        backgroundColor: `${post.accent}08`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="text-[#0b1b3a] text-[17px] font-semibold leading-snug group-hover:text-[#005DDC] transition-colors duration-300">
                  {post.title}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold text-[#94A3B8]">
                  <span className="text-[#64748B]">{post.author}</span>
                  <span className="text-[#CBD5E1]">·</span>
                  <span>{post.date}</span>
                  <span className="text-[#CBD5E1]">·</span>
                  <span>{post.readTime}</span>
                </div>

                <p className="text-[#64748B] text-[13px] leading-relaxed line-clamp-3">
                  {post.description}
                </p>

                <Link href={`/blog/${post.id}`} className="inline-flex">
                  <motion.div
                    className="text-[#005DDC] text-sm font-semibold inline-flex items-center gap-2"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    Read More
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#E6ECF8] bg-[#F7FBFF]">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </motion.div>
                </Link>


              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-2"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.45 }}
        >
          <motion.button
            className="inline-flex items-center gap-2 rounded-2xl bg-[#005DDC] text-white font-semibold py-3.5 px-6 shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View All Posts
            <ArrowRight className="h-4 w-4" />
          </motion.button>
          <div className="text-[11px] text-[#94A3B8] mt-2 font-semibold">
            Fresh updates weekly
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BlogSection;

/* ═══════════════════════════════════════════════════════════════
   SCENE 1 — AI MATCHING
   Skill nodes → match beams → job card with circular score
═══════════════════════════════════════════════════════════════ */
function SceneMatching() {
  const skills = [
    { label: "React", score: 92, y: 28 },
    { label: "Node.js", score: 88, y: 68 },
    { label: "TypeScript", score: 95, y: 108 },
    { label: "PostgreSQL", score: 78, y: 148 },
  ];

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#F8FBFF] via-[#EEF4FF] to-[#F0F4FF]">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #005DDC 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Pulsing rings */}
      {[80, 56, 34].map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-[#005DDC]"
          style={{
            width: size,
            height: size,
            right: 108 - size / 2,
            top: "50%",
            marginTop: -size / 2,
          }}
          animate={{ opacity: [0.06, 0.18, 0.06], scale: [1, 1.04, 1] }}
          transition={{
            duration: 2.5,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Skill nodes */}
      {skills.map((s, i) => (
        <motion.div
          key={s.label}
          className="absolute flex items-center gap-2"
          style={{ left: 14, top: s.y }}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 + i * 0.09, duration: 0.35 }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#005DDC] ring-[3px] ring-[#005DDC]/10 flex-shrink-0" />
          <span className="rounded-lg bg-white border border-[#E6ECF8] px-2 py-[3px] text-[10px] font-bold text-[#0b1b3a] shadow-sm whitespace-nowrap">
            {s.label}
          </span>
          <div className="w-8 h-[3px] rounded-full bg-[#E6ECF8] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#005DDC]"
              initial={{ width: 0 }}
              whileInView={{ width: `${s.score}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
            />
          </div>
        </motion.div>
      ))}

      {/* Beams */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {skills.map((s, i) => (
          <motion.line
            key={i}
            x1={125}
            y1={s.y + 10}
            x2={225}
            y2={105}
            stroke="#005DDC"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            initial={{ strokeOpacity: 0 }}
            whileInView={{ strokeOpacity: 0.2 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
          />
        ))}
      </svg>

      {/* Job card */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 w-[130px] rounded-2xl border border-[#E6ECF8] bg-white p-3 shadow-[0_8px_28px_-10px_rgba(0,0,0,0.1)]"
        style={{ zIndex: 2 }}
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-[#005DDC]/10 flex items-center justify-center">
            <Briefcase className="h-3.5 w-3.5 text-[#005DDC]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#0b1b3a] leading-tight">
              Full-Stack Dev
            </div>
            <div className="text-[8px] text-[#94A3B8]">Remote · $120k</div>
          </div>
        </div>

        <div className="rounded-xl bg-[#005DDC]/[0.05] border border-[#005DDC]/10 p-2.5 flex items-center justify-center gap-3">
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#E6ECF8" strokeWidth="3" />
              <motion.circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#005DDC"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="94.25"
                strokeDashoffset="94.25"
                whileInView={{ strokeDashoffset: 94.25 * (1 - 0.94) }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-[#005DDC]">
              94
            </span>
          </div>
          <div>
            <div className="text-[9px] font-bold text-[#005DDC]">Match</div>
            <div className="text-[8px] text-[#94A3B8]">Top 5%</div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1">
          <Check className="h-3 w-3 text-[#00A35A]" />
          <span className="text-[8px] font-semibold text-[#64748B]">
            Skills verified
          </span>
        </div>
      </motion.div>

      <motion.div
        className="absolute top-5 left-1/2"
        style={{ zIndex: 3 }}
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.1, type: "spring", stiffness: 300 }}
      >
        <Sparkles className="h-4 w-4 text-[#005DDC]/30" />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 2 — PROFILE BUILDER
   CV → extraction animation → structured profile card
═══════════════════════════════════════════════════════════════ */
function SceneProfile() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const extractedSkills = ["React", "TS", "Next.js", "Node", "Prisma", "PG"];

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#F6FFF6] via-[#F0FBF0] to-[#F7FBFF]">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#00A35A 0.8px, transparent 0.8px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* CV (left) */}
      <motion.div
        className="absolute left-4 top-1/2 -translate-y-1/2 w-[85px]"
        initial={{ opacity: 0, x: -14 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="rounded-xl border border-[#E6ECF8] bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3 w-3 text-[#94A3B8]" />
            <span className="text-[8px] font-bold text-[#0b1b3a]">Resume.pdf</span>
          </div>
          {[100, 80, 95, 60, 85, 70].map((w, i) => (
            <motion.div
              key={i}
              className="h-[2.5px] rounded-full bg-[#E2E8F0] mb-[4px]"
              style={{ width: `${w}%` }}
              animate={phase >= 1 ? { backgroundColor: "#00A35A", opacity: [0.3, 0.15] } : {}}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            />
          ))}
        </div>

        <AnimatePresence>
          {phase === 1 && (
            <motion.div
              className="mt-2 rounded-full bg-[#00A35A] px-2 py-0.5 text-[8px] font-bold text-white text-center flex items-center justify-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Cpu className="h-2.5 w-2.5 animate-spin" />
              Parsing…
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Flowing dots */}
      <motion.div
        className="absolute left-[102px] top-1/2 -translate-y-1/2 flex items-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1 w-1 rounded-full bg-[#00A35A] mx-[2px]"
            animate={{ opacity: [0.2, 0.8, 0.2], x: [0, 6, 0] }}
            transition={{
              duration: 1.2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        <ArrowRight className="h-3 w-3 text-[#00A35A]/40 ml-1" />
      </motion.div>

      {/* Profile card (right) */}
      <motion.div
        className="absolute right-3 top-1/2 -translate-y-1/2 w-[165px] rounded-2xl border border-[#E6ECF8] bg-white p-3.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.1)]"
        initial={{ opacity: 0, x: 16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#00A35A]/20 to-[#00A35A]/5 flex items-center justify-center border border-[#00A35A]/15">
            <User className="h-4 w-4 text-[#00A35A]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#0b1b3a]">Sarah K.</div>
            <div className="text-[9px] text-[#94A3B8]">Full-Stack Dev</div>
          </div>
        </div>

        <div className="rounded-lg bg-[#F7FBF7] border border-[#E6F0E6] p-2 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-semibold text-[#64748B]">
              Profile strength
            </span>
            <motion.span
              className="text-[11px] font-extrabold text-[#00A35A]"
              initial={{ opacity: 0 }}
              animate={phase >= 1 ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
            >
              {phase >= 2 ? "92" : phase >= 1 ? "…" : "—"}
            </motion.span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#E6ECF8] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#00A35A]"
              initial={{ width: "0%" }}
              animate={phase >= 2 ? { width: "92%" } : { width: "0%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {extractedSkills.map((s, i) => (
            <motion.span
              key={s}
              className="px-1.5 py-[2px] rounded text-[8px] font-bold bg-[#F7FBFF] border border-[#E6ECF8] text-[#0b1b3a]"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5 + i * 0.07, type: "spring", stiffness: 300 }}
            >
              {s}
            </motion.span>
          ))}
        </div>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="absolute -top-2.5 -right-2.5 h-7 w-7 rounded-full bg-[#00A35A] flex items-center justify-center shadow-[0_4px_14px_rgba(0,163,90,0.35)]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
            >
              <Shield className="h-3.5 w-3.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0b1b3a]/80 backdrop-blur px-3 py-1 text-[10px] font-bold text-white flex items-center gap-1.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <Zap className="h-3 w-3 text-[#00A35A]" />
            24 skills extracted
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 3 — LIVE ASSESSMENT
   Dark terminal with typing code → results appear
═══════════════════════════════════════════════════════════════ */
function SceneAssessment() {
  const [lineIndex, setLineIndex] = useState(0);

  const lines = [
    { text: "function solve(arr: number[]) {", color: "#C084FC" },
    { text: "  const freq = new Map();", color: "#94A3B8" },
    { text: "  for (const n of arr) {", color: "#94A3B8" },
    { text: "    freq.set(n, (freq.get(n)||0)+1);", color: "#94A3B8" },
    { text: "  }", color: "#94A3B8" },
    { text: "  return [...freq.entries()]", color: "#38BDF8" },
    { text: "    .sort((a,b) => b[1]-a[1]);", color: "#38BDF8" },
    { text: "}", color: "#C084FC" },
  ];

  useEffect(() => {
    if (lineIndex >= lines.length) return;
    const t = setTimeout(
      () => setLineIndex((p) => p + 1),
      200 + Math.random() * 120
    );
    return () => clearTimeout(t);
  }, [lineIndex, lines.length]);

  const done = lineIndex >= lines.length;

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#FAF5FF] via-[#F5F0FF] to-[#F7FBFF]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Terminal */}
      <motion.div
        className="absolute left-3 right-3 top-3 bottom-10 rounded-xl border border-[#E6ECF8] bg-[#0C0F1A] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]/80" />
            <span className="h-2 w-2 rounded-full bg-[#FFBD2E]/80" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]/80" />
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <Code2 className="h-3 w-3 text-white/20" />
            <span className="text-[9px] text-white/30 font-mono">assessment.ts</span>
          </div>
          <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.06]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
            <span className="text-[9px] font-mono text-white/40">
              {done ? "02:18" : "live"}
            </span>
          </div>
        </div>

        <div className="flex-1 px-3 py-2 font-mono text-[10px] leading-[1.8] overflow-hidden">
          {lines.slice(0, lineIndex).map((line, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
            >
              <span className="text-white/10 w-3 text-right select-none text-[9px]">
                {i + 1}
              </span>
              <span style={{ color: line.color }}>{line.text}</span>
            </motion.div>
          ))}
          {!done && (
            <motion.span
              className="inline-block w-[5px] h-3 bg-[#7C3AED] ml-5 rounded-[1px]"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.55, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {done && (
          <motion.div
            className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <div className="rounded-xl border border-[#E6ECF8] bg-white px-3 py-1.5 shadow-sm flex items-center gap-2.5">
              <div className="flex gap-[3px]">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.div
                    key={n}
                    className={`h-2 w-2 rounded-full ${
                      n <= 4 ? "bg-[#00A35A]" : "bg-[#E6ECF8]"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + n * 0.06 }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-[#0b1b3a]">4/5 passed</span>
              <span className="text-[9px] text-[#94A3B8]">· 138ms</span>
            </div>

            <motion.div
              className="rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(124,58,237,0.2)]"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            >
              <Star className="h-3 w-3 text-white" fill="white" />
              <span className="text-[11px] font-extrabold text-white">86</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
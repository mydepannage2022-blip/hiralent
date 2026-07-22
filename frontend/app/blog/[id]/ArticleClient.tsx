"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Copy,
  Check,
  Share2,
  Sparkles,
  Shield,
  Target,
  Briefcase,
  Code2,
  Star,
  FileText,
  User,
  Zap,
  CheckCircle2,
  BarChart3,
  GitBranch,
  Layers,
  Eye,
  Timer,
  Award,
  Lightbulb,
  TrendingUp,
  Bookmark,
  Hash,
  ChevronUp,
} from "lucide-react";
import type { Article } from "./types";

/* ═══════════════════════════════════════════
   MAIN CLIENT
═══════════════════════════════════════════ */
export default function ArticleClient({ article }: { article: Article }) {
  const pathname = usePathname() ?? "";
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState(article.sections[0]?.id ?? "");
  const [showBackToTop, setShowBackToTop] = useState(false);

  const ids = useMemo(
    () => article.sections.map((s) => s.id),
    [article.sections]
  );

  /* scroll progress + back-to-top */
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const h = doc.scrollHeight - doc.clientHeight;
      const p = h > 0 ? doc.scrollTop / h : 0;
      setProgress(Math.max(0, Math.min(1, p)));
      setShowBackToTop(doc.scrollTop > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* TOC observer */
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0]?.target?.id) setActiveId(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0.05, 0.1, 0.2, 0.5] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathname}`
      : pathname;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [fullUrl]);

  const shareX = () =>
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(article.title)}`,
      "_blank"
    );
  const shareLinkedIn = () =>
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
      "_blank"
    );

  const accentFaint = `${article.accent}08`;
  const accentLight = `${article.accent}15`;

  return (
    <main className="relative w-full bg-[#FAFCFF] overflow-hidden min-h-screen">
      {/* ═══ Progress bar ═══ */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px]">
        <motion.div
          className="h-full origin-left"
          style={{
            scaleX: progress,
            backgroundColor: article.accent,
            boxShadow: `0 0 20px ${article.accent}44`,
          }}
        />
      </div>

      {/* ═══ Floating back-to-top ═══ */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-xl bg-white border border-[#E6ECF8] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] flex items-center justify-center hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.15)] transition-shadow"
          >
            <ChevronUp className="h-4 w-4 text-[#64748B]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══ Bg glows ═══ */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-28 -left-24 h-96 w-96 rounded-full opacity-[0.06] blur-[100px]"
          style={{ backgroundColor: article.accent }}
        />
        <div
          className="absolute -bottom-28 -right-24 h-[28rem] w-[28rem] rounded-full opacity-[0.04] blur-[100px]"
          style={{ backgroundColor: article.accent }}
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-6xl py-12 md:py-16">
        {/* ═══ Top bar ═══ */}
        <motion.div
          className="flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6ECF8] bg-white px-3 py-2 text-[13px] font-semibold text-[#64748B] hover:text-[#0b1b3a] hover:shadow-sm transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Blog
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6ECF8] bg-white px-3 py-2 text-[12px] font-semibold text-[#64748B] hover:text-[#0b1b3a] hover:shadow-sm transition-all"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#00A35A]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={shareX}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6ECF8] bg-white px-3 py-2 text-[12px] font-semibold text-[#64748B] hover:text-[#0b1b3a] hover:shadow-sm transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />X
              </button>
              <button
                onClick={shareLinkedIn}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6ECF8] bg-white px-3 py-2 text-[12px] font-semibold text-[#64748B] hover:text-[#0b1b3a] hover:shadow-sm transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                LinkedIn
              </button>
            </div>
          </div>
        </motion.div>

        {/* ═══════════ HERO ═══════════ */}
        <header className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold"
                style={{
                  borderColor: `${article.accent}25`,
                  backgroundColor: accentFaint,
                  color: article.accent,
                }}
              >
                <Hash className="h-3 w-3" />
                Hiralent Insights
              </div>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#94A3B8]">
                <span className="text-[#64748B]">{article.author}</span>
                <span className="text-[#CBD5E1]">·</span>
                <span>{article.date}</span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {article.readTime}
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="mt-5 text-[2rem] md:text-[2.5rem] lg:text-[2.8rem] font-bold tracking-tight text-[#0b1b3a] leading-[1.08]">
              {article.title}
            </h1>

            <p className="mt-4 text-[#64748B] text-[15px] md:text-base leading-relaxed max-w-xl">
              {article.subtitle}
            </p>

            {/* Accent line */}
            <div className="mt-6 flex items-center gap-3">
              <div
                className="h-1.5 w-20 rounded-full"
                style={{ backgroundColor: article.accent }}
              />
              <div
                className="h-1.5 w-6 rounded-full opacity-30"
                style={{ backgroundColor: article.accent }}
              />
              <div
                className="h-1.5 w-3 rounded-full opacity-15"
                style={{ backgroundColor: article.accent }}
              />
            </div>

            {/* Takeaways card */}
            <motion.div
              className="mt-8 rounded-2xl border border-[#E6ECF8] bg-white p-5 shadow-[0_18px_50px_-44px_rgba(0,0,0,0.15)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: accentFaint }}
                >
                  <Lightbulb
                    className="h-3.5 w-3.5"
                    style={{ color: article.accent }}
                  />
                </div>
                <span className="text-[12px] font-extrabold text-[#0b1b3a] uppercase tracking-wider">
                  Key Takeaways
                </span>
              </div>
              <ul className="space-y-3">
                {article.takeaways.map((t, i) => (
                  <motion.li
                    key={t}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                  >
                    <CheckCircle2
                      className="h-4 w-4 flex-shrink-0 mt-0.5"
                      style={{ color: article.accent }}
                    />
                    <span className="text-[13px] text-[#475569] leading-relaxed">
                      {t}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Cover */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="overflow-hidden rounded-[20px] border border-[#E6ECF8] bg-white shadow-[0_26px_70px_-45px_rgba(0,0,0,0.22)]">
              <div className="h-[260px] md:h-[380px] relative">
                <AnimatedCover
                  scene={article.coverScene}
                  accent={article.accent}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] px-1">
              <span>
                {article.title.split(" ").slice(0, 4).join(" ")}…
              </span>
              <span style={{ color: article.accent }}>Hiralent Insights</span>
            </div>
          </motion.div>
        </header>

        {/* ═══════════ CONTENT + TOC ═══════════ */}
        <section className="mt-14 grid gap-10 lg:grid-cols-[0.3fr_0.7fr]">
          {/* TOC */}
          <aside className="lg:sticky lg:top-8 h-fit space-y-4">
            <div className="rounded-2xl border border-[#E6ECF8] bg-white p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.06)]">
              <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-[0.08em] mb-4">
                Contents
              </div>
              <div className="space-y-0.5">
                {article.sections.map((s, idx) => {
                  const active = s.id === activeId;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                        active
                          ? "text-[#0b1b3a] bg-[#F7FBFF] border border-[#E6ECF8]"
                          : "text-[#94A3B8] hover:text-[#64748B] hover:bg-[#FAFCFF] border border-transparent"
                      }`}
                      style={
                        active
                          ? {
                              boxShadow: `0 8px 25px -20px ${article.accent}55`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="h-5 w-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-all"
                        style={
                          active
                            ? {
                                backgroundColor: `${article.accent}12`,
                                color: article.accent,
                              }
                            : { backgroundColor: "#F1F5F9", color: "#CBD5E1" }
                        }
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate">{s.title}</span>
                    </a>
                  );
                })}
              </div>

              {/* Reading progress mini */}
              <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-[#94A3B8]">
                    Reading progress
                  </span>
                  <span
                    className="text-[10px] font-extrabold"
                    style={{ color: article.accent }}
                  >
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: article.accent,
                      width: `${progress * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* About */}
            <div className="rounded-2xl border border-[#E6ECF8] bg-white p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-2">
                <Bookmark
                  className="h-3.5 w-3.5"
                  style={{ color: article.accent }}
                />
                <span className="text-[11px] font-extrabold text-[#0b1b3a]">
                  About this series
                </span>
              </div>
              <p className="text-[13px] text-[#64748B] leading-relaxed">
                Practical guides from the Hiralent team — copy the ideas
                straight into your workflow.
              </p>
            </div>
          </aside>

          {/* Article body */}
          <article className="max-w-none min-w-0">
            <div className="space-y-16">
              {article.sections.map((sec, secIdx) => (
                <motion.section
                  key={sec.id}
                  id={sec.id}
                  className="scroll-mt-24"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.45 }}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-5">
                    <span
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
                      style={{
                        backgroundColor: `${article.accent}10`,
                        color: article.accent,
                      }}
                    >
                      {secIdx + 1}
                    </span>
                    <h2 className="text-[#0b1b3a] text-[1.55rem] md:text-[1.7rem] font-bold tracking-tight leading-snug">
                      {sec.title}
                    </h2>
                  </div>

                  {/* Section divider line */}
                  <div className="flex items-center gap-2 mb-6">
                    <div
                      className="h-[2px] w-12 rounded-full"
                      style={{ backgroundColor: article.accent, opacity: 0.3 }}
                    />
                    <div
                      className="h-[2px] w-4 rounded-full"
                      style={{ backgroundColor: article.accent, opacity: 0.12 }}
                    />
                  </div>

                  <div className="space-y-6 text-[#475569] text-[15px] md:text-[16px] leading-[1.8]">
                    {sec.blocks.map((b, i) => {
                      if (b.type === "p")
                        return (
                          <p key={i} className="max-w-[65ch]">
                            {b.text}
                          </p>
                        );
                      if (b.type === "h3")
                        return (
                          <h3
                            key={i}
                            className="text-[#0b1b3a] text-lg font-semibold pt-3"
                          >
                            {b.text}
                          </h3>
                        );
                      if (b.type === "callout")
                        return (
                          <Callout
                            key={i}
                            accent={article.accent}
                            title={b.title}
                            text={b.text}
                          />
                        );
                      if (b.type === "quote")
                        return (
                          <PullQuote
                            key={i}
                            accent={article.accent}
                            quote={b.quote}
                            by={b.by}
                          />
                        );
                      if (b.type === "code")
                        return (
                          <CodeBlock
                            key={i}
                            accent={article.accent}
                            title={b.title}
                            code={b.code}
                          />
                        );
                      if (b.type === "figure")
                        return (
                          <AnimatedFigure
                            key={i}
                            accent={article.accent}
                            label={b.label}
                            caption={b.caption}
                            scene={b.scene}
                          />
                        );
                      if (b.type === "list")
                        return (
                          <ul key={i} className="space-y-3 pl-1">
                            {b.items.map((it) => (
                              <li
                                key={it}
                                className="flex items-start gap-3"
                              >
                                <span
                                  className="mt-[9px] h-1.5 w-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: article.accent,
                                  }}
                                />
                                <span className="max-w-[60ch]">{it}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      return null;
                    })}
                  </div>
                </motion.section>
              ))}
            </div>
          </article>
        </section>

        {/* ═══ Prev / Next ═══ */}
        <div className="mt-20 pt-10 border-t border-[#E6ECF8] grid gap-4 md:grid-cols-2">
          <NavCard
            dir="prev"
            href={`/blog/${article.prev.id}`}
            title={article.prev.title}
            accent={article.prev.accent}
          />
          <NavCard
            dir="next"
            href={`/blog/${article.next.id}`}
            title={article.next.title}
            accent={article.next.accent}
          />
        </div>

        <div className="mt-10 text-center text-[11px] font-semibold text-[#94A3B8]">
          © 2026 Hiralent — Insights that feel like mentorship.
        </div>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COVER SCENES
═══════════════════════════════════════════════════════════════ */
function AnimatedCover({
  scene,
  accent,
}: {
  scene: string;
  accent: string;
}) {
  if (scene === "matching-hero") return <CoverMatching accent={accent} />;
  if (scene === "profile-hero") return <CoverProfile accent={accent} />;
  if (scene === "assessment-hero") return <CoverAssessment accent={accent} />;
  return <CoverGeneric accent={accent} />;
}

/* --- Cover: Matching --- */
function CoverMatching({ accent }: { accent: string }) {
  const skills = [
    { label: "React", x: "10%", y: "15%" },
    { label: "Node.js", x: "6%", y: "48%" },
    { label: "TypeScript", x: "12%", y: "78%" },
    { label: "PostgreSQL", x: "36%", y: "12%" },
    { label: "Docker", x: "32%", y: "84%" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-[#EEF4FF] to-white">
      <BgDots color={accent} />
      {skills.map((s, i) => (
        <motion.div
          key={s.label}
          className="absolute"
          style={{ left: s.x, top: s.y }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 200 }}
        >
          <motion.div
            className="rounded-xl bg-white border border-[#E6ECF8] px-3 py-1.5 text-[11px] font-bold text-[#0b1b3a] shadow-sm"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: accent }} />
            {s.label}
          </motion.div>
        </motion.div>
      ))}

      {/* Central ring */}
      <motion.div
        className="absolute right-[10%] top-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
      >
        <div className="h-36 w-36 rounded-full border-[3px] border-[#E6ECF8] bg-white shadow-[0_16px_48px_-16px_rgba(0,0,0,0.1)] flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="text-4xl font-extrabold"
              style={{ color: accent }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
            >
              94%
            </motion.div>
            <div className="text-[10px] font-bold text-[#94A3B8] mt-1 tracking-wide">
              MATCH SCORE
            </div>
          </div>
        </div>
        {/* Pulse rings */}
        {[1, 2, 3].map((r) => (
          <motion.div
            key={r}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: accent }}
            animate={{ scale: [1, 1.15 + r * 0.08], opacity: [0.15, 0] }}
            transition={{ duration: 2, delay: r * 0.4, repeat: Infinity }}
          />
        ))}
      </motion.div>

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {skills.map((s, i) => (
          <motion.line
            key={i}
            x1="50%"
            y1="50%"
            x2={s.x}
            y2={s.y}
            stroke={accent}
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ strokeOpacity: 0 }}
            animate={{ strokeOpacity: 0.12 }}
            transition={{ delay: 0.7 + i * 0.05 }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute top-5 right-5"
        initial={{ opacity: 0, rotate: -30 }}
        animate={{ opacity: 0.35, rotate: 0 }}
        transition={{ delay: 1.2 }}
      >
        <Sparkles className="h-5 w-5" style={{ color: accent }} />
      </motion.div>
    </div>
  );
}

/* --- Cover: Profile --- */
function CoverProfile({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#F6FFF6] via-[#F0FBF0] to-white">
      <BgDots color={accent} />

      {/* CV */}
      <motion.div
        className="absolute left-[7%] top-1/2 -translate-y-1/2 w-[110px] md:w-[130px]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="rounded-2xl border border-[#E6ECF8] bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-[#94A3B8]" />
            <span className="text-[10px] font-bold text-[#0b1b3a]">Resume.pdf</span>
          </div>
          {[90, 70, 100, 55, 80, 65, 95].map((w, i) => (
            <motion.div
              key={i}
              className="h-[3px] rounded-full mb-[5px]"
              style={{ width: `${w}%`, backgroundColor: phase >= 1 ? accent : "#E2E8F0" }}
              animate={phase >= 1 ? { opacity: [0.4, 0.15] } : {}}
              transition={{ delay: i * 0.04, duration: 0.5 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Arrow particles */}
      <div className="absolute left-[36%] md:left-[38%] top-1/2 -translate-y-1/2 flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent }}
            animate={{ opacity: [0.15, 0.6, 0.15], x: [0, 8, 0] }}
            transition={{ duration: 1.4, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
        <ArrowRight className="h-4 w-4 ml-1" style={{ color: `${accent}55` }} />
      </div>

      {/* Profile card */}
      <motion.div
        className="absolute right-[5%] top-1/2 -translate-y-1/2 w-[190px] md:w-[210px] rounded-2xl border border-[#E6ECF8] bg-white p-4 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.1)]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: `${accent}10`, borderColor: `${accent}20` }}
          >
            <User className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#0b1b3a]">Sarah K.</div>
            <div className="text-[10px] text-[#94A3B8]">Full-Stack Developer</div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E6ECF8] bg-[#F7FBFF] p-2.5 mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-semibold text-[#64748B]">Profile strength</span>
            <motion.span className="text-[12px] font-extrabold" style={{ color: accent }} initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : {}}>
              {phase >= 2 ? "92" : "—"}
            </motion.span>
          </div>
          <div className="h-2 rounded-full bg-[#E6ECF8] overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: accent }} initial={{ width: "0%" }} animate={phase >= 2 ? { width: "92%" } : { width: "0%" }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["React", "TypeScript", "Node.js", "Next.js", "Prisma"].map((s, i) => (
            <motion.span
              key={s}
              className="px-2 py-0.5 rounded-md text-[9px] font-bold border"
              style={{ borderColor: `${accent}20`, backgroundColor: `${accent}06`, color: "#0b1b3a" }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}
            >
              {s}
            </motion.span>
          ))}
        </div>
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="absolute -top-2 -right-2 h-7 w-7 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: accent }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Shield className="h-3.5 w-3.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* --- Cover: Assessment --- */
function CoverAssessment({ accent }: { accent: string }) {
  const [lineIdx, setLineIdx] = useState(0);
  const lines = [
    { text: "function findPairs(arr, target) {", c: "#C084FC" },
    { text: "  const seen = new Set();", c: "#94A3B8" },
    { text: "  const pairs = [];", c: "#94A3B8" },
    { text: "  for (const n of arr) {", c: "#94A3B8" },
    { text: "    if (seen.has(target - n))", c: "#38BDF8" },
    { text: "      pairs.push([target-n, n]);", c: "#38BDF8" },
    { text: "    seen.add(n);", c: "#94A3B8" },
    { text: "  }", c: "#94A3B8" },
    { text: "  return pairs;", c: "#C084FC" },
    { text: "}", c: "#C084FC" },
  ];

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const t = setTimeout(() => setLineIdx((p) => p + 1), 180 + Math.random() * 100);
    return () => clearTimeout(t);
  }, [lineIdx, lines.length]);

  const done = lineIdx >= lines.length;

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#FAF5FF] via-[#F5F0FF] to-white">
      <BgGrid color={accent} />

      <motion.div
        className="absolute inset-4 md:inset-6 rounded-2xl border border-[#1a1d2e] bg-[#0C0F1A] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" />
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Code2 className="h-3.5 w-3.5 text-white/20" />
            <span className="text-[10px] text-white/30 font-mono">assessment.ts</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.06]">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
            <span className="text-[10px] font-mono text-white/40">{done ? "03:42" : "live"}</span>
          </div>
        </div>

        <div className="flex-1 px-4 py-3 font-mono text-[11px] leading-[1.9] overflow-hidden">
          {lines.slice(0, lineIdx).map((line, i) => (
            <motion.div key={i} className="flex items-center gap-3" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              <span className="text-white/10 w-4 text-right select-none text-[10px]">{i + 1}</span>
              <span style={{ color: line.c }}>{line.text}</span>
            </motion.div>
          ))}
          {!done && (
            <motion.span className="inline-block w-[6px] h-3.5 rounded-[1px] ml-7" style={{ backgroundColor: accent }} animate={{ opacity: [1, 0] }} transition={{ duration: 0.55, repeat: Infinity }} />
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {done && (
          <>
            <motion.div className="absolute bottom-4 left-6 rounded-xl border border-[#E6ECF8] bg-white px-4 py-2 shadow-sm flex items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.div key={n} className="h-2.5 w-2.5 rounded-full bg-[#00A35A]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + n * 0.06 }} />
                ))}
              </div>
              <span className="text-[11px] font-bold text-[#0b1b3a]">5/5</span>
              <span className="text-[10px] text-[#94A3B8]">94ms</span>
            </motion.div>
            <motion.div className="absolute bottom-4 right-6 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-md" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 300 }}>
              <Star className="h-3.5 w-3.5 text-white" fill="white" />
              <span className="text-[12px] font-extrabold text-white">96</span>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CoverGeneric({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#F8FBFF] to-white">
      <BgDots color={accent} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="h-8 w-8" style={{ color: `${accent}40` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATED FIGURE SCENES
═══════════════════════════════════════════════════════════════ */
function AnimatedFigure({ accent, label, caption, scene }: { accent: string; label: string; caption: string; scene?: string }) {
  return (
    <figure className="mt-7 mb-3">
      <div className="overflow-hidden rounded-2xl border border-[#E6ECF8] bg-white shadow-[0_18px_50px_-44px_rgba(0,0,0,0.14)]">
        <div className="relative h-[200px] md:h-[260px] overflow-hidden select-none">
          {scene === "matching-pipeline" && <FigMatchingPipeline accent={accent} />}
          {scene === "skill-graph" && <FigSkillGraph accent={accent} />}
          {scene === "score-breakdown" && <FigScoreBreakdown accent={accent} />}
          {scene === "cv-to-profile" && <FigCvToProfile accent={accent} />}
          {scene === "profile-sections" && <FigProfileSections accent={accent} />}
          {scene === "assessment-flow" && <FigAssessmentFlow accent={accent} />}
          {scene === "assessment-tips" && <FigAssessmentTips accent={accent} />}
          {!scene && <FigGeneric accent={accent} label={label} />}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
      <figcaption className="mt-2.5 text-[12px] text-[#94A3B8] font-semibold flex items-center gap-2">
        <span className="h-1 w-4 rounded-full" style={{ backgroundColor: accent, opacity: 0.35 }} />
        {caption}
      </figcaption>
    </figure>
  );
}

function FigMatchingPipeline({ accent }: { accent: string }) {
  const steps = [
    { icon: <Layers className="h-4 w-4" />, label: "Normalize" },
    { icon: <Target className="h-4 w-4" />, label: "Score" },
    { icon: <Eye className="h-4 w-4" />, label: "Explain" },
    { icon: <TrendingUp className="h-4 w-4" />, label: "Improve" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 bg-gradient-to-br from-[#F8FBFF] to-white">
      <BgDots color={accent} />
      <div className="relative flex items-center gap-3 md:gap-5 z-10">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <motion.div className="flex flex-col items-center gap-2" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12 }}>
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center border shadow-sm" style={{ borderColor: `${accent}20`, backgroundColor: i === 1 ? `${accent}12` : "white", color: i === 1 ? accent : "#64748B" }}>
                {s.icon}
              </div>
              <span className="text-[10px] md:text-[11px] font-bold text-[#0b1b3a]">{s.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div className="flex items-center gap-1" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.1 }}>
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="h-1 w-1 rounded-full" style={{ backgroundColor: accent }} animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 1.2, delay: d * 0.15, repeat: Infinity }} />
                ))}
                <ArrowRight className="h-3 w-3" style={{ color: `${accent}40` }} />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function FigSkillGraph({ accent }: { accent: string }) {
  const nodes = [
    { label: "React", x: 50, y: 40, s: 48 }, { label: "Node.js", x: 170, y: 30, s: 42 },
    { label: "TypeScript", x: 110, y: 110, s: 52 }, { label: "PostgreSQL", x: 260, y: 80, s: 40 },
    { label: "Next.js", x: 50, y: 150, s: 38 }, { label: "Docker", x: 210, y: 160, s: 36 },
    { label: "AWS", x: 310, y: 150, s: 34 }, { label: "Prisma", x: 310, y: 40, s: 36 },
  ];
  const edges = [[0,2],[1,2],[2,3],[2,4],[1,3],[3,5],[5,6],[1,7],[3,7]];
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#F8FBFF] to-white">
      <BgDots color={accent} />
      <svg className="absolute inset-0 w-full h-full">
        {edges.map(([a, b], i) => (
          <motion.line key={i} x1={nodes[a].x + nodes[a].s / 2 + 20} y1={nodes[a].y + nodes[a].s / 2} x2={nodes[b].x + nodes[b].s / 2 + 20} y2={nodes[b].y + nodes[b].s / 2} stroke={accent} strokeWidth="1.5" strokeDasharray="3 4" initial={{ strokeOpacity: 0 }} whileInView={{ strokeOpacity: 0.18 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.04 }} />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <motion.div key={n.label} className="absolute rounded-xl border border-[#E6ECF8] bg-white shadow-sm flex items-center justify-center" style={{ left: n.x + 20, top: n.y, width: n.s, height: n.s, zIndex: 1 }} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 250 }}>
          <span className="text-[8px] md:text-[9px] font-bold text-[#0b1b3a] text-center leading-tight px-1">{n.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function FigScoreBreakdown({ accent }: { accent: string }) {
  const items = [
    { label: "Required skills", pct: 95, impact: "+38" },
    { label: "Optional skills", pct: 72, impact: "+14" },
    { label: "Experience depth", pct: 88, impact: "+26" },
    { label: "Proof signals", pct: 65, impact: "+13" },
    { label: "Recency", pct: 90, impact: "+9" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 md:px-10 bg-gradient-to-br from-[#F8FBFF] to-white">
      <BgDots color={accent} />
      <div className="w-full max-w-md space-y-3 relative z-10">
        {items.map((it, i) => (
          <motion.div key={it.label} className="flex items-center gap-3" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.08 }}>
            <span className="text-[10px] md:text-[11px] font-semibold text-[#0b1b3a] w-28 md:w-32 text-right flex-shrink-0">{it.label}</span>
            <div className="flex-1 h-5 rounded-lg bg-[#F1F5F9] overflow-hidden">
              <motion.div className="h-full rounded-lg" style={{ backgroundColor: accent }} initial={{ width: 0 }} whileInView={{ width: `${it.pct}%` }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: "easeOut" }} />
            </div>
            <span className="text-[10px] font-extrabold w-8 flex-shrink-0" style={{ color: accent }}>{it.impact}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FigCvToProfile({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-6 md:gap-10 px-6 bg-gradient-to-br from-[#F6FFF6] to-white">
      <BgDots color={accent} />
      <motion.div className="w-[100px] md:w-[120px] rounded-2xl border border-[#E6ECF8] bg-white p-3 shadow-sm relative z-10" initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
        <div className="text-[9px] font-bold text-[#94A3B8] mb-2">Unstructured</div>
        {[80, 60, 95, 45, 70, 55, 85].map((w, i) => (
          <div key={i} className="h-[3px] rounded-full bg-[#E2E8F0] mb-[4px]" style={{ width: `${w}%` }} />
        ))}
        <div className="mt-2 text-[8px] text-[#CBD5E1] font-semibold">resume_v3.pdf</div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="relative z-10">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }} />
          ))}
          <ArrowRight className="h-4 w-4" style={{ color: `${accent}50` }} />
        </div>
      </motion.div>
      <motion.div className="w-[140px] md:w-[160px] rounded-2xl border border-[#E6ECF8] bg-white p-3 shadow-md relative z-10" initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
        <div className="text-[9px] font-bold mb-2" style={{ color: accent }}>Structured</div>
        {["Name & role", "Skills (tagged)", "Experience", "Assessments", "Score: 92"].map((l, i) => (
          <motion.div key={l} className="flex items-center gap-2 mb-2" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.08 }}>
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" style={{ color: accent }} />
            <span className="text-[9px] font-semibold text-[#0b1b3a]">{l}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function FigProfileSections({ accent }: { accent: string }) {
  const sections = [
    { label: "Header", desc: "Name, title, location", w: "100%" },
    { label: "Skills", desc: "Tagged + verified", w: "100%" },
    { label: "Experience", desc: "Scope → action → impact", w: "100%" },
    { label: "Assessments", desc: "Scores + history", w: "70%" },
    { label: "Education", desc: "Degrees + certs", w: "55%" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 md:px-10 bg-gradient-to-br from-[#F6FFF6] to-white">
      <BgDots color={accent} />
      <div className="w-full max-w-sm space-y-2.5 relative z-10">
        {sections.map((s, i) => (
          <motion.div key={s.label} className="flex items-center gap-3" initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }}>
            <motion.div className="h-9 rounded-xl border border-[#E6ECF8] bg-white shadow-sm flex items-center px-3 gap-2" style={{ width: s.w }} initial={{ width: 0 }} whileInView={{ width: s.w }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}>
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
              <span className="text-[10px] font-bold text-[#0b1b3a] whitespace-nowrap">{s.label}</span>
              <span className="text-[9px] text-[#94A3B8] whitespace-nowrap hidden md:inline">— {s.desc}</span>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FigAssessmentFlow({ accent }: { accent: string }) {
  const steps = [
    { icon: <FileText className="h-4 w-4" />, label: "Read" },
    { icon: <Code2 className="h-4 w-4" />, label: "Code" },
    { icon: <Zap className="h-4 w-4" />, label: "Run" },
    { icon: <GitBranch className="h-4 w-4" />, label: "Fix" },
    { icon: <CheckCircle2 className="h-4 w-4" />, label: "Submit" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 bg-gradient-to-br from-[#FAF5FF] to-white">
      <BgGrid color={accent} />
      <div className="relative flex items-center gap-2 md:gap-4 z-10">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <motion.div className="flex flex-col items-center gap-1.5" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.1 }}>
              <div className="h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center border shadow-sm" style={{ borderColor: `${accent}20`, backgroundColor: i === 2 ? `${accent}12` : "white", color: i === 2 ? accent : "#64748B" }}>
                {s.icon}
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-[#0b1b3a]">{s.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 0.4 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08 }}>
                <ArrowRight className="h-3 w-3" style={{ color: accent }} />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function FigAssessmentTips({ accent }: { accent: string }) {
  const tips = [
    { icon: <Eye className="h-4 w-4" />, title: "Read carefully", desc: "Underline inputs & constraints" },
    { icon: <Timer className="h-4 w-4" />, title: "Test first", desc: "2 manual tests before running" },
    { icon: <Award className="h-4 w-4" />, title: "Stay clean", desc: "Clarity beats cleverness" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 md:gap-4 px-4 bg-gradient-to-br from-[#FAF5FF] to-white">
      <BgDots color={accent} />
      {tips.map((t, i) => (
        <motion.div key={t.title} className="w-[110px] md:w-[130px] rounded-2xl border border-[#E6ECF8] bg-white p-3 md:p-4 shadow-sm relative z-10" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center border mb-2.5" style={{ borderColor: `${accent}20`, backgroundColor: `${accent}10`, color: accent }}>
            {t.icon}
          </div>
          <div className="text-[11px] font-bold text-[#0b1b3a]">{t.title}</div>
          <div className="text-[9px] text-[#94A3B8] mt-0.5">{t.desc}</div>
        </motion.div>
      ))}
    </div>
  );
}

function FigGeneric({ accent, label }: { accent: string; label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F8FBFF] to-white">
      <BgDots color={accent} />
      <div className="text-center relative z-10">
        <Sparkles className="h-6 w-6 mx-auto mb-2" style={{ color: `${accent}40` }} />
        <div className="text-[12px] font-semibold text-[#94A3B8]">{label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED UI BLOCKS
═══════════════════════════════════════════════════════════════ */
function BgDots({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(${color} 0.8px, transparent 0.8px)`, backgroundSize: "22px 22px" }} />
  );
}

function BgGrid({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
  );
}

function Callout({ accent, title, text }: { accent: string; title: string; text: string }) {
  return (
    <div
      className="rounded-2xl border border-[#E6ECF8] bg-white p-5 relative overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: accent }}
    >
      <div className="flex items-center gap-2 text-[12px] font-extrabold text-[#0b1b3a]">
        <span
          className="h-5 w-5 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}10` }}
        >
          <Lightbulb className="h-3 w-3" style={{ color: accent }} />
        </span>
        {title}
      </div>
      <div className="mt-2 text-[14px] text-[#64748B] leading-relaxed max-w-[60ch]">
        {text}
      </div>
    </div>
  );
}

function PullQuote({ accent, quote, by }: { accent: string; quote: string; by: string }) {
  return (
    <div className="rounded-2xl border border-[#E6ECF8] bg-[#FAFCFF] p-6 relative overflow-hidden">
      {/* Big decorative quote mark */}
      <div
        className="absolute -top-3 -left-1 text-7xl font-bold leading-none opacity-[0.06] select-none"
        style={{ color: accent }}
      >
        "
      </div>
      <div className="relative text-[17px] md:text-[18px] font-semibold leading-[1.5] text-[#0b1b3a] max-w-[55ch]">
        "{quote}"
      </div>
      <div className="relative mt-4 text-[13px] font-semibold text-[#94A3B8] flex items-center gap-3">
        <span
          className="h-1 w-10 rounded-full"
          style={{ backgroundColor: accent }}
        />
        {by}
      </div>
    </div>
  );
}

function CodeBlock({
  accent,
  title,
  code,
}: {
  accent: string;
  title: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#1a1d2e] bg-[#0C0F1A] shadow-[0_18px_50px_-44px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
            <span className="h-2 w-2 rounded-full bg-[#FFBD2E]/70" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
          </div>
          <div className="flex items-center gap-2">
            <Code2 className="h-3 w-3 text-white/20" />
            <span className="text-[11px] font-semibold text-white/50">
              {title}
            </span>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.06] text-[10px] font-semibold text-white/40 hover:text-white/70 transition"
          onClick={() => {
            navigator.clipboard.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? (
            <Check className="h-3 w-3 text-[#28C840]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 md:p-5 text-[12px] md:text-[13px] leading-[1.7] text-white/80 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function NavCard({
  dir,
  href,
  title,
  accent,
}: {
  dir: "prev" | "next";
  href: string;
  title: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#E6ECF8] bg-white p-6 hover:shadow-[0_14px_40px_-25px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden"
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: accent, opacity: 0.25 }}
      />
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-[0.08em]">
          {dir === "prev" ? "← Previous" : "Next →"}
        </div>
        <div
          className="h-8 w-8 rounded-xl grid place-items-center border border-[#E6ECF8] bg-[#F7FBFF] group-hover:translate-x-0.5 transition"
          style={{ color: accent }}
        >
          <ArrowRight
            className={`h-3.5 w-3.5 ${dir === "prev" ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      <div className="mt-3 text-[#0b1b3a] font-semibold leading-snug">
        {title}
      </div>
      <div
        className="mt-3 h-1 w-16 rounded-full"
        style={{ backgroundColor: accent, opacity: 0.2 }}
      />
    </Link>
  );
}
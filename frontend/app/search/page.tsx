"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Search, MapPin, Star, Briefcase, Lock, ArrowRight,
  Zap, Eye, TrendingUp, CheckCircle2, Clock, SlidersHorizontal,
  Sparkles, Shield, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* ─── MOCK DATA ─── */
const MOCK_FREELANCERS = [
  { id: 1, name: "Sofia Amrani",   title: "Senior UI/UX Designer",      rate: 85,  rating: 4.9, jobs: 47, location: "Casablanca", skills: ["Figma", "Framer", "Design Systems"], avatar: "/images/people6.png",  badge: "Top Rated", matchScore: 98, available: true,  responseTime: "1h" },
  { id: 2, name: "Yassine Benali", title: "Full-Stack Engineer",         rate: 95,  rating: 4.8, jobs: 63, location: "Rabat",      skills: ["React", "Node.js", "PostgreSQL"],   avatar: "/images/people2.png",  badge: "Pro",       matchScore: 95, available: true,  responseTime: "2h" },
  { id: 3, name: "Nadia El Fassi", title: "AI / ML Engineer",           rate: 120, rating: 5.0, jobs: 29, location: "Marrakech",  skills: ["Python", "TensorFlow", "LLMs"],     avatar: "/images/people3.png",  badge: "Expert",    matchScore: 92, available: false, responseTime: "4h" },
  { id: 4, name: "Omar Idrissi",   title: "Product Manager",            rate: 75,  rating: 4.7, jobs: 38, location: "Casablanca", skills: ["Roadmapping", "Agile", "Jira"],     avatar: "/images/people4.png",  badge: null,        matchScore: 89, available: true,  responseTime: "3h" },
  { id: 5, name: "Leila Chraibi",  title: "Frontend Developer",         rate: 70,  rating: 4.8, jobs: 51, location: "Tangier",    skills: ["Next.js", "TypeScript", "Tailwind"],avatar: "/images/people5.png",  badge: "Rising",    matchScore: 94, available: true,  responseTime: "1h" },
  { id: 6, name: "Karim Tazi",     title: "DevOps & Cloud Engineer",    rate: 110, rating: 4.9, jobs: 34, location: "Rabat",      skills: ["AWS", "Docker", "Kubernetes"],      avatar: "/images/people6.png",  badge: "Pro",       matchScore: 87, available: true,  responseTime: "2h" },
  { id: 7, name: "Amina Kettani",  title: "Brand & Motion Designer",    rate: 65,  rating: 4.6, jobs: 22, location: "Fès",        skills: ["Illustrator", "After Effects", "Brand"],avatar: "/images/people7.png",badge: null,        matchScore: 83, available: false, responseTime: "6h" },
  { id: 8, name: "Hamza Lahlou",   title: "Backend Engineer (Node/Go)", rate: 100, rating: 4.9, jobs: 58, location: "Casablanca", skills: ["Go", "Node.js", "Redis"],           avatar: "/images/people8.png",  badge: "Top Rated", matchScore: 91, available: true,  responseTime: "1h" },
  { id: 9, name: "Rime Serghini",  title: "Data Analyst & BI",          rate: 80,  rating: 4.7, jobs: 19, location: "Agadir",     skills: ["Power BI", "SQL", "Python"],        avatar: "/images/people9.png",  badge: "Rising",    matchScore: 88, available: true,  responseTime: "3h" },
];

const BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Top Rated": { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", dot: "#F97316" },
  "Pro":       { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6" },
  "Expert":    { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", dot: "#22C55E" },
  "Rising":    { bg: "#FAF5FF", text: "#7C3AED", border: "#DDD6FE", dot: "#A855F7" },
};

/* ─── TILT CARD WRAPPER ─── */
function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-3, 3]);

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top)  / rect.height - 0.5);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── FREELANCER CARD ─── */
function FreelancerCard({ f, index, blurred }: { f: typeof MOCK_FREELANCERS[0]; index: number; blurred: boolean }) {
  const [hovered, setHovered] = useState(false);
  const b = f.badge ? BADGE[f.badge] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
      style={{
        filter: blurred ? "blur(8px) saturate(0.4)" : "none",
        transition: "filter 1s ease",
        pointerEvents: blurred ? "none" : "auto",
        userSelect: blurred ? "none" : "auto",
        perspective: 800,
      }}
    >
      <TiltCard>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative rounded-[24px] bg-white overflow-hidden cursor-pointer"
          style={{
            border: hovered ? "1.5px solid rgba(0,93,220,0.35)" : "1.5px solid rgba(220,232,255,0.85)",
            boxShadow: hovered
              ? "0 20px 60px -16px rgba(0,93,220,0.22), 0 4px 16px rgba(0,0,0,0.06)"
              : "0 2px 20px -6px rgba(0,48,120,0.08), 0 1px 4px rgba(0,0,0,0.03)",
            transition: "all 0.25s ease",
          }}
        >
          {/* Match score accent bar */}
          <div className="h-[3.5px] w-full relative overflow-hidden" style={{ background: "#EEF2F7" }}>
            <motion.div
              className="h-full rounded-full absolute top-0 left-0"
              style={{ background: "linear-gradient(90deg, #005DDC 0%, #60A5FA 60%, #A5C8FF 100%)" }}
              initial={{ width: 0 }}
              animate={{ width: `${f.matchScore}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 + 0.3 }}
            />
            {/* Shimmer */}
            <motion.div
              className="absolute top-0 h-full w-16 opacity-60"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)" }}
              animate={{ x: ["-100%", "800%"] }}
              transition={{ duration: 2, delay: index * 0.06 + 1.2, repeat: Infinity, repeatDelay: 4 }}
            />
          </div>

          <div className="p-4">
            {/* Top: Avatar + info + score */}
            <div className="flex items-start gap-3 mb-3">
              {/* Avatar stack */}
              <div className="relative flex-shrink-0">
                <div
                  className="h-12 w-12 rounded-[14px] overflow-hidden"
                  style={{
                    boxShadow: "0 0 0 2px white, 0 0 0 3.5px rgba(0,93,220,0.20)",
                    borderRadius: "14px",
                  }}
                >
                  <img
                    src={f.avatar} alt={f.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#60A5FA,#005DDC);display:grid;place-items:center;color:white;font-weight:900;font-size:18px;border-radius:14px">${f.name[0]}</div>`;
                    }}
                  />
                </div>
                {/* Availability dot */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-white"
                  style={{ background: f.available ? "#22C55E" : "#94A3B8" }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-extrabold text-[#0b1b3a] truncate leading-tight">{f.name}</div>
                    <div className="text-[11px] font-semibold text-[#64748B] mt-0.5 truncate">{f.title}</div>
                  </div>
                  {/* Score pill */}
                  <div
                    className="flex-shrink-0 rounded-xl px-2 py-1 text-[11px] font-black"
                    style={{ background: "rgba(0,93,220,0.08)", color: "#005DDC", border: "1px solid rgba(0,93,220,0.14)" }}
                  >
                    {f.matchScore}%
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star size={10} fill="#F59E0B" color="#F59E0B" />
                    <span className="text-[10.5px] font-bold text-[#0b1b3a]">{f.rating}</span>
                  </div>
                  <span className="text-[#E2E8F0]">·</span>
                  <div className="flex items-center gap-1 text-[#94A3B8]">
                    <Briefcase size={9} />
                    <span className="text-[10px] font-semibold">{f.jobs} jobs</span>
                  </div>
                  <span className="text-[#E2E8F0]">·</span>
                  <div className="flex items-center gap-1 text-[#94A3B8]">
                    <MapPin size={9} />
                    <span className="text-[10px] font-semibold">{f.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {f.skills.map((s) => (
                <span key={s} className="rounded-full px-2.5 py-[3px] text-[10px] font-bold"
                  style={{ background: "#F0F5FF", color: "#3B5A9A", border: "1px solid #E0ECFF" }}>
                  {s}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {b && (
                  <span
                    className="rounded-full px-2 py-[2px] text-[9.5px] font-extrabold border flex items-center gap-1"
                    style={{ background: b.bg, color: b.text, borderColor: b.border }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: b.dot }} />
                    {f.badge}
                  </span>
                )}
                <span className="text-[9.5px] font-semibold text-[#94A3B8]">
                  Replies in {f.responseTime}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[16px] font-black text-[#0b1b3a]">${f.rate}</span>
                <span className="text-[10px] text-[#94A3B8] font-semibold">/hr</span>
              </div>
            </div>
          </div>

          {/* Hover CTA strip */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: "1px solid #EEF2F7", background: "linear-gradient(to right, #F8FBFF, #F0F6FF)" }}
              >
                <span className="text-[11px] font-bold text-[#005DDC]">View full profile</span>
                <ChevronRight size={13} color="#005DDC" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TiltCard>
    </motion.div>
  );
}

/* ─── SKELETON CARD ─── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[24px] overflow-hidden"
      style={{ background: "white", border: "1.5px solid #EEF4FF", height: 200 }}
    >
      <div className="h-[3.5px] w-full" style={{ background: "linear-gradient(90deg,#EEF2F7 0%,#E0ECFF 50%,#EEF2F7 100%)", backgroundSize: "200% 100%" }}>
        <motion.div className="h-full w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(0,93,220,0.08),transparent)" }}
          animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-[14px] flex-shrink-0" style={{ background: "#EEF2F7" }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 rounded-full w-3/4" style={{ background: "#EEF2F7" }} />
            <div className="h-2.5 rounded-full w-1/2" style={{ background: "#F4F8FF" }} />
          </div>
        </div>
        <div className="flex gap-1.5">
          {[40, 55, 45].map((w, i) => <div key={i} className="h-5 rounded-full" style={{ background: "#EEF2F7", width: `${w}%` }} />)}
        </div>
        <div className="flex justify-between">
          <div className="h-2.5 rounded-full w-1/3" style={{ background: "#F4F8FF" }} />
          <div className="h-2.5 rounded-full w-1/5" style={{ background: "#F4F8FF" }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── COUNTDOWN RING ─── */
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 11, circ = 2 * Math.PI * r;
  return (
    <svg width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(0,93,220,0.15)" strokeWidth="2.5" />
      <motion.circle cx="15" cy="15" r={r} fill="none" stroke="#005DDC" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - seconds / total)}
        style={{ transformOrigin: "15px 15px", transform: "rotate(-90deg)" }}
        transition={{ duration: 0.4 }} />
      <text x="15" y="20" textAnchor="middle" fontSize="11" fontWeight="900" fill="#005DDC">{seconds}</text>
    </svg>
  );
}

/* ─── GATE OVERLAY ─── */
function GateOverlay({ query, count }: { query: string; count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 z-40 flex items-start justify-center pt-16"
      style={{
        background: "linear-gradient(to bottom, rgba(240,246,255,0) 0%, rgba(240,246,255,0.82) 22%, rgba(240,246,255,0.98) 42%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[440px] mx-4 overflow-hidden rounded-[32px]"
        style={{
          background: "white",
          border: "1.5px solid rgba(0,93,220,0.10)",
          boxShadow: "0 40px 100px -20px rgba(0,48,120,0.25), 0 12px 40px -8px rgba(0,93,220,0.12), 0 0 0 1px rgba(255,255,255,0.8) inset",
        }}
      >
        {/* Animated gradient top bar */}
        <div className="h-[3px] w-full overflow-hidden">
          <motion.div
            className="h-full w-[200%]"
            style={{ background: "linear-gradient(90deg,#005DDC,#60A5FA,#A5C8FF,#60A5FA,#005DDC)" }}
            animate={{ x: ["-50%", "0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Decorative bg circles */}
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full opacity-[0.04]"
          style={{ background: "#005DDC", filter: "blur(32px)" }} />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full opacity-[0.03]"
          style={{ background: "#005DDC", filter: "blur(28px)" }} />

        <div className="relative px-8 pt-8 pb-7">

          {/* Top: AI badge + lock */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: "rgba(0,93,220,0.07)", border: "1px solid rgba(0,93,220,0.14)" }}>
              <Sparkles size={12} color="#005DDC" />
              <span className="text-[11px] font-bold text-[#005DDC]">AI-Matched Results</span>
            </div>
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="h-10 w-10 rounded-2xl grid place-items-center"
              style={{ background: "rgba(0,93,220,0.08)", border: "1.5px solid rgba(0,93,220,0.14)" }}>
              <Lock size={16} color="#005DDC" />
            </motion.div>
          </div>

          {/* Big hook number */}
          <div className="text-center mb-1">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 280, damping: 16 }}
              className="inline-flex items-end gap-1"
            >
              <span className="text-[54px] font-black text-[#0b1b3a] leading-none tabular-nums">{count}</span>
              <span className="text-[32px] font-black text-[#005DDC] leading-none mb-1">+</span>
            </motion.div>
            <div className="text-[13.5px] font-semibold text-[#64748B] mt-1">
              verified freelancers match{query ? <> <span className="text-[#0b1b3a] font-bold">"{query}"</span></> : " your search"}
            </div>
          </div>

          {/* Stacked avatars + social proof */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex items-center justify-center gap-2.5 mt-4 mb-5"
          >
            <div className="flex -space-x-2.5">
              {[1,2,3,4,5].map((n, i) => (
                <div key={i} className="h-8 w-8 rounded-full overflow-hidden"
                  style={{ border: "2.5px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.12)", zIndex: 5 - i }}>
                  <img src={`/images/people${n}.png`} alt="" className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.parentElement as HTMLElement).style.background = `linear-gradient(135deg,#60A5FA,#005DDC)`;
                    }} />
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="text-[12px] font-extrabold text-[#0b1b3a]">Ready to connect</div>
              <div className="text-[10px] text-[#94A3B8] font-semibold">Average response in 2 hours</div>
            </div>
          </motion.div>

          {/* 3 stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-2.5 mb-5"
          >
            {[
              { icon: <Zap size={13} color="#005DDC" />, val: "2h",   sub: "avg reply",   accent: "#EFF6FF" },
              { icon: <TrendingUp size={13} color="#22C55E" />, val: "94%",  sub: "hire rate",   accent: "#F0FDF4" },
              { icon: <Shield size={13} color="#8B5CF6" />, val: "100%", sub: "verified",    accent: "#FAF5FF" },
            ].map(({ icon, val, sub, accent }) => (
              <div key={sub} className="rounded-2xl p-3 text-center"
                style={{ background: accent, border: "1px solid rgba(0,0,0,0.05)" }}>
                <div className="flex justify-center mb-1.5">{icon}</div>
                <div className="text-[14px] font-black text-[#0b1b3a]">{val}</div>
                <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wide mt-0.5">{sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Unlock list */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56 }}
            className="rounded-2xl p-4 mb-5"
            style={{ background: "#F4F8FF", border: "1px solid #DCE9FF" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lock size={11} color="#005DDC" />
              <span className="text-[11px] font-extrabold text-[#005DDC] uppercase tracking-wide">Unlock with free account</span>
            </div>
            <div className="space-y-2">
              {[
                { text: "Full profiles with portfolio & CV",       icon: <Eye size={11} color="#22C55E" /> },
                { text: "Verified skill scores & assessments",     icon: <CheckCircle2 size={11} color="#22C55E" /> },
                { text: "Direct message & hire instantly",         icon: <Zap size={11} color="#22C55E" /> },
              ].map(({ text, icon }) => (
                <div key={text} className="flex items-center gap-2.5">
                  {icon}
                  <span className="text-[12px] font-semibold text-[#334155]">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62 }}
            className="space-y-2.5"
          >
            <Link href="/auth/signup">
              <motion.div
                whileHover={{ scale: 1.02, boxShadow: "0 16px 40px -8px rgba(0,93,220,0.55)" }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full rounded-2xl py-3.5 text-[13.5px] font-bold text-white flex items-center justify-center gap-2 overflow-hidden cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #005DDC 0%, #1a73e8 100%)",
                  boxShadow: "0 10px 32px -8px rgba(0,93,220,0.45)",
                }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
                />
                <Sparkles size={14} />
                Create free account
                <ArrowRight size={14} />
              </motion.div>
            </Link>

            <Link href="/auth/login">
              <div className="w-full rounded-2xl py-3 text-[12.5px] font-bold text-[#005DDC] flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:bg-[#EEF6FF]"
                style={{ border: "1.5px solid rgba(0,93,220,0.18)" }}>
                Already have an account? Sign in
                <ChevronRight size={13} />
              </div>
            </Link>
          </motion.div>

          <div className="mt-4 text-center text-[10px] text-[#CBD5E1] font-medium">
            Free forever · No credit card · Cancel anytime
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── MAIN PAGE ─── */
export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query    = searchParams.get("q") ?? "";
  const location = searchParams.get("location") ?? "";

  const TEASER_SECONDS = 2;
  const [timeLeft, setTimeLeft] = useState(TEASER_SECONDS);
  const [gated, setGated]       = useState(false);
  const [started, setStarted]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fake loading skeleton for 800ms
    const loadDelay = setTimeout(() => {
      setLoading(false);
      // Then start countdown
      const startDelay = setTimeout(() => {
        setStarted(true);
        timerRef.current = setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              clearInterval(timerRef.current!);
              setGated(true);
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }, 300);
      return () => clearTimeout(startDelay);
    }, 800);
    return () => {
      clearTimeout(loadDelay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const totalResults = MOCK_FREELANCERS.length + 38;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#F8FAFF 0%,#EFF4FF 50%,#F4F8FF 100%)" }}>

      {/* ── Sticky nav ── */}
      <div className="sticky top-0 z-30 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.88)", borderBottom: "1px solid rgba(220,232,255,0.8)", boxShadow: "0 2px 20px rgba(0,48,120,0.06)" }}>
        <div className="mx-auto w-[92%] max-w-6xl py-3 flex items-center gap-3 flex-wrap">

          <Link href="/" className="flex-shrink-0 mr-2">
            <span className="text-[17px] font-black text-[#0b1b3a] tracking-tight">
              hira<span className="text-[#005DDC]">lent</span>
            </span>
          </Link>

          {/* Search pill */}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2 min-w-0"
            style={{ background: "#F0F5FF", border: "1.5px solid #DCE9FF" }}>
            <Search size={14} color="#94A3B8" />
            <span className="text-[13px] font-semibold text-[#0b1b3a] truncate">
              {query || "All freelancers"}
            </span>
            {location && (
              <>
                <div className="h-3.5 w-px bg-[#DCE9FF]" />
                <MapPin size={12} color="#005DDC" />
                <span className="text-[12px] font-bold text-[#005DDC] truncate">{location}</span>
              </>
            )}
          </div>

          {/* Filter button */}
          <button className="hidden sm:flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-bold text-[#64748B] flex-shrink-0 transition-colors hover:bg-[#F0F5FF]"
            style={{ border: "1.5px solid #E0ECFF" }}>
            <SlidersHorizontal size={13} />
            Filters
          </button>

          {/* Countdown */}
          <AnimatePresence>
            {started && !gated && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 flex-shrink-0"
                style={{ background: "rgba(0,93,220,0.06)", border: "1.5px solid rgba(0,93,220,0.16)" }}
              >
                <Clock size={12} color="#005DDC" />
                <span className="text-[11.5px] font-bold text-[#005DDC] whitespace-nowrap hidden sm:block">
                  Preview
                </span>
                <CountdownRing seconds={timeLeft} total={TEASER_SECONDS} />
              </motion.div>
            )}
          </AnimatePresence>

          <Link href="/auth/login" className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-white cursor-pointer"
              style={{ background: "#005DDC", boxShadow: "0 4px 16px -4px rgba(0,93,220,0.4)" }}>
              Sign in
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ── Results header ── */}
      <div className="mx-auto w-[92%] max-w-6xl pt-7 pb-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" exit={{ opacity: 0 }} className="space-y-2">
              <div className="h-5 w-48 rounded-full" style={{ background: "#E0ECFF" }} />
              <div className="h-3 w-36 rounded-full" style={{ background: "#EEF2F7" }} />
            </motion.div>
          ) : (
            <motion.div key="header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-black text-[#0b1b3a] tracking-tight">
                  {totalResults} freelancers found
                </h1>
                {query && (
                  <div className="rounded-full px-3 py-1 text-[12px] font-bold text-[#005DDC]"
                    style={{ background: "rgba(0,93,220,0.08)", border: "1px solid rgba(0,93,220,0.15)" }}>
                    "{query}"
                  </div>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-[#22C55E] opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-[#22C55E]" />
                </span>
                <span className="text-[12.5px] text-[#94A3B8] font-medium">
                  Sorted by AI match score · Updated live
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Grid ── */}
      <div className="mx-auto w-[92%] max-w-6xl pb-24 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeletons" exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
            </motion.div>
          ) : (
            <motion.div key="cards"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_FREELANCERS.map((f, i) => (
                <FreelancerCard key={f.id} f={f} index={i} blurred={gated} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blurred ghost rows — depth illusion */}
        {!loading && !gated && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ filter: "blur(5px)", opacity: 0.35, pointerEvents: "none" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[24px] bg-white h-40"
                style={{ border: "1.5px solid #E0ECFF" }} />
            ))}
          </div>
        )}

        {/* Gate */}
        <AnimatePresence>
          {gated && <GateOverlay query={query} count={totalResults} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
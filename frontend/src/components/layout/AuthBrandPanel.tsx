"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { CheckCircle2, Zap, Star, Award, Users, TrendingUp, MapPin } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── animated counter ─────────────────────────────────────────── */
const Count: React.FC<{ to: number; suffix?: string; duration?: number }> = ({ to, suffix = "", duration = 1.2 }) => {
  const [v, setV] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: n => setV(Math.round(n)) });
    return c.stop;
  }, [to, duration]);
  return <>{v}{suffix}</>;
};

/* ── live ticker ──────────────────────────────────────────────── */
const FEED = [
  { name: "Ahmed R.",  msg: "matched 96% · 3 offers received" },
  { name: "Stripe",    msg: "hired a Frontend Engineer · 4 days" },
  { name: "Lin W.",    msg: "Assessment passed 94/100 · Certified" },
  { name: "Sarah K.",  msg: "accepted offer · $140k · via Hiralent" },
  { name: "Figma",     msg: "filled 6 roles this week" },
];
const Ticker: React.FC = () => {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(p => (p + 1) % FEED.length), 2800); return () => clearInterval(t); }, []);
  return (
    <div className="flex items-center gap-2 overflow-hidden h-5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00A35A] flex-shrink-0 animate-pulse" />
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.22 }} className="text-[10.5px] text-[#475569] whitespace-nowrap">
          <span className="font-semibold text-[#0b1b3a]">{FEED[i].name}</span> {FEED[i].msg}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   SCENE 1 — MATCHING
   Hero + rotating role (exactly like landing page hero section)
   + mini match card inspired by Steps → Scene 2
════════════════════════════════════════════════════════════════ */
const ROLES = [
  { label: "Frontend Developer", color: "#005DDC" },
  { label: "Data Scientist",     color: "#6D28D9" },
  { label: "Product Designer",   color: "#D9480F" },
  { label: "Backend Engineer",   color: "#0C8346" },
  { label: "AI Engineer",        color: "#0E7490" },
];
const MATCHES = [
  { co: "Stripe",  initial: "S", color: "#635BFF", role: "Frontend Eng",  pct: 96, loc: "Remote" },
  { co: "Figma",   initial: "F", color: "#F24E1E", role: "Product Design", pct: 91, loc: "SF, CA" },
  { co: "Airbnb",  initial: "A", color: "#FF385C", role: "Data Scientist", pct: 87, loc: "NY" },
];

const Scene1: React.FC = () => {
  const [ri, setRi] = useState(0);
  useEffect(() => { const t = setInterval(() => setRi(p => (p + 1) % ROLES.length), 2600); return () => clearInterval(t); }, []);
  const role = ROLES[ri];

  return (
    <motion.div key="s1" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.5, ease: EASE }} className="flex flex-col gap-4 w-full">

      {/* Hero headline — landing page typography */}
      <div>
        <motion.div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3"
          style={{ border: "1px solid rgba(0,93,220,0.12)", background: "rgba(0,93,220,0.04)" }}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Zap size={11} style={{ color: "#005DDC" }} />
          <span className="text-[11px] font-semibold text-[#005DDC]">AI‑Powered Matching</span>
        </motion.div>

        <h3 className="font-bold text-[#0b1b3a] leading-[1.1]" style={{ fontSize: "1.45rem", letterSpacing: "-0.035em" }}>
          Find your dream<br />
          <span className="relative inline-block overflow-hidden align-bottom" style={{ minWidth: 200 }}>
            <AnimatePresence mode="wait">
              <motion.span key={ri} className="inline-block font-bold" style={{ color: role.color }}
                initial={{ y: "100%", opacity: 0 }} animate={{ y: "0%", opacity: 1 }} exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.38, ease: EASE }}>
                {role.label}
              </motion.span>
            </AnimatePresence>
            {/* underline accent — exact landing page style */}
            <motion.span className="absolute bottom-0.5 left-0 h-[6px] rounded-full -z-10"
              animate={{ background: `${role.color}22`, width: "100%" }}
              transition={{ duration: 0.4 }} style={{ width: "100%" }} />
          </span>
          {" "}role.
        </h3>
      </div>

      {/* Match cards — landing page card tokens */}
      <div className="flex flex-col gap-2">
        {MATCHES.map((m, i) => (
          <motion.div key={m.co}
            initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 + i * 0.11, duration: 0.42, ease: EASE }}
            className="flex items-center gap-3 bg-white rounded-2xl px-3.5 py-2.5"
            style={{ border: "1px solid #E6ECF8", boxShadow: "0 2px 12px rgba(0,20,60,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
              style={{ background: m.color }}>{m.initial}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#0b1b3a] truncate">{m.role}</p>
              <p className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                <MapPin size={9} />{m.co} · {m.loc}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[12px] font-black" style={{ color: "#005DDC" }}>{m.pct}%</span>
              <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "#EAF3FF" }}>
                <motion.div className="h-full rounded-full" style={{ background: "#005DDC" }}
                  initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                  transition={{ delay: 0.45 + i * 0.1, duration: 0.75, ease: "easeOut" }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Proof row — landing page avatar + stat style */}
      <motion.div className="flex items-center gap-3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        <div className="flex -space-x-2">
          {["#005DDC", "#F24E1E", "#00A35A"].map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white text-white text-[8px] font-black flex items-center justify-center"
              style={{ background: c }}>{"SAL"[i]}</div>
          ))}
        </div>
        <p className="text-[11px] text-[#64748B]">
          <span className="font-bold text-[#0b1b3a]">2,847</span> matched today
        </p>
        <div className="flex items-center gap-1 ml-auto">
          <CheckCircle2 size={11} className="text-[#00A35A]" />
          <span className="text-[10.5px] font-medium text-[#64748B]">Free to start</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════
   SCENE 2 — ASSESSMENT
   Exact landing page terminal from SkillVerification section
════════════════════════════════════════════════════════════════ */
const CODE_LINES = [
  { t: `function twoSum(nums, target) {`, c: "#79C0FF",  d: 0.1  },
  { t: `  const map = new Map();`,         c: "#C9D1D9",  d: 0.5  },
  { t: `  for (let i = 0; i < nums.length; i++) {`, c: "#C9D1D9", d: 0.9 },
  { t: `    const comp = target - nums[i];`, c: "#C9D1D9", d: 1.2 },
  { t: `    if (map.has(comp)) return [map.get(comp), i];`, c: "#7EE787", d: 1.6 },
  { t: `    map.set(nums[i], i);`,          c: "#C9D1D9",  d: 2.0  },
  { t: `  }`,                               c: "#C9D1D9",  d: 2.3  },
  { t: `}`,                                 c: "#79C0FF",  d: 2.5  },
];
const TEST_CASES = [
  { label: "nums=[2,7,11,15], target=9", pass: true  },
  { label: "nums=[3,2,4], target=6",     pass: true  },
  { label: "nums=[3,3], target=6",       pass: true  },
  { label: "Edge: empty array",          pass: true  },
];

const TypeLine: React.FC<{ text: string; color: string; delay: number }> = ({ text, color, delay }) => {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let idx = 0;
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        idx++;
        setShown(text.slice(0, idx));
        if (idx >= text.length) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <div className="font-mono text-[10.5px] leading-snug" style={{ color }}>{shown || " "}</div>;
};

const Scene2: React.FC = () => (
  <motion.div key="s2" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
    transition={{ duration: 0.5, ease: EASE }} className="flex flex-col gap-3 w-full">

    <div className="flex items-center justify-between">
      <motion.div className="inline-flex items-center gap-2 rounded-full px-3 py-1"
        style={{ border: "1px solid rgba(124,58,237,0.14)", background: "rgba(124,58,237,0.05)" }}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Award size={11} className="text-violet-600" />
        <span className="text-[11px] font-semibold text-violet-700">Skill Verification</span>
      </motion.div>
      <span className="text-[11px] font-bold text-[#0b1b3a]" style={{ letterSpacing: "-0.02em" }}>
        Score: <Count to={94} duration={1.4} suffix="/100" />
      </span>
    </div>

    {/* Dark terminal — exact landing page style */}
    <motion.div className="rounded-2xl overflow-hidden flex-1"
      style={{ background: "#0d1117", border: "1px solid #1e2433", boxShadow: "0 18px 45px rgba(0,0,0,0.22)" }}
      initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: EASE }}>

      {/* Chrome bar — exact landing page */}
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#161b22" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map(c => <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />)}
        <span className="ml-2 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>two-sum.js — hiralent assessment</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(254,188,46,0.18)", color: "#FEBC2E" }}>Medium</div>
        </div>
      </div>

      {/* Code */}
      <div className="px-4 py-3">
        {CODE_LINES.map((l, i) => <TypeLine key={i} text={l.t} color={l.c} delay={l.d} />)}
      </div>

      {/* Test results */}
      <div className="border-t px-3.5 py-2.5 grid grid-cols-2 gap-1.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {TEST_CASES.map((tc, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 3.0 + i * 0.1 }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1"
            style={{ background: tc.pass ? "rgba(126,231,135,0.08)" : "rgba(255,123,114,0.08)" }}>
            <span style={{ color: tc.pass ? "#7EE787" : "#FF7B72" }} className="text-[9px]">{tc.pass ? "✓" : "✗"}</span>
            <span className="text-[9px] font-mono truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{tc.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Metrics — exact landing page pattern */}
      <div className="grid grid-cols-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {[
          { label: "Runtime", val: "92ms",  icon: "⚡", color: "#79C0FF" },
          { label: "Memory",  val: "42 MB", icon: "◈",  color: "#D2A8FF" },
          { label: "Score",   val: "94%",   icon: "★",  color: "#7EE787" },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 + i * 0.08 }}
            className="flex flex-col items-center py-2 border-r last:border-r-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[9px] mb-0.5" style={{ color: m.color }}>{m.icon}</span>
            <span className="text-[10px] font-bold font-mono" style={{ color: m.color }}>{m.val}</span>
            <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)" }}>{m.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>

    <motion.div className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ background: "rgba(0,163,90,0.06)", border: "1px solid rgba(0,163,90,0.15)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.8 }}>
      <CheckCircle2 size={13} className="text-[#00A35A] flex-shrink-0" />
      <span className="text-[11px] font-medium text-[#0b1b3a]">Hiralent Certified · visible to 500+ hiring teams</span>
    </motion.div>
  </motion.div>
);

/* ════════════════════════════════════════════════════════════════
   SCENE 3 — HIRING DECISION
   Exact "decision workspace" from landing page Steps section
════════════════════════════════════════════════════════════════ */
const Scene3: React.FC = () => {
  const [sent, setSent] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSent(true), 2200); return () => clearTimeout(t); }, []);

  return (
    <motion.div key="s3" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.5, ease: EASE }} className="flex flex-col gap-4 w-full">

      <div className="flex items-center justify-between">
        <motion.div className="inline-flex items-center gap-2 rounded-full px-3 py-1"
          style={{ border: "1px solid rgba(0,163,90,0.15)", background: "rgba(0,163,90,0.05)" }}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <TrendingUp size={11} className="text-[#00A35A]" />
          <span className="text-[11px] font-semibold text-[#00A35A]">Hiring Decision</span>
        </motion.div>
        <span className="text-[11px] text-[#64748B]">avg. <span className="font-bold text-[#0b1b3a]">4 days</span> to hire</span>
      </div>

      {/* Decision workspace card — exact landing page style */}
      <motion.div className="bg-white overflow-hidden"
        style={{ borderRadius: 22, border: "1px solid #E6ECF8", boxShadow: "0 24px 60px -44px rgba(0,0,0,0.32)" }}
        initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.12, duration: 0.5, ease: EASE }}>

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ background: "#F7FBFF", borderColor: "#E6ECF8" }}>
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Decision workspace</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A35A] animate-pulse" />
            <span className="text-[9.5px] font-medium text-[#00A35A]">Live</span>
          </div>
        </div>

        {/* Candidate card */}
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-2xl p-3 mb-3" style={{ background: "#F7FBFF", border: "1px solid #E6ECF8" }}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">A</div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-[#0b1b3a]">Ahmed Rahim</p>
              <p className="text-[10px] text-[#64748B]">Senior Frontend Engineer</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,93,220,0.08)", border: "2px solid #005DDC" }}>
                <span className="text-[11px] font-black text-[#005DDC]">96%</span>
              </div>
              <span className="text-[8px] text-[#94A3B8] mt-0.5">match</span>
            </div>
          </div>

          {/* Signal pills — exact landing page style */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Skills Verified", color: "#00A35A", bg: "#EAFBF2" },
              { label: "AI Matched",      color: "#005DDC", bg: "#EAF3FF" },
              { label: "Top 5%",          color: "#7C3AED", bg: "#F3EEFF" },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ background: s.bg }}>
                <p className="text-[9.5px] font-semibold" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Send Offer button — exact landing page green */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setSent(true)}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-all duration-300 flex items-center justify-center gap-2"
            style={{
              background: sent ? "#0C8346" : "#00A35A",
              boxShadow: sent ? "none" : "0 4px 18px rgba(0,163,90,0.30)",
            }}>
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.span key="sent" initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Offer Sent!
                </motion.span>
              ) : (
                <motion.span key="idle" className="flex items-center gap-1.5"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Send Offer →
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* Bottom stats — landing page value strip style */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Users,      val: 50,  suf: "K+", label: "Candidates",  color: "#005DDC", bg: "#EAF3FF" },
          { icon: TrendingUp, val: 3,   suf: "×",  label: "Faster hire", color: "#0C8346", bg: "#EAFBF2" },
          { icon: Star,       val: 500, suf: "+",  label: "Companies",   color: "#6D28D9", bg: "#F3EEFF" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08, ease: EASE }}
            className="rounded-xl p-2.5 text-center" style={{ background: s.bg, border: `1px solid ${s.bg}` }}>
            <s.icon size={13} style={{ color: s.color }} className="mx-auto mb-1" />
            <div className="text-[13px] font-black text-[#0b1b3a]" style={{ letterSpacing: "-0.02em" }}>
              <Count to={s.val} suffix={s.suf} duration={1.0} />
            </div>
            <div className="text-[9px] text-[#64748B] mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════
   PANEL SHELL
════════════════════════════════════════════════════════════════ */
const SCENES = [
  { id: 0, label: "Matching",   accent: "#005DDC", dur: 6000 },
  { id: 1, label: "Assessment", accent: "#7C3AED", dur: 7500 },
  { id: 2, label: "Get Hired",  accent: "#00A35A", dur: 5500 },
];

const AuthBrandPanel: React.FC = () => {
  const [scene, setScene] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (cur: number, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = (cur + 1) % SCENES.length;
      setScene(next);
      schedule(next, SCENES[next].dur);
    }, ms);
  };

  useEffect(() => { schedule(0, SCENES[0].dur); return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  const goTo = (i: number) => { setScene(i); schedule(i, SCENES[i].dur); };
  const acc = SCENES[scene].accent;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #ffffff 0%, #F8FAFF 40%, #EDF2FF 100%)" }}>

      {/* Landing page grid overlay — exact match */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: "linear-gradient(#0b1b3a 1px,transparent 1px),linear-gradient(90deg,#0b1b3a 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

      {/* Ambient glows — same as landing page */}
      <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
        animate={{ background: `radial-gradient(circle, ${acc}0d, transparent 65%)` }}
        transition={{ duration: 1.0 }}
        style={{ width: 480, height: 480, top: -80, right: -80 }} />
      <div className="pointer-events-none absolute rounded-full blur-3xl"
        style={{ width: 300, height: 300, bottom: -60, left: -60, background: "radial-gradient(circle, rgba(0,93,220,0.05), transparent 70%)" }} />

      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3 flex-shrink-0">
        <img src="/images/logo.png" alt="Hiralent" className="h-7 w-auto flex-shrink-0" />
        <div className="flex-1 overflow-hidden rounded-xl px-3 py-1.5 bg-white"
          style={{ border: "1px solid #E6ECF8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <Ticker />
        </div>
      </div>

      {/* Scene */}
      <div className="flex-1 min-h-0 overflow-hidden px-6">
        <AnimatePresence mode="wait">
          {scene === 0 && <Scene1 key="s1" />}
          {scene === 1 && <Scene2 key="s2" />}
          {scene === 2 && <Scene3 key="s3" />}
        </AnimatePresence>
      </div>

      {/* Footer — landing page tab/step style */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-1">
          {SCENES.map(s => {
            const active = scene === s.id;
            return (
              <button key={s.id} onClick={() => goTo(s.id)}
                className="flex items-center gap-1.5 rounded-xl text-[11px] font-semibold transition-all duration-250"
                style={{
                  padding: "5px 10px",
                  color: active ? s.accent : "#94A3B8",
                  background: active ? "white" : "transparent",
                  border: active ? `1px solid ${s.accent}30` : "1px solid transparent",
                  boxShadow: active ? `0 2px 10px ${s.accent}14` : "none",
                }}>
                {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.accent }} />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Progress bars — landing page step progress style */}
        <div className="flex items-center gap-1">
          {SCENES.map(s => (
            <div key={s.id} className="h-[3px] rounded-full overflow-hidden transition-all duration-300"
              style={{ width: scene === s.id ? 28 : 6, background: "#EAF3FF" }}>
              {scene === s.id && (
                <motion.div className="h-full rounded-full" style={{ background: s.accent }}
                  initial={{ width: "0%" }} animate={{ width: "100%" }}
                  transition={{ duration: s.dur / 1000, ease: "linear" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthBrandPanel;

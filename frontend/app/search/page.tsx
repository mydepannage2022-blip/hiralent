"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  Search, MapPin, Star, Briefcase, Lock, ArrowRight,
  Zap, TrendingUp, CheckCircle2, Clock, SlidersHorizontal,
  Sparkles, Shield, ChevronRight, Bell, User, Plus,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCandidateSearch } from "../../src/lib/search/search.queries";
import { useAuth } from "../../src/context/AuthContext";

/* ─────────────────────────────
   HIRALENT DESIGN TOKENS - REFINED
───────────────────────────── */
const H = {
  bg:       "#F8FAFC",
  surface:  "#FFFFFF",
  navy:     "#0F172A",
  navyMd:   "#1E293B",
  blue:     "#2563EB",
  blueLt:   "#EFF6FF",
  blueMd:   "#BFDBFE",
  blueDk:   "#1D4ED8",
  gray:     "#64748B",
  grayLt:   "#F1F5F9",
  grayBd:   "#E2E8F0",
  success:  "#10B981",
  warning:  "#F59E0B",
  text:     "#334155",
  muted:    "#94A3B8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
};

/* ─────────────────────────────
   FREELANCER CARD DATA TYPE
───────────────────────────── */
interface FreelancerCardData {
  id: string | number;
  name: string;
  title: string;
  location: string;
  skills: string[];
  avatar: string | null;
  badge: string | null;
  matchScore: number;
  available: boolean;
  responseTime: string;
  verified: boolean;
  rating: number;
  jobs: number;
  rate: number;
}

const BADGE_MAP: Record<string, { bg: string; color: string; border: string }> = {
  "Top Rated": { bg:"#FFF7ED", color:"#EA580C", border:"#FED7AA" },
  "Pro":       { bg:"#EFF6FF", color:"#2563EB", border:"#BFDBFE" },
  "Expert":    { bg:"#ECFDF5", color:"#059669", border:"#A7F3D0" },
  "Rising":    { bg:"#FAF5FF", color:"#7C3AED", border:"#DDD6FE" },
};

/* ─────────────────────────────
   ANIMATED NUMBER
───────────────────────────── */
function AnimatedNumber({ to, duration = 1.1 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration, ease: [0.22,1,0.36,1], onUpdate: v => setVal(Math.round(v)) });
    return c.stop;
  }, [to, duration]);
  return <>{val}</>;
}

/* ─────────────────────────────
   MATCH SCORE RING - REFINED
───────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 18, circ = 2 * Math.PI * r;
  const color = score >= 90 ? H.success : score >= 75 ? H.blue : H.warning;
  const bgColor = score >= 90 ? "#D1FAE5" : score >= 75 ? "#DBEAFE" : "#FEF3C7";
  
  return (
    <div style={{ 
      position:"relative", 
      width:52, 
      height:52, 
      flexShrink:0,
      background: bgColor,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <svg width={44} height={44} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={3} />
        <motion.circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration:1.1, ease:[0.22,1,0.36,1] }}
        />
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
      }}>
        <span style={{ fontSize:13, fontWeight:800, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:8, color, fontWeight:600, lineHeight:1, opacity:0.8 }}>match</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   SKILL TAG COMPONENT
───────────────────────────── */
function SkillTag({ skill, isHighlight = false }: { skill: string; isHighlight?: boolean }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      padding: "4px 10px",
      borderRadius: 6,
      background: isHighlight ? H.blueLt : H.grayLt,
      color: isHighlight ? H.blue : H.text,
      border: `1px solid ${isHighlight ? H.blueMd : H.grayBd}`,
      whiteSpace: "nowrap",
    }}>
      {skill}
    </span>
  );
}

/* ─────────────────────────────
   FREELANCER CARD - COMPACT & CONSISTENT
───────────────────────────── */
const CARD_HEIGHT = 200; // Fixed height for consistency
const MAX_SKILLS = 4;

function FreelancerCard({ f, index, blurred, onCardClick }: { f: FreelancerCardData; index: number; blurred: boolean; onCardClick?: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const b = f.badge ? BADGE_MAP[f.badge] : null;
  const visibleSkills = f.skills.slice(0, MAX_SKILLS);
  const remainingSkills = f.skills.length - MAX_SKILLS;

  return (
    <motion.div
      initial={{ opacity:0, y:16 }}
      animate={{ opacity: blurred ? 0.3 : 1, y:0, filter: blurred ? "blur(6px)" : "none" }}
      transition={{ duration:0.35, delay: index * 0.04, ease:[0.22,1,0.36,1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onCardClick?.(String(f.id))}
      style={{ pointerEvents: blurred ? "none" : "auto" }}
    >
      <div style={{
        background: H.surface,
        borderRadius: 16,
        height: CARD_HEIGHT,
        border: `1px solid ${hovered ? H.blueMd : H.grayBd}`,
        boxShadow: hovered
          ? `0 20px 40px -12px rgba(37,99,235,0.15), 0 4px 12px rgba(0,0,0,0.04)`
          : `0 1px 3px rgba(0,0,0,0.04)`,
        transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}>
        {/* Top accent line */}
        <div style={{ 
          height: 3, 
          background: hovered ? H.gradient : `linear-gradient(90deg, ${H.blue}, ${H.blueMd})`,
          transition: "background 0.3s",
        }} />

        <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header: avatar + name + score */}
          <div style={{ display:"flex", alignItems:"flex-start", gap: 12, marginBottom: 12 }}>
            {/* Avatar */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                overflow:"hidden",
                background: `linear-gradient(135deg, ${H.blueLt}, ${H.blueMd})`,
                border: `2px solid ${H.surface}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}>
                {f.avatar ? (
                  <img src={f.avatar} alt={f.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    color: H.blue,
                    fontWeight: 700,
                    fontSize: 18,
                  }}>
                    {f.name[0]}
                  </div>
                )}
              </div>
              {/* Available indicator */}
              <div style={{
                position:"absolute", bottom: -2, right: -2,
                width: 14, height: 14, borderRadius:"50%",
                background: f.available ? H.success : H.muted,
                border: `3px solid ${H.surface}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }} />
            </div>

            {/* Name / title / meta */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap: 6, marginBottom: 2 }}>
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: 700, 
                  color: H.navy, 
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {f.name}
                </span>
                {f.verified && (
                  <CheckCircle2 size={14} color={H.blue} fill={H.blueLt} />
                )}
              </div>
              <div style={{ 
                fontSize: 12, 
                color: H.gray, 
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginBottom: 6,
              }}>
                {f.title}
              </div>
              {/* Meta row */}
              <div style={{ display:"flex", alignItems:"center", gap: 8, flexWrap: "wrap" }}>
                {f.rating > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap: 3 }}>
                    <Star size={11} fill="#F59E0B" color="#F59E0B" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: H.navy }}>{f.rating}</span>
                  </div>
                )}
                {f.jobs > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap: 3 }}>
                    <Briefcase size={10} color={H.muted} />
                    <span style={{ fontSize: 11, color: H.gray }}>{f.jobs}</span>
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap: 3 }}>
                  <MapPin size={10} color={H.muted} />
                  <span style={{ 
                    fontSize: 11, 
                    color: H.gray,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 80,
                  }}>
                    {f.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Score ring */}
            <ScoreRing score={f.matchScore} />
          </div>

          {/* Skills - Limited display */}
          <div style={{ 
            display:"flex", 
            flexWrap:"wrap", 
            gap: 6, 
            flex: 1,
            alignContent: "flex-start",
          }}>
            {visibleSkills.map((s, i) => (
              <SkillTag key={s} skill={s} isHighlight={i < 2} />
            ))}
            {remainingSkills > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                background: H.grayLt,
                color: H.muted,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}>
                <Plus size={10} />
                {remainingSkills} more
              </span>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display:"flex", 
            alignItems:"center", 
            justifyContent:"space-between",
            paddingTop: 12, 
            borderTop: `1px solid ${H.grayLt}`,
            marginTop: "auto",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
              {b && (
                <span style={{
                  fontSize: 10, 
                  fontWeight: 700, 
                  letterSpacing: "0.03em",
                  padding: "3px 8px", 
                  borderRadius: 5,
                  background: b.bg, 
                  color: b.color, 
                  border: `1px solid ${b.border}`,
                }}>
                  {f.badge}
                </span>
              )}
              {f.responseTime !== "—" && (
                <span style={{ fontSize: 10, color: H.muted, display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={10} />
                  {f.responseTime}
                </span>
              )}
            </div>
            {f.rate > 0 && (
              <div style={{ display:"flex", alignItems:"baseline", gap: 2 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: H.navy, letterSpacing: "-0.02em" }}>
                  ${f.rate}
                </span>
                <span style={{ fontSize: 11, color: H.muted, fontWeight: 500 }}>/hr</span>
              </div>
            )}
          </div>
        </div>

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px 16px",
                background: "linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)",
                borderTop: `1px solid ${H.blueMd}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: H.blue }}>
                View Full Profile
              </span>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 28, 
                  height: 28, 
                  borderRadius: 8,
                  background: H.blue, 
                  display: "grid", 
                  placeItems: "center",
                }}
              >
                <ArrowRight size={14} color="#fff" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────
   SKELETON CARD - MATCHING HEIGHT
───────────────────────────── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity:0 }} 
      animate={{ opacity:1 }}
      transition={{ delay: index * 0.03 }}
      style={{
        background: H.surface, 
        borderRadius: 16, 
        height: CARD_HEIGHT,
        overflow: "hidden",
        border: `1px solid ${H.grayBd}`,
      }}
    >
      <div style={{ height: 3, background: H.grayLt }} />
      <div style={{ padding: 16 }}>
        <div style={{ display:"flex", gap: 12, marginBottom: 12 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 12, 
            background: H.grayLt, 
            flexShrink: 0, 
            overflow: "hidden",
            position: "relative",
          }}>
            <motion.div 
              style={{ 
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`,
              }}
              animate={{ x: ["-100%", "100%"] }} 
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, borderRadius: 6, background: H.grayLt, width: "60%", marginBottom: 8 }} />
            <div style={{ height: 10, borderRadius: 5, background: H.grayLt, width: "40%", marginBottom: 8 }} />
            <div style={{ height: 10, borderRadius: 5, background: H.grayLt, width: "50%" }} />
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: H.grayLt, flexShrink: 0 }} />
        </div>
        <div style={{ display:"flex", gap: 6, marginBottom: 16 }}>
          {[60, 70, 55, 45].map((w, i) => (
            <div key={i} style={{ height: 24, borderRadius: 6, background: H.grayLt, width: w }} />
          ))}
        </div>
        <div style={{ height: 1, background: H.grayLt, marginBottom: 12 }} />
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <div style={{ height: 12, borderRadius: 5, background: H.grayLt, width: "25%" }} />
          <div style={{ height: 16, borderRadius: 6, background: H.grayLt, width: "18%" }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────
   COUNTDOWN INDICATOR
───────────────────────────── */
function CountdownBadge({ seconds, total }: { seconds: number; total: number }) {
  const r = 10, circ = 2 * Math.PI * r;
  return (
    <div style={{
      display: "flex", 
      alignItems: "center", 
      gap: 8,
      background: H.blueLt, 
      border: `1px solid ${H.blueMd}`,
      borderRadius: 10, 
      padding: "6px 12px",
    }}>
      <Clock size={12} color={H.blue} />
      <span className="hidden sm:block" style={{ fontSize: 11, fontWeight: 600, color: H.blue }}>
        Preview
      </span>
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r={r} fill="none" stroke={H.blueMd} strokeWidth="2" />
        <motion.circle 
          cx="12" cy="12" r={r} fill="none" stroke={H.blue} strokeWidth="2"
          strokeLinecap="round" 
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - seconds / total)}
          style={{ transformOrigin: "12px 12px", transform: "rotate(-90deg)" }}
          transition={{ duration: 0.4 }} 
        />
        <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="700" fill={H.blue}>
          {seconds}
        </text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────
   GATE OVERLAY - REFINED
───────────────────────────── */
function GateOverlay({ query, count }: { query: string; count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      style={{
        position: "absolute", 
        inset: 0, 
        zIndex: 40,
        display: "flex", 
        alignItems: "flex-start", 
        justifyContent: "center",
        paddingTop: "6vh",
        background: `linear-gradient(to bottom, 
          rgba(248,250,252,0) 0%, 
          rgba(248,250,252,0.9) 15%, 
          rgba(248,250,252,0.98) 30%
        )`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22,1,0.36,1] }}
        style={{
          width: "100%", 
          maxWidth: 420, 
          margin: "0 16px",
          background: H.surface,
          border: `1px solid ${H.grayBd}`,
          borderRadius: 20,
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Gradient top bar */}
        <div style={{ height: 4, background: H.gradient }} />

        <div style={{ padding: "24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{
                display: "inline-flex", 
                alignItems: "center", 
                gap: 6,
                background: H.blueLt, 
                border: `1px solid ${H.blueMd}`,
                borderRadius: 8, 
                padding: "5px 10px", 
                marginBottom: 8,
              }}>
                <Sparkles size={12} color={H.blue} />
                <span style={{ fontSize: 11, fontWeight: 600, color: H.blue }}>
                  AI-Matched Results
                </span>
              </div>
              <p style={{ fontSize: 13, color: H.gray }}>
                {query
                  ? <>Showing talent for <strong style={{ color: H.navy }}>"{query}"</strong></>
                  : "All verified talent"
                }
              </p>
            </div>
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }} 
              transition={{ delay: 1, duration: 0.5 }}
              style={{
                width: 44, 
                height: 44, 
                borderRadius: 12, 
                flexShrink: 0,
                background: H.blueLt, 
                border: `1px solid ${H.blueMd}`,
                display: "grid", 
                placeItems: "center",
              }}
            >
              <Lock size={18} color={H.blue} />
            </motion.div>
          </div>

          {/* Count */}
          <div style={{
            textAlign: "center", 
            padding: "20px 0",
            borderTop: `1px solid ${H.grayLt}`, 
            borderBottom: `1px solid ${H.grayLt}`,
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
                style={{ 
                  fontSize: 56, 
                  fontWeight: 800, 
                  color: H.navy, 
                  lineHeight: 1, 
                  letterSpacing: "-0.03em",
                }}
              >
                <AnimatedNumber to={count} />
              </motion.span>
              <span style={{ fontSize: 32, fontWeight: 800, color: H.blue, lineHeight: 1, marginBottom: 6 }}>
                +
              </span>
            </div>
            <p style={{ fontSize: 13, color: H.gray, marginTop: 6 }}>
              verified freelancers matched
            </p>

            {/* Avatar stack */}
            <motion.div
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.4 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}
            >
              <div style={{ display: "flex" }}>
                {[1, 2, 3, 4, 5].map((n, i) => (
                  <div key={i} style={{
                    width: 28, 
                    height: 28, 
                    borderRadius: "50%", 
                    overflow: "hidden",
                    border: `2px solid ${H.surface}`,
                    marginLeft: i === 0 ? 0 : -8, 
                    zIndex: 5 - i, 
                    position: "relative",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                    background: `hsl(${i * 45 + 200}, 65%, 60%)`,
                  }}>
                    <img 
                      src={`/images/people${n}.png`} 
                      alt="" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }} 
                    />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 11, color: H.gray }}>+ {count - 5} more</span>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.45 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}
          >
            {[
              { icon: Zap,        val: "2h",   sub: "Avg reply",  color: H.blue,    bg: H.blueLt },
              { icon: TrendingUp, val: "94%",  sub: "Hire rate",  color: "#059669", bg: "#ECFDF5" },
              { icon: Shield,     val: "100%", sub: "Verified",   color: "#D97706", bg: "#FEF3C7" },
            ].map(({ icon: Icon, val, sub, color, bg }) => (
              <div key={sub} style={{
                borderRadius: 10, 
                padding: "12px 8px", 
                textAlign: "center",
                background: bg,
              }}>
                <Icon size={14} color={color} style={{ margin: "0 auto 4px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: H.navy }}>{val}</div>
                <div style={{ fontSize: 9, fontWeight: 500, color }}>{sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
            style={{
              borderRadius: 12, 
              padding: "14px", 
              marginBottom: 16,
              background: H.grayLt,
            }}
          >
            <p style={{ 
              fontSize: 10, 
              fontWeight: 700, 
              color: H.blue, 
              letterSpacing: "0.05em", 
              textTransform: "uppercase", 
              marginBottom: 10,
            }}>
              Create free account to unlock
            </p>
            {[
              { text: "Full profiles & portfolio access", color: H.success },
              { text: "Verified skill assessments",       color: H.blue },
              { text: "Direct messaging & hiring",        color: "#7C3AED" },
            ].map(({ text, color }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <CheckCircle2 size={14} color={color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: H.text, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.56 }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <Link href="/auth/signup">
              <motion.div
                whileHover={{ scale: 1.02, boxShadow: "0 12px 28px -8px rgba(37,99,235,0.4)" }}
                whileTap={{ scale: 0.98 }}
                style={{
                  borderRadius: 12, 
                  padding: "14px 0", 
                  textAlign: "center",
                  background: H.gradient, 
                  color: "#fff",
                  fontSize: 14, 
                  fontWeight: 700,
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px -4px rgba(37,99,235,0.4)",
                  position: "relative", 
                  overflow: "hidden",
                }}
              >
                <motion.div
                  style={{ 
                    position: "absolute", 
                    inset: 0, 
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                />
                <Sparkles size={14} />
                Get Started — Free
                <ArrowRight size={14} />
              </motion.div>
            </Link>

            <Link href="/auth/login">
              <div
                style={{
                  borderRadius: 12, 
                  padding: "12px 0", 
                  textAlign: "center",
                  border: `1px solid ${H.grayBd}`, 
                  color: H.gray,
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: "pointer",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 4,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.borderColor = H.blueMd; 
                  e.currentTarget.style.color = H.blue; 
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.borderColor = H.grayBd; 
                  e.currentTarget.style.color = H.gray; 
                }}
              >
                Already have an account? Sign in
                <ChevronRight size={14} />
              </div>
            </Link>
          </motion.div>

          <p style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: H.muted }}>
            Free to start · No credit card required
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────
   FILTER CHIP
───────────────────────────── */
function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button style={{
      fontSize: 12,
      fontWeight: 500,
      padding: "6px 14px",
      borderRadius: 8,
      background: active ? H.blue : H.surface,
      color: active ? "#fff" : H.gray,
      border: `1px solid ${active ? H.blue : H.grayBd}`,
      cursor: "pointer",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query    = searchParams.get("q") ?? "";
  const locParam = searchParams.get("location") ?? "";

  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCardClick = (candidateId: string) => {
    if (isAuthenticated) {
      router.push(`/candidate/public-profile/${candidateId}`);
    } else {
      router.push('/auth/login');
    }
  };

  const TEASER = 4;
  const [timeLeft, setTimeLeft] = useState(TEASER);
  const [gated,    setGated]    = useState(false);
  const [started,  setStarted]  = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading: loading } = useCandidateSearch({
    q: query || undefined,
    location: locParam || undefined,
    page: 1,
    limit: 12,
  });

  const results = data?.results ?? [];
  const total   = data?.total   ?? 0;

  const freelancers: FreelancerCardData[] = results.map((r) => ({
    id:           r.candidate_id,
    name:         r.full_name,
    title:        r.headline ?? "Candidate",
    location:     r.location ?? r.city ?? "Remote",
    skills:       r.skills,
    avatar:       r.profile_picture_url,
    badge:        null,
    matchScore:   r.match_score,
    available:    true,
    responseTime: "—",
    verified:     false,
    rating:       0,
    jobs:         0,
    rate:         0,
  }));

  // Start countdown after data loads
  useEffect(() => {
    if (!loading && !started) {
      const t = setTimeout(() => {
        setStarted(true);
        timer.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) { clearInterval(timer.current!); setGated(true); return 0; }
            return t - 1;
          });
        }, 1000);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: H.bg, 
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      {/* ─── NAVIGATION ─── */}
      <div style={{
        position: "sticky", 
        top: 0, 
        zIndex: 30, 
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${H.grayBd}`,
      }}>
        {/* Progress bar */}
        <div style={{ height: 2, background: H.grayLt, overflow: "hidden" }}>
          {started && !gated && (
            <motion.div
              style={{ height: "100%", background: H.gradient }}
              animate={{ width: `${(timeLeft / TEASER) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          )}
        </div>

        <div style={{
          width: "94%", 
          maxWidth: 1280, 
          margin: "0 auto",
          padding: "12px 0",
          display: "flex", 
          alignItems: "center", 
          gap: 16,
        }}>
          {/* Logo */}
          <Link href="/" style={{ flexShrink: 0, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{
                fontSize: 22, 
                fontWeight: 800, 
                letterSpacing: "-0.03em",
                color: H.navy,
              }}>
                <span style={{ color: H.blue }}>H</span>iralent
              </span>
            </div>
          </Link>

          {/* Search bar */}
          <div style={{
            flex: 1, 
            display: "flex", 
            alignItems: "center", 
            gap: 8, 
            minWidth: 0,
            background: H.surface, 
            border: `1px solid ${H.grayBd}`,
            borderRadius: 12, 
            padding: "10px 16px",
            maxWidth: 480,
          }}>
            <Search size={16} color={H.muted} />
            <span style={{ 
              fontSize: 14, 
              fontWeight: 500, 
              color: H.navy, 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap", 
              flex: 1,
            }}>
              {query || "Search talent..."}
            </span>
            {locParam && (
              <>
                <div style={{ width: 1, height: 18, background: H.grayBd, flexShrink: 0 }} />
                <MapPin size={14} color={H.blue} />
                <span style={{ fontSize: 13, fontWeight: 600, color: H.blue, whiteSpace: "nowrap" }}>
                  {locParam}
                </span>
              </>
            )}
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex" style={{ gap: 24, alignItems: "center", flexShrink: 0 }}>
            {["Find job", "Companies"].map(item => (
              <span key={item} style={{ 
                fontSize: 14, 
                fontWeight: 500, 
                color: H.gray, 
                cursor: "pointer", 
                whiteSpace: "nowrap",
                transition: "color 0.2s",
              }}>
                {item}
              </span>
            ))}
          </nav>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button className="hidden sm:grid" style={{
              width: 38, 
              height: 38, 
              borderRadius: 10, 
              background: "transparent",
              border: `1px solid ${H.grayBd}`, 
              placeItems: "center", 
              cursor: "pointer",
              color: H.gray,
            }}>
              <SlidersHorizontal size={16} />
            </button>

            {/* Countdown */}
            <AnimatePresence>
              {started && !gated && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <CountdownBadge seconds={timeLeft} total={TEASER} />
                </motion.div>
              )}
            </AnimatePresence>

            <span className="hidden md:block" style={{ fontSize: 14, fontWeight: 500, color: H.gray, cursor: "pointer" }}>
              Employer
            </span>

            <Link href="/auth/login" style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6,
                  borderRadius: 10, 
                  padding: "10px 18px",
                  background: H.blue, 
                  color: "#fff",
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: "pointer",
                  boxShadow: "0 2px 8px -2px rgba(37,99,235,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                Get Started
                <ArrowRight size={14} />
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ width: "94%", maxWidth: 1280, margin: "0 auto" }}>

        {/* Results header */}
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 24, width: 220, borderRadius: 8, background: H.grayBd }} className="animate-pulse" />
                <div style={{ height: 14, width: 150, borderRadius: 6, background: H.grayLt }} className="animate-pulse" />
              </motion.div>
            ) : (
              <motion.div key="header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <h1 style={{ 
                    fontSize: 24, 
                    fontWeight: 700, 
                    color: H.navy, 
                    letterSpacing: "-0.02em", 
                    lineHeight: 1, 
                    margin: 0,
                  }}>
                    <AnimatedNumber to={total} /> freelancers found
                  </h1>
                  {query && (
                    <span style={{
                      fontSize: 13, 
                      fontWeight: 600,
                      background: H.blueLt, 
                      color: H.blue,
                      border: `1px solid ${H.blueMd}`,
                      borderRadius: 8, 
                      padding: "4px 12px",
                    }}>
                      "{query}"
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: "50%", 
                    background: H.success,
                    boxShadow: `0 0 0 3px rgba(16,185,129,0.2)`,
                  }} />
                  <span style={{ fontSize: 13, color: H.gray }}>
                    Sorted by AI match score
                  </span>
                  <span style={{ color: H.grayBd }}>·</span>
                  <span style={{ fontSize: 13, color: H.muted }}>
                    Top {freelancers.length} shown
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter bar */}
        <div style={{ 
          display: "flex", 
          gap: 8, 
          paddingBottom: 20,
          overflowX: "auto",
        }}>
          <FilterChip label="All" active />
          <FilterChip label="Available Now" />
          <FilterChip label="Top Rated" />
          <FilterChip label="$50-100/hr" />
          <FilterChip label="Verified" />
        </div>

        {/* Cards grid */}
        <div style={{ paddingBottom: 120, position: "relative" }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="skeleton" 
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                style={{ gap: 16 }}
              >
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
              </motion.div>
            ) : (
              <motion.div 
                key="cards"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                style={{ gap: 16 }}
              >
                {freelancers.length === 0 ? (
                  <div style={{
                    gridColumn: "1 / -1", 
                    textAlign: "center",
                    padding: "80px 20px", 
                    color: H.gray,
                  }}>
                    <div style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 16, 
                      background: H.grayLt, 
                      display: "grid", 
                      placeItems: "center",
                      margin: "0 auto 16px",
                    }}>
                      <Search size={28} color={H.muted} />
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: H.navy, marginBottom: 4 }}>
                      No candidates found
                    </p>
                    <p style={{ fontSize: 14, color: H.gray }}>
                      {query ? `Try adjusting your search for "${query}"` : "Try a different search"}
                    </p>
                  </div>
                ) : (
                  freelancers.map((f, i) => (
                    <FreelancerCard key={f.id} f={f} index={i} blurred={gated} onCardClick={handleCardClick} />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ghost rows for preview effect */}
          {!loading && !gated && freelancers.length > 0 && (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              style={{ gap: 16, marginTop: 16, filter: "blur(8px)", opacity: 0.15, pointerEvents: "none" }}
            >
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  background: H.surface, 
                  borderRadius: 16, 
                  height: CARD_HEIGHT,
                  border: `1px solid ${H.grayBd}`,
                }} />
              ))}
            </div>
          )}

          {/* Gate overlay */}
          <AnimatePresence>
            {gated && <GateOverlay query={query} count={total} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
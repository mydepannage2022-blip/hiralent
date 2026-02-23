"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  Search, MapPin, Star, Briefcase, Lock, ArrowRight,
  Zap, TrendingUp, CheckCircle2, Clock, SlidersHorizontal,
  Sparkles, Shield, ChevronRight, Bell, User,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* ─────────────────────────────
   HIRALENT DESIGN TOKENS
───────────────────────────── */
const H = {
  bg:       "#F4F7FF",
  surface:  "#FFFFFF",
  navy:     "#0A1628",
  navyMd:   "#1E3A5F",
  blue:     "#1B4FFF",
  blueLt:   "#EEF2FF",
  blueMd:   "#C7D4FF",
  blueDk:   "#1340DD",
  gray:     "#64748B",
  grayLt:   "#F1F5F9",
  grayBd:   "#E2E8F0",
  success:  "#10B981",
  warning:  "#F59E0B",
  text:     "#334155",
  muted:    "#94A3B8",
};

/* ─────────────────────────────
   MOCK DATA
───────────────────────────── */
const MOCK_FREELANCERS = [
  { id:1, name:"Sofia Amrani",    title:"Senior UI/UX Designer",      rate:85,  rating:4.9, jobs:47, location:"Casablanca", skills:["Figma","Framer","Design Systems"], avatar:"/images/people6.png",  badge:"Top Rated", matchScore:98, available:true,  responseTime:"1h",  verified:true  },
  { id:2, name:"Yassine Benali",  title:"Full-Stack Engineer",         rate:95,  rating:4.8, jobs:63, location:"Rabat",      skills:["React","Node.js","PostgreSQL"],    avatar:"/images/people2.png",  badge:"Pro",       matchScore:95, available:true,  responseTime:"2h",  verified:true  },
  { id:3, name:"Nadia El Fassi",  title:"AI / ML Engineer",           rate:120, rating:5.0, jobs:29, location:"Marrakech",  skills:["Python","TensorFlow","LLMs"],      avatar:"/images/people3.png",  badge:"Expert",    matchScore:92, available:false, responseTime:"4h",  verified:true  },
  { id:4, name:"Omar Idrissi",    title:"Product Manager",            rate:75,  rating:4.7, jobs:38, location:"Casablanca", skills:["Roadmapping","Agile","Jira"],      avatar:"/images/people4.png",  badge:null,        matchScore:89, available:true,  responseTime:"3h",  verified:false },
  { id:5, name:"Leila Chraibi",   title:"Frontend Developer",         rate:70,  rating:4.8, jobs:51, location:"Tangier",    skills:["Next.js","TypeScript","Tailwind"],  avatar:"/images/people5.png",  badge:"Rising",    matchScore:94, available:true,  responseTime:"1h",  verified:true  },
  { id:6, name:"Karim Tazi",      title:"DevOps & Cloud Engineer",    rate:110, rating:4.9, jobs:34, location:"Rabat",      skills:["AWS","Docker","Kubernetes"],       avatar:"/images/people6.png",  badge:"Pro",       matchScore:87, available:true,  responseTime:"2h",  verified:true  },
  { id:7, name:"Amina Kettani",   title:"Brand & Motion Designer",    rate:65,  rating:4.6, jobs:22, location:"Fès",        skills:["Illustrator","After Effects","Brand"],avatar:"/images/people7.png",badge:null,        matchScore:83, available:false, responseTime:"6h",  verified:false },
  { id:8, name:"Hamza Lahlou",    title:"Backend Engineer",           rate:100, rating:4.9, jobs:58, location:"Casablanca", skills:["Go","Node.js","Redis"],            avatar:"/images/people8.png",  badge:"Top Rated", matchScore:91, available:true,  responseTime:"1h",  verified:true  },
  { id:9, name:"Rime Serghini",   title:"Data Analyst & BI",          rate:80,  rating:4.7, jobs:19, location:"Agadir",     skills:["Power BI","SQL","Python"],         avatar:"/images/people9.png",  badge:"Rising",    matchScore:88, available:true,  responseTime:"3h",  verified:true  },
];

const BADGE_MAP: Record<string, { bg: string; color: string; border: string }> = {
  "Top Rated": { bg:"#FFF7ED", color:"#C2410C", border:"#FED7AA" },
  "Pro":       { bg:"#EEF2FF", color:"#1B4FFF", border:"#C7D4FF" },
  "Expert":    { bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0" },
  "Rising":    { bg:"#F5F3FF", color:"#5B21B6", border:"#DDD6FE" },
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
   MATCH SCORE RING
───────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 16, circ = 2 * Math.PI * r;
  const color = score >= 95 ? H.success : score >= 88 ? H.blue : H.warning;
  return (
    <div style={{ position:"relative", width:44, height:44, flexShrink:0 }}>
      <svg width={44} height={44} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke={H.grayBd} strokeWidth={3} />
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
        <span style={{ fontSize:11, fontWeight:800, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:7.5, color:H.muted, fontWeight:600, lineHeight:1 }}>%</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   FREELANCER CARD  (grid cell)
───────────────────────────── */
function FreelancerCard({ f, index, blurred }: { f: typeof MOCK_FREELANCERS[0]; index: number; blurred: boolean }) {
  const [hovered, setHovered] = useState(false);
  const b = f.badge ? BADGE_MAP[f.badge] : null;

  return (
    <motion.div
      initial={{ opacity:0, y:20 }}
      animate={{ opacity: blurred ? 0.35 : 1, y:0, filter: blurred ? "blur(5px)" : "none" }}
      transition={{ duration:0.4, delay: index * 0.055, ease:[0.22,1,0.36,1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ pointerEvents: blurred ? "none" : "auto" }}
    >
      <div style={{
        background: H.surface,
        borderRadius: 16,
        border: `1.5px solid ${hovered ? H.blueMd : H.grayBd}`,
        boxShadow: hovered
          ? `0 8px 32px -8px rgba(27,79,255,0.18), 0 2px 8px rgba(0,0,0,0.04)`
          : `0 1px 4px rgba(0,0,0,0.04)`,
        transition: "border-color 0.2s, box-shadow 0.2s",
        overflow: "hidden",
        cursor: "pointer",
      }}>
        {/* Match score bar */}
        <div style={{ height:3, background: H.grayLt, overflow:"hidden" }}>
          <motion.div
            style={{ height:"100%", background:`linear-gradient(90deg, ${H.blue}, #60A5FA)` }}
            initial={{ width:0 }}
            animate={{ width:`${f.matchScore}%` }}
            transition={{ duration:1, ease:[0.22,1,0.36,1], delay: index * 0.06 + 0.2 }}
          />
        </div>

        <div style={{ padding:"16px 18px" }}>
          {/* Header: avatar + name + score */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
            {/* Avatar */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{
                width:46, height:46, borderRadius:12, overflow:"hidden",
                border:`2px solid ${H.blueLt}`,
              }}>
                <img src={f.avatar} alt={f.name}
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    (e.currentTarget.parentElement as HTMLElement).style.background = `linear-gradient(135deg, ${H.blueLt}, ${H.blueMd})`;
                    (e.currentTarget.parentElement as HTMLElement).innerHTML += `<div style="position:absolute;inset:0;display:grid;place-items:center;color:${H.blue};font-weight:800;font-size:18px">${f.name[0]}</div>`;
                  }}
                />
              </div>
              {/* Available dot */}
              <div style={{
                position:"absolute", bottom:-1, right:-1,
                width:11, height:11, borderRadius:"50%",
                background: f.available ? H.success : H.muted,
                border:`2px solid ${H.surface}`,
              }} />
            </div>

            {/* Name / title */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:H.navy, letterSpacing:"-0.01em" }}>
                  {f.name}
                </span>
                {f.verified && (
                  <span style={{
                    fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20,
                    background:H.blueLt, color:H.blue, border:`1px solid ${H.blueMd}`,
                    letterSpacing:"0.04em",
                  }}>VERIFIED</span>
                )}
              </div>
              <div style={{ fontSize:11.5, color:H.gray, marginTop:2 }}>{f.title}</div>
              {/* Stars + location */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={9}
                      fill={i <= Math.round(f.rating) ? "#F59E0B" : H.grayBd}
                      color={i <= Math.round(f.rating) ? "#F59E0B" : H.grayBd}
                    />
                  ))}
                  <span style={{ fontSize:10.5, fontWeight:700, color:H.navy, marginLeft:2 }}>{f.rating}</span>
                </div>
                <span style={{ color:H.grayBd }}>·</span>
                <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <Briefcase size={9} color={H.muted} />
                  <span style={{ fontSize:10.5, color:H.gray }}>{f.jobs} projects</span>
                </div>
                <span style={{ color:H.grayBd }}>·</span>
                <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <MapPin size={9} color={H.muted} />
                  <span style={{ fontSize:10.5, color:H.gray }}>{f.location}</span>
                </div>
              </div>
            </div>

            {/* Score ring */}
            <ScoreRing score={f.matchScore} />
          </div>

          {/* Skills */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:12 }}>
            {f.skills.map(s => (
              <span key={s} style={{
                fontSize:10.5, fontWeight:600, padding:"3px 10px",
                borderRadius:20, letterSpacing:"0.01em",
                background:H.blueLt, color:H.blue,
                border:`1px solid ${H.blueMd}`,
              }}>{s}</span>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            paddingTop:10, borderTop:`1px solid ${H.grayLt}`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {b && (
                <span style={{
                  fontSize:9.5, fontWeight:700, letterSpacing:"0.06em",
                  padding:"3px 8px", borderRadius:6,
                  background:b.bg, color:b.color, border:`1px solid ${b.border}`,
                }}>{f.badge}</span>
              )}
              <span style={{ fontSize:10, color:H.muted }}>
                <Clock size={9} style={{ display:"inline", marginRight:3, verticalAlign:"middle" }} />
                ~{f.responseTime}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:2 }}>
              <span style={{ fontSize:18, fontWeight:800, color:H.navy, letterSpacing:"-0.02em" }}>${f.rate}</span>
              <span style={{ fontSize:10.5, color:H.muted, fontWeight:500 }}>/hr</span>
            </div>
          </div>
        </div>

        {/* Hover CTA */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity:0, height:0 }}
              animate={{ opacity:1, height:"auto" }}
              exit={{ opacity:0, height:0 }}
              style={{ overflow:"hidden" }}
            >
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 18px",
                background:H.blueLt,
                borderTop:`1px solid ${H.blueMd}`,
              }}>
                <span style={{ fontSize:11.5, fontWeight:700, color:H.blue }}>View full profile</span>
                <div style={{
                  width:24, height:24, borderRadius:"50%",
                  background:H.blue, display:"grid", placeItems:"center",
                }}>
                  <ChevronRight size={12} color="#fff" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────
   SKELETON CARD
───────────────────────────── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }}
      transition={{ delay: index * 0.05 }}
      style={{
        background:H.surface, borderRadius:16, overflow:"hidden",
        border:`1.5px solid ${H.grayBd}`,
      }}
    >
      <div style={{ height:3, background:H.grayLt }} />
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", gap:12, marginBottom:12 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:H.grayLt, flexShrink:0, overflow:"hidden" }}>
            <motion.div style={{ width:"100%", height:"100%", background:`linear-gradient(90deg,transparent,${H.grayBd},transparent)` }}
              animate={{ x:["-100%","100%"] }} transition={{ duration:1.5, repeat:Infinity, ease:"linear" }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ height:13, borderRadius:7, background:H.grayLt, width:"55%", marginBottom:7 }} />
            <div style={{ height:10, borderRadius:5, background:H.grayLt, width:"38%" }} />
          </div>
          <div style={{ width:44, height:44, borderRadius:"50%", background:H.grayLt, flexShrink:0 }} />
        </div>
        <div style={{ display:"flex", gap:5, marginBottom:12 }}>
          {[55,70,60].map((w,i) => <div key={i} style={{ height:22, borderRadius:20, background:H.grayLt, width:`${w}px` }} />)}
        </div>
        <div style={{ height:1, background:H.grayLt, marginBottom:10 }} />
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <div style={{ height:10, borderRadius:5, background:H.grayLt, width:"25%" }} />
          <div style={{ height:14, borderRadius:6, background:H.grayLt, width:"18%" }} />
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
      display:"flex", alignItems:"center", gap:8,
      background:H.blueLt, border:`1.5px solid ${H.blueMd}`,
      borderRadius:10, padding:"7px 12px",
    }}>
      <Clock size={12} color={H.blue} />
      <span className="hidden sm:block" style={{ fontSize:11.5, fontWeight:700, color:H.blue }}>Preview</span>
      <svg width="26" height="26" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r={r} fill="none" stroke={H.blueMd} strokeWidth="2.5" />
        <motion.circle cx="13" cy="13" r={r} fill="none" stroke={H.blue} strokeWidth="2.5"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - seconds / total)}
          style={{ transformOrigin:"13px 13px", transform:"rotate(-90deg)" }}
          transition={{ duration:0.4 }} />
        <text x="13" y="17" textAnchor="middle" fontSize="10" fontWeight="800" fill={H.blue}>{seconds}</text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────
   GATE OVERLAY
───────────────────────────── */
function GateOverlay({ query, count }: { query: string; count: number }) {
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5 }}
      style={{
        position:"absolute", inset:0, zIndex:40,
        display:"flex", alignItems:"flex-start", justifyContent:"center",
        paddingTop:"8vh",
        background:`linear-gradient(to bottom, rgba(244,247,255,0) 0%, rgba(244,247,255,0.92) 22%, rgba(244,247,255,0.99) 38%)`,
      }}
    >
      <motion.div
        initial={{ opacity:0, y:24, scale:0.97 }}
        animate={{ opacity:1, y:0, scale:1 }}
        transition={{ delay:0.1, duration:0.5, ease:[0.22,1,0.36,1] }}
        style={{
          width:"100%", maxWidth:460, margin:"0 16px",
          background:H.surface,
          border:`1.5px solid ${H.grayBd}`,
          borderRadius:24,
          boxShadow:"0 24px 64px -16px rgba(27,79,255,0.18), 0 8px 24px -6px rgba(0,0,0,0.08)",
          overflow:"hidden",
        }}
      >
        {/* Blue top bar — matches Hiralent button style */}
        <div style={{ height:4, background:`linear-gradient(90deg, ${H.blue}, #60A5FA)` }} />

        <div style={{ padding:"26px 28px 28px" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:5,
                background:H.blueLt, border:`1px solid ${H.blueMd}`,
                borderRadius:20, padding:"4px 12px", marginBottom:8,
              }}>
                <Sparkles size={11} color={H.blue} />
                <span style={{ fontSize:10.5, fontWeight:700, color:H.blue, letterSpacing:"0.05em" }}>
                  AI-Matched Results
                </span>
              </div>
              <p style={{ fontSize:13, color:H.gray }}>
                {query
                  ? <>Showing talent for <strong style={{ color:H.navy }}>"{query}"</strong></>
                  : "All verified talent"
                }
              </p>
            </div>
            <motion.div
              animate={{ rotate:[0,-8,8,0] }} transition={{ delay:1, duration:0.5 }}
              style={{
                width:44, height:44, borderRadius:12, flexShrink:0,
                background:H.blueLt, border:`1.5px solid ${H.blueMd}`,
                display:"grid", placeItems:"center",
              }}
            >
              <Lock size={17} color={H.blue} />
            </motion.div>
          </div>

          {/* Count + divider */}
          <div style={{
            textAlign:"center", padding:"16px 0 20px",
            borderTop:`1px solid ${H.grayLt}`, borderBottom:`1px solid ${H.grayLt}`,
            marginBottom:20,
          }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:4 }}>
              <motion.span
                initial={{ opacity:0, scale:0.7 }}
                animate={{ opacity:1, scale:1 }}
                transition={{ delay:0.25, type:"spring", stiffness:260, damping:14 }}
                style={{ fontSize:68, fontWeight:900, color:H.navy, lineHeight:1, letterSpacing:"-0.04em" }}
              >
                <AnimatedNumber to={count} />
              </motion.span>
              <span style={{ fontSize:38, fontWeight:900, color:H.blue, lineHeight:1, marginBottom:8 }}>+</span>
            </div>
            <p style={{ fontSize:13.5, color:H.gray, marginTop:4 }}>verified freelancers matched your search</p>

            {/* Avatar row */}
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:14 }}
            >
              <div style={{ display:"flex" }}>
                {[1,2,3,4,5].map((n,i) => (
                  <div key={i} style={{
                    width:30, height:30, borderRadius:"50%", overflow:"hidden",
                    border:`2.5px solid ${H.surface}`,
                    marginLeft: i === 0 ? 0 : -9, zIndex:5-i, position:"relative",
                    boxShadow:"0 2px 6px rgba(0,0,0,0.08)",
                  }}>
                    <img src={`/images/people${n}.png`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.background = `hsl(${i*55+210},70%,62%)`; e.currentTarget.style.display="none"; }} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize:12, color:H.gray }}>+ {count - 5} more ready to connect</span>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
            style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}
          >
            {[
              { icon:Zap,        val:"2h",   sub:"Avg reply",  color:"#1B4FFF", bg:H.blueLt,   border:H.blueMd   },
              { icon:TrendingUp, val:"94%",  sub:"Hire rate",  color:"#065F46", bg:"#ECFDF5", border:"#A7F3D0" },
              { icon:Shield,     val:"100%", sub:"Verified",   color:"#92400E", bg:"#FFF7ED", border:"#FED7AA" },
            ].map(({ icon:Icon, val, sub, color, bg, border }) => (
              <div key={sub} style={{
                borderRadius:12, padding:"12px 8px", textAlign:"center",
                background:bg, border:`1px solid ${border}`,
              }}>
                <Icon size={13} color={color} style={{ margin:"0 auto 5px" }} />
                <div style={{ fontSize:16, fontWeight:800, color:H.navy, letterSpacing:"-0.02em" }}>{val}</div>
                <div style={{ fontSize:9.5, fontWeight:600, color, marginTop:1 }}>{sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
            style={{
              borderRadius:14, padding:"14px 16px", marginBottom:20,
              background:H.bg, border:`1px solid ${H.grayBd}`,
            }}
          >
            <p style={{ fontSize:11, fontWeight:700, color:H.blue, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
              Create free account to unlock
            </p>
            {[
              { text:"Full profiles · portfolio · CV access",    color:H.success },
              { text:"Verified fit scores & skill assessments",  color:H.blue    },
              { text:"Message & hire talent instantly",          color:"#7C3AED"  },
            ].map(({ text, color }) => (
              <div key={text} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                <CheckCircle2 size={13} color={color} style={{ flexShrink:0 }} />
                <span style={{ fontSize:12.5, color:H.text, fontWeight:500 }}>{text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs — matches Hiralent "Get Started" style */}
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.56 }}
            style={{ display:"flex", flexDirection:"column", gap:10 }}
          >
            <Link href="/auth/signup">
              <motion.div
                whileHover={{ scale:1.02, boxShadow:`0 12px 32px -8px rgba(27,79,255,0.45)` }}
                whileTap={{ scale:0.98 }}
                style={{
                  borderRadius:12, padding:"13px 0", textAlign:"center",
                  background:H.blue, color:"#fff",
                  fontSize:14, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  cursor:"pointer",
                  boxShadow:`0 6px 20px -6px rgba(27,79,255,0.5)`,
                  position:"relative", overflow:"hidden",
                }}
              >
                <motion.div
                  style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)" }}
                  animate={{ x:["-100%","200%"] }}
                  transition={{ duration:2.5, repeat:Infinity, repeatDelay:1 }}
                />
                <Sparkles size={14} />
                Get Started — It's Free
                <ArrowRight size={14} />
              </motion.div>
            </Link>

            <Link href="/auth/login">
              <div
                style={{
                  borderRadius:12, padding:"11px 0", textAlign:"center",
                  border:`1.5px solid ${H.grayBd}`, color:H.gray,
                  fontSize:13, fontWeight:600, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                  transition:"all 0.18s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = H.blueMd; (e.currentTarget as HTMLElement).style.color = H.blue; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = H.grayBd; (e.currentTarget as HTMLElement).style.color = H.gray; }}
              >
                Already have an account? Sign in
                <ChevronRight size={13} />
              </div>
            </Link>
          </motion.div>

          <p style={{ textAlign:"center", marginTop:14, fontSize:11, color:H.muted }}>
            Free to start · No credit card required
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query    = searchParams.get("q") ?? "";
  const locParam = searchParams.get("location") ?? "";

  const TEASER = 4;
  const [timeLeft, setTimeLeft] = useState(TEASER);
  const [gated,    setGated]    = useState(false);
  const [started,  setStarted]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setLoading(false);
      const t2 = setTimeout(() => {
        setStarted(true);
        timer.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) { clearInterval(timer.current!); setGated(true); return 0; }
            return t - 1;
          });
        }, 1000);
      }, 300);
      return () => clearTimeout(t2);
    }, 850);
    return () => { clearTimeout(t1); if (timer.current) clearInterval(timer.current); };
  }, []);

  const total = MOCK_FREELANCERS.length + 38;

  return (
    <div style={{ minHeight:"100vh", background:H.bg, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* ─── NAV — matches Hiralent nav exactly ─── */}
      <div style={{
        position:"sticky", top:0, zIndex:30, background:"rgba(255,255,255,0.95)",
        backdropFilter:"blur(16px)", borderBottom:`1px solid ${H.grayBd}`,
        boxShadow:"0 1px 8px rgba(0,0,0,0.04)",
      }}>
        {/* Progress bar */}
        <div style={{ height:2, background:H.grayLt, overflow:"hidden" }}>
          {started && !gated && (
            <motion.div
              style={{ height:"100%", background:H.blue }}
              animate={{ width:`${(timeLeft / TEASER) * 100}%` }}
              transition={{ duration:0.4 }}
            />
          )}
        </div>

        <div style={{
          width:"92%", maxWidth:1200, margin:"0 auto",
          padding:"13px 0",
          display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
        }}>
          {/* Logo — styled like screenshot */}
          <Link href="/" style={{ flexShrink:0, marginRight:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:1 }}>
              <span style={{
                fontSize:20, fontWeight:900, letterSpacing:"-0.04em",
                color:H.navy, fontFamily:"'Plus Jakarta Sans', sans-serif",
              }}>
                <span style={{ color:H.blue }}>H</span>iralent
              </span>
            </div>
          </Link>

          {/* Search pill */}
          <div style={{
            flex:1, display:"flex", alignItems:"center", gap:8, minWidth:0,
            background:H.surface, border:`1.5px solid ${H.grayBd}`,
            borderRadius:10, padding:"9px 14px",
          }}>
            <Search size={14} color={H.muted} />
            <span style={{ fontSize:13.5, fontWeight:600, color:H.navy, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
              {query || "Job title, skill, or keyword..."}
            </span>
            {locParam && (
              <>
                <div style={{ width:1, height:16, background:H.grayBd, flexShrink:0 }} />
                <MapPin size={12} color={H.blue} />
                <span style={{ fontSize:12.5, fontWeight:700, color:H.blue, whiteSpace:"nowrap" }}>{locParam}</span>
              </>
            )}
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex" style={{ gap:24, alignItems:"center", flexShrink:0 }}>
            {["Find job","Companies"].map(item => (
              <span key={item} style={{ fontSize:13.5, fontWeight:500, color:H.gray, cursor:"pointer", whiteSpace:"nowrap" }}>{item}</span>
            ))}
          </nav>

          {/* Right controls */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button className="hidden sm:grid" style={{
              width:36, height:36, borderRadius:8, background:"transparent",
              border:`1.5px solid ${H.grayBd}`, placeItems:"center", cursor:"pointer",
              color:H.gray,
            }}>
              <SlidersHorizontal size={14} />
            </button>

            {/* Countdown */}
            <AnimatePresence>
              {started && !gated && (
                <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.85 }}>
                  <CountdownBadge seconds={timeLeft} total={TEASER} />
                </motion.div>
              )}
            </AnimatePresence>

            <span className="hidden sm:block" style={{ fontSize:13.5, fontWeight:500, color:H.gray, cursor:"pointer" }}>Employer</span>

            {/* Get Started — exact Hiralent style */}
            <Link href="/auth/login">
              <motion.div
                whileHover={{ scale:1.02, boxShadow:`0 6px 20px -4px rgba(27,79,255,0.4)` }}
                whileTap={{ scale:0.97 }}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  borderRadius:8, padding:"8px 16px",
                  background:H.blue, color:"#fff",
                  fontSize:13, fontWeight:700, cursor:"pointer",
                  boxShadow:`0 3px 12px -4px rgba(27,79,255,0.45)`,
                  whiteSpace:"nowrap",
                }}
              >
                <ArrowRight size={14} />
                Get Started
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ width:"92%", maxWidth:1200, margin:"0 auto" }}>

        {/* Results header */}
        <div style={{ paddingTop:28, paddingBottom:18 }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="l" exit={{ opacity:0 }} style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ height:22, width:240, borderRadius:8, background:H.grayBd }} />
                <div style={{ height:13, width:160, borderRadius:6, background:H.grayLt }} />
              </motion.div>
            ) : (
              <motion.div key="h" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <h1 style={{ fontSize:26, fontWeight:800, color:H.navy, letterSpacing:"-0.03em", lineHeight:1 }}>
                    <AnimatedNumber to={total} /> freelancers found
                  </h1>
                  {query && (
                    <span style={{
                      fontSize:13.5, fontWeight:700,
                      background:H.blueLt, color:H.blue,
                      border:`1.5px solid ${H.blueMd}`,
                      borderRadius:8, padding:"3px 12px",
                    }}>"{query}"</span>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                  <span style={{ position:"relative", display:"flex" }}>
                    <span className="animate-ping" style={{ position:"absolute", inset:0, borderRadius:"50%", background:H.success, opacity:0.5 }} />
                    <span style={{ position:"relative", width:8, height:8, borderRadius:"50%", background:H.success, display:"block" }} />
                  </span>
                  <span style={{ fontSize:12.5, color:H.gray }}>
                    Sorted by AI match score · Updated live
                  </span>
                  <div style={{ flex:1, height:1, background:H.grayBd, maxWidth:180 }} />
                  <span style={{ fontSize:12, color:H.muted }}>Showing top {MOCK_FREELANCERS.length}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cards grid */}
        <div style={{ paddingBottom:120, position:"relative" }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="sk" exit={{ opacity:0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap:14 }}>
                {Array.from({ length:9 }).map((_,i) => <SkeletonCard key={i} index={i} />)}
              </motion.div>
            ) : (
              <motion.div key="cards"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap:14 }}>
                {MOCK_FREELANCERS.map((f,i) => (
                  <FreelancerCard key={f.id} f={f} index={i} blurred={gated} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ghost rows */}
          {!loading && !gated && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap:14, marginTop:14, filter:"blur(6px)", opacity:0.2, pointerEvents:"none" }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  background:H.surface, borderRadius:16, height:160,
                  border:`1.5px solid ${H.grayBd}`,
                }} />
              ))}
            </div>
          )}

          {/* Gate */}
          <AnimatePresence>
            {gated && <GateOverlay query={query} count={total} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
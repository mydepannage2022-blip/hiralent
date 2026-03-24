"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  CheckCircle2, Zap, Star, Award, Users, TrendingUp,
  MapPin, Code2, Terminal, Brain, FileCode2, Cloud, Server,
  Flame, Briefcase, BadgeDollarSign, Globe2,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ══ Land detection — precise boxes + sea exclusions ══════════
   Strategy: check inclusion first, then exclude major inland seas
   so continent shapes follow real coastlines.              ════ */
function isLand(la: number, lo: number): boolean {

  // ── Explicit sea exclusions (override land boxes below) ───
  // Mediterranean Sea
  if (la > 30 && la < 42 && lo > 5   && lo < 22  && !(la > 38 && lo > 12 && lo < 18)) return false; // central Med (keep Italy)
  if (la > 35 && la < 42 && lo > 22  && lo < 30)  return false; // Aegean Sea
  // Black Sea
  if (la > 41 && la < 47 && lo > 29  && lo < 41  && !(la > 42 && la < 44 && lo > 38 && lo < 42)) return false;
  // Caspian Sea
  if (la > 37 && la < 47 && lo > 49  && lo < 55)  return false;
  // Red Sea
  if (la > 12 && la < 30 && lo > 32  && lo < 44  && lo < la + 22 && lo > la - 10) return false;
  // Persian Gulf
  if (la > 23 && la < 30 && lo > 48  && lo < 57)  return false;
  // Baltic Sea
  if (la > 55 && la < 66 && lo > 10  && lo < 26  && !(la > 58 && la < 70 && lo > 14 && lo < 32)) return false;
  // Hudson Bay
  if (la > 51 && la < 64 && lo > -95 && lo < -75) return false;
  // Gulf of Mexico
  if (la > 18 && la < 31 && lo > -98 && lo < -82 && !(la > 18 && la < 22 && lo > -98 && lo < -86)) return false;
  // Caribbean Sea gaps
  if (la > 13 && la < 19 && lo > -75 && lo < -62) return false;
  // Bay of Bengal
  if (la > 8  && la < 22 && lo > 80  && lo < 92  && !(la > 8 && la < 24 && lo > 68 && lo < 80) && !(la > 15 && la < 25 && lo > 88 && lo < 102)) return false;
  // Arabian Sea gap
  if (la > 8  && la < 22 && lo > 57  && lo < 68  && !(la > 22 && la < 30 && lo > 56 && lo < 62)) return false;

  // ── NORTH AMERICA ─────────────────────────────────────────
  if (la > 76 && la < 84 && lo > -75  && lo < -16)  return true; // Greenland north
  if (la > 60 && la < 77 && lo > -55  && lo < -16)  return true; // Greenland south
  if (la > 54 && la < 72 && (lo > 168 || lo < -130)) return true; // Alaska
  if (la > 60 && la < 70 && lo > -140 && lo < -130) return true; // Alaska east
  if (la > 55 && la < 70 && lo > -140 && lo < -96)  return true; // Canada BC+Yukon
  if (la > 45 && la < 60 && lo > -95  && lo < -52)  return true; // Canada east
  if (la > 56 && la < 68 && lo > -96  && lo < -65)  return true; // Canada central north
  if (la > 44 && la < 57 && lo > -100 && lo < -74)  return true; // Great Lakes region
  if (la > 32 && la < 49 && lo > -125 && lo < -66)  return true; // Continental USA
  if (la > 24 && la < 32 && lo > -90  && lo < -80)  return true; // Florida + Gulf coast
  if (la > 14 && la < 32 && lo > -118 && lo < -86)  return true; // Mexico
  if (la > 8  && la < 18 && lo > -92  && lo < -77)  return true; // Central America
  if (la > 19 && la < 23 && lo > -85  && lo < -74)  return true; // Cuba
  if (la > 17 && la < 20 && lo > -74  && lo < -66)  return true; // Hispaniola + PR
  if (la > 10 && la < 14 && lo > -85  && lo < -82)  return true; // Costa Rica / Panama

  // ── SOUTH AMERICA ─────────────────────────────────────────
  if (la > 8  && la < 12 && lo > -73  && lo < -60)  return true; // Venezuela + Trinidad
  if (la > -5 && la <  8 && lo > -78  && lo < -50)  return true; // Colombia, Guianas, N.Brazil
  if (la > -5 && la < -1 && lo > -50  && lo < -34)  return true; // NE Brazil coast
  if (la >-12 && la < -5 && lo > -76  && lo < -36)  return true; // Brazil central
  if (la >-22 && la <-12 && lo > -65  && lo < -38)  return true; // Brazil south + Bolivia
  if (la >-35 && la <-22 && lo > -70  && lo < -40)  return true; // Argentina + Uruguay + S.Brazil
  if (la >-55 && la <-35 && lo > -76  && lo < -62)  return true; // Patagonia
  if (la > -5 && la <  4 && lo > -82  && lo < -75)  return true; // Ecuador/Colombia west
  if (la >-18 && la < -5 && lo > -82  && lo < -65)  return true; // Peru + Bolivia west

  // ── EUROPE ────────────────────────────────────────────────
  if (la > 36 && la < 44 && lo > -10  && lo < 4)    return true; // Iberian Peninsula
  if (la > 43 && la < 51 && lo > -5   && lo < 9)    return true; // France
  if (la > 50 && la < 59 && lo > -5   && lo < 2)    return true; // UK Great Britain
  if (la > 51 && la < 56 && lo > -11  && lo < -5)   return true; // Ireland
  if (la > 47 && la < 55 && lo > 6    && lo < 16)   return true; // Germany + BeNeLux + Austria
  if (la > 55 && la < 58 && lo > 8    && lo < 13)   return true; // Denmark
  if (la > 55 && la < 72 && lo > 4    && lo < 18)   return true; // Norway
  if (la > 56 && la < 70 && lo > 11   && lo < 25)   return true; // Sweden
  if (la > 60 && la < 70 && lo > 24   && lo < 32)   return true; // Finland
  if (la > 53 && la < 60 && lo > 20   && lo < 28)   return true; // Baltic states
  if (la > 49 && la < 55 && lo > 14   && lo < 24)   return true; // Poland + Czech
  if (la > 46 && la < 50 && lo > 14   && lo < 25)   return true; // Slovakia + Hungary
  if (la > 43 && la < 47 && lo > 11   && lo < 29)   return true; // Romania + Serbia + Croatia
  if (la > 37 && la < 46 && lo > 7    && lo < 18)   return true; // Italy
  if (la > 36 && la < 38 && lo > 11   && lo < 16)   return true; // Sicily
  if (la > 35 && la < 42 && lo > 20   && lo < 27)   return true; // Greece + islands
  if (la > 43 && la < 48 && lo > 22   && lo < 30)   return true; // Ukraine west + Moldova
  if (la > 48 && la < 53 && lo > 22   && lo < 40)   return true; // Ukraine
  if (la > 53 && la < 57 && lo > 22   && lo < 34)   return true; // Belarus
  if (la > 63 && la < 67 && lo > -25  && lo < -13)  return true; // Iceland
  if (la > 36 && la < 42 && lo > 26   && lo < 44)   return true; // Turkey

  // ── AFRICA ────────────────────────────────────────────────
  if (la > 28 && la < 38 && lo > -6   && lo < 13)   return true; // Morocco + Algeria coast
  if (la > 18 && la < 36 && lo > -18  && lo < -6)   return true; // Morocco + W.Sahara
  if (la > 18 && la < 32 && lo > 8    && lo < 28)   return true; // Libya + N.Niger + Chad
  if (la > 22 && la < 32 && lo > 22   && lo < 37)   return true; // Egypt + N.Sudan
  if (la > 10 && la < 20 && lo > -18  && lo < 3)    return true; // Mauritania + Senegal + Guinea
  if (la >  4 && la < 14 && lo > -18  && lo < 3)    return true; // Sierra Leone + Liberia + Ivory Coast
  if (la >  4 && la < 12 && lo > 2    && lo < 14)   return true; // Ghana + Togo + Nigeria west
  if (la >  4 && la < 10 && lo > 2    && lo < 10)   return true; // Benin + Nigeria
  if (la >  4 && la < 12 && lo > 6    && lo < 16)   return true; // Nigeria + Cameroon
  if (la > 10 && la < 22 && lo > 12   && lo < 26)   return true; // Chad + N.Cameroon
  if (la > 10 && la < 18 && lo > 24   && lo < 40)   return true; // Sudan + Ethiopia N
  if (la > -2 && la < 10 && lo > 8    && lo < 42)   return true; // Congo basin + Kenya + Uganda
  if (la >  0 && la < 12 && lo > 40   && lo < 52)   return true; // Ethiopia + Somalia + Horn
  if (la > -5 && la <  2 && lo > 30   && lo < 42)   return true; // Tanzania + Kenya coast
  if (la >-18 && la < -5 && lo > 12   && lo < 42)   return true; // Angola + Zambia + Tanzania
  if (la >-35 && la <-18 && lo > 14   && lo < 36)   return true; // South Africa + Namibia + Botswana
  if (la >-26 && la <-12 && lo > 43   && lo < 51)   return true; // Madagascar

  // ── RUSSIA ────────────────────────────────────────────────
  if (la > 50 && la < 58 && lo > 36   && lo < 60)   return true; // Russia south-west
  if (la > 56 && la < 68 && lo > 32   && lo < 60)   return true; // Russia west of Urals
  if (la > 50 && la < 68 && lo > 56   && lo < 90)   return true; // Russia W Siberia
  if (la > 52 && la < 72 && lo > 88   && lo < 130)  return true; // Russia C+E Siberia
  if (la > 50 && la < 68 && lo > 128  && lo < 142)  return true; // Russian Far East
  if (la > 44 && la < 68 && lo > 138  && lo < 162)  return true; // Kamchatka + Sakhalin
  if (la > 66 && la < 73 && lo > 52   && lo < 138)  return true; // Russia Arctic coast

  // ── ASIA (rest) ────────────────────────────────────────────
  if (la > 38 && la < 50 && lo > 55   && lo < 82)   return true; // Kazakhstan + Uzbekistan
  if (la > 36 && la < 44 && lo > 52   && lo < 66)   return true; // Turkmenistan + Iran N
  if (la > 24 && la < 40 && lo > 44   && lo < 64)   return true; // Iran
  if (la > 29 && la < 38 && lo > 36   && lo < 46)   return true; // Iraq + Syria + Jordan
  if (la > 14 && la < 30 && lo > 42   && lo < 58)   return true; // Arabian Peninsula W
  if (la > 14 && la < 25 && lo > 56   && lo < 60)   return true; // Oman
  if (la > 22 && la < 30 && lo > 56   && lo < 60)   return true; // UAE + Oman N
  if (la > 24 && la < 38 && lo > 62   && lo < 76)   return true; // Pakistan + Afghanistan
  if (la > 36 && la < 42 && lo > 62   && lo < 72)   return true; // Tajikistan + Afghanistan N
  if (la >  8 && la < 24 && lo > 68   && lo < 80)   return true; // India west
  if (la >  8 && la < 24 && lo > 78   && lo < 92)   return true; // India east + Bangladesh S
  if (la > 24 && la < 36 && lo > 72   && lo < 88)   return true; // India N + Nepal + Bhutan
  if (la > 26 && la < 38 && lo > 70   && lo < 80)   return true; // Pakistan + India NW
  if (la > 14 && la < 26 && lo > 92   && lo < 102)  return true; // Myanmar
  if (la >  5 && la < 20 && lo > 98   && lo < 110)  return true; // Thailand + Indochina
  if (la > -2 && la <  6 && lo > 100  && lo < 105)  return true; // Malay Peninsula
  if (la > 20 && la < 40 && lo > 100  && lo < 122)  return true; // China south
  if (la > 38 && la < 54 && lo > 76   && lo < 122)  return true; // China north + Mongolia
  if (la > 34 && la < 43 && lo > 122  && lo < 132)  return true; // Korean Peninsula
  if (la > 30 && la < 46 && lo > 129  && lo < 146)  return true; // Japan Honshu+Hokkaido
  if (la > 26 && la < 32 && lo > 128  && lo < 132)  return true; // Japan Kyushu
  if (la > -6 && la <  6 && lo > 95   && lo < 108)  return true; // Sumatra
  if (la > -4 && la <  4 && lo > 108  && lo < 120)  return true; // Borneo
  if (la > -9 && la < -6 && lo > 105  && lo < 116)  return true; // Java
  if (la >  5 && la < 20 && lo > 117  && lo < 127)  return true; // Philippines
  if (la >  5 && la < 10 && lo > 79   && lo < 82)   return true; // Sri Lanka
  if (la > 22 && la < 26 && lo > 120  && lo < 122)  return true; // Taiwan
  if (la > 36 && la < 56 && lo > 126  && lo < 143)  return true; // Korea + Japan main
  if (la > 60 && la < 74 && lo > 140  && lo < 170)  return true; // Chukotka + Kamchatka

  // ── OCEANIA ───────────────────────────────────────────────
  if (la >-14 && la < -8 && lo > 130  && lo < 142)  return true; // N.Territory top
  if (la >-28 && la <-14 && lo > 130  && lo < 140)  return true; // N.Territory south
  if (la >-14 && la < -8 && lo > 142  && lo < 154)  return true; // Queensland N
  if (la >-30 && la <-14 && lo > 138  && lo < 154)  return true; // Queensland + NSW
  if (la >-38 && la <-30 && lo > 140  && lo < 154)  return true; // Victoria + NSW south
  if (la >-38 && la <-26 && lo > 114  && lo < 130)  return true; // W.Australia south
  if (la >-26 && la <-14 && lo > 114  && lo < 130)  return true; // W.Australia north
  if (la >-36 && la <-28 && lo > 130  && lo < 142)  return true; // South Australia
  if (la >-44 && la <-40 && lo > 144  && lo < 148)  return true; // Tasmania
  if (la >-47 && la <-34 && lo > 166  && lo < 178)  return true; // New Zealand
  if (la > -9 && la < -4 && lo > 141  && lo < 156)  return true; // Papua New Guinea

  // ── ANTARCTICA ────────────────────────────────────────────
  if (la < -70) return true;

  return false;
}

/* ══ Globe Canvas ═════════════════════════════════════════════ */
const GlobeCanvas: React.FC<{ size: number }> = ({ size }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.z = 2.65;

    /* circular soft-dot sprite */
    const makeDot = (): THREE.CanvasTexture => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0,   "rgba(255,255,255,1)");
      g.addColorStop(0.5, "rgba(255,255,255,0.9)");
      g.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
      return new THREE.CanvasTexture(c);
    };
    const dot = makeDot();

    /* ocean base — MeshBasicMaterial: no lighting needed, pure dark navy */
    const base = new THREE.Mesh(
      new THREE.SphereGeometry(0.997, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x020E1E })
    );

    /* land Fibonacci dots — 80 000 pts for sharp continent shapes */
    const N = 80000;
    const lp: number[] = [], lc: number[] = [];
    for (let i = 0; i < N; i++) {
      const phi   = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = 2 * Math.PI * i * 1.6180339887;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      const lat = (Math.asin(y)     * 180) / Math.PI;
      const lon = (Math.atan2(z, x) * 180) / Math.PI;
      if (!isLand(lat, lon)) continue;

      lp.push(x, y, z);
      const t = (lat + 90) / 180;
      // deep blue (poles) → bright cyan (equator) — same as original style
      const col = new THREE.Color().lerpColors(
        new THREE.Color("#1565D0"), new THREE.Color("#00D4FF"), t * 0.55 + 0.15
      );
      lc.push(col.r, col.g, col.b);
    }
    const landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    landGeo.setAttribute("color",    new THREE.Float32BufferAttribute(lc, 3));
    const landMat = new THREE.PointsMaterial({
      size: 0.015, map: dot, alphaTest: 0.10,
      vertexColors: true, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false,
    });
    const landPts = new THREE.Points(landGeo, landMat);

    /* city lights */
    const CITIES: [number, number][] = [
      [40.7,-74],[51.5,-0.1],[48.9,2.3],[35.7,139.7],[1.3,103.8],
      [25.2,55.3],[19.1,72.9],[55.7,37.6],[-33.9,18.4],[37.6,126.9],
      [31.2,121.5],[-23.5,-46.6],[34,-118.2],[41.9,12.5],[52.5,13.4],
      [30,31.2],[13.8,100.5],[43.6,-79.4],[59.9,10.7],[28.6,77.2],
    ];
    const cp: number[] = [];
    for (const [la, lo] of CITIES) {
      const phi   = (90 - la) * (Math.PI / 180);
      const theta = (lo + 180) * (Math.PI / 180);
      cp.push(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta));
    }
    const cityGeo = new THREE.BufferGeometry();
    cityGeo.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
    const cityMat = new THREE.PointsMaterial({
      size: 0.052, map: dot, alphaTest: 0.12,
      color: 0xFFF8E1, transparent: true, opacity: 0.98,
      sizeAttenuation: true, depthWrite: false,
    });
    const cityPts = new THREE.Points(cityGeo, cityMat);

    /* atmosphere rim — no lighting: MeshBasicMaterial */
    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(1.09, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x1B60CC, side: THREE.BackSide, transparent: true, opacity: 0.13 })
    );

    const globe = new THREE.Group();
    globe.add(base, landPts, cityPts, atmos);
    globe.rotation.y = 0.52;
    scene.add(globe);
    /* no lights — all materials are Basic, globe looks clean and uniform */

    let raf: number;
    const tick = () => { raf = requestAnimationFrame(tick); globe.rotation.y += 0.002; renderer.render(scene, camera); };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      dot.dispose(); renderer.dispose();
      landGeo.dispose(); landMat.dispose();
      cityGeo.dispose(); cityMat.dispose();
    };
  }, [size]);

  return <canvas ref={ref} style={{ display: "block", width: size, height: size }} />;
};

/* ══ Live ticker ═══════════════════════════════════════════════ */
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
        <motion.p key={i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.2 }} className="text-[10.5px] text-[#64748B] whitespace-nowrap">
          <span className="font-semibold text-[#0b1b3a]">{FEED[i].name}</span> {FEED[i].msg}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/* ══ Animated counter ══════════════════════════════════════════ */
const Count: React.FC<{ to: number; suffix?: string; duration?: number }> = ({ to, suffix = "", duration = 1.2 }) => {
  const [v, setV] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const ctrl = animate(0, to, { duration, ease: "easeOut", onUpdate: n => setV(Math.round(n)) });
    return ctrl.stop;
  }, [to, duration]);
  return <>{v}{suffix}</>;
};

/* ══ Floating job cards with location ════════════════════════ */
const FLOAT_JOBS = [
  { label: "Frontend Engineer", company: "Stripe",  flag: "🇺🇸", city: "San Francisco", color: "#635BFF", top: "8%",  left: "34%", dy: -7  },
  { label: "Product Designer",  company: "Figma",   flag: "🇬🇧", city: "London",        color: "#F24E1E", top: "16%", left: "68%", dy: -6  },
  { label: "ML Engineer",       company: "Sony",    flag: "🇯🇵", city: "Tokyo",          color: "#E60012", top: "46%", left: "74%", dy: -10 },
  { label: "Data Scientist",    company: "M-Pesa",  flag: "🇰🇪", city: "Nairobi",        color: "#00A350", top: "68%", left: "60%", dy: -7  },
  { label: "Backend Dev",       company: "Grab",    flag: "🇸🇬", city: "Singapore",      color: "#00B14F", top: "70%", left: "16%", dy: -9  },
  { label: "Finance Analyst",   company: "ADNOC",   flag: "🇦🇪", city: "Abu Dhabi",      color: "#009A3B", top: "34%", left: "12%", dy: -6  },
];

/* ══ Floating skill chips — Lucide icons ══════════════════════ */
const SKILLS: { label: string; Icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string; bg: string; top: string; left: string; hot: boolean }[] = [
  { label: "React",      Icon: Code2,     color: "#1B73E8", bg: "rgba(27,115,232,0.09)",  top: "4%",  left: "53%", hot: true  },
  { label: "Python",     Icon: Terminal,  color: "#D4690A", bg: "rgba(212,105,10,0.09)",  top: "27%", left: "72%", hot: true  },
  { label: "AI / ML",    Icon: Brain,     color: "#7C3AED", bg: "rgba(124,58,237,0.09)",  top: "62%", left: "72%", hot: true  },
  { label: "TypeScript", Icon: FileCode2, color: "#1B73E8", bg: "rgba(27,115,232,0.09)",  top: "80%", left: "42%", hot: false },
  { label: "Cloud",      Icon: Cloud,     color: "#0891B2", bg: "rgba(8,145,178,0.09)",   top: "56%", left: "14%", hot: false },
  { label: "Node.js",    Icon: Server,    color: "#15803D", bg: "rgba(21,128,61,0.09)",   top: "22%", left: "16%", hot: false },
];

/* ══ Compact scenes ════════════════════════════════════════════ */
const ROLES = [
  { label: "Frontend Developer", color: "#005DDC" },
  { label: "Data Scientist",     color: "#6D28D9" },
  { label: "Product Designer",   color: "#D9480F" },
  { label: "Backend Engineer",   color: "#0C8346" },
  { label: "AI Engineer",        color: "#0E7490" },
];
const MATCHES = [
  { co: "Stripe", initial: "S", color: "#635BFF", role: "Frontend Eng",  pct: 96 },
  { co: "Figma",  initial: "F", color: "#F24E1E", role: "Product Design", pct: 91 },
  { co: "Airbnb", initial: "A", color: "#FF385C", role: "Data Scientist", pct: 87 },
];
const CompactScene1: React.FC = () => {
  const [ri, setRi] = useState(0);
  useEffect(() => { const t = setInterval(() => setRi(p => (p+1) % ROLES.length), 2600); return () => clearInterval(t); }, []);
  const role = ROLES[ri];
  return (
    <motion.div key="cs1" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      transition={{ duration:0.4, ease:EASE }} className="flex flex-col gap-2 w-full">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 mb-2"
          style={{ border:"1px solid rgba(0,93,220,0.18)", background:"rgba(0,93,220,0.06)" }}>
          <Zap size={10} style={{ color:"#005DDC" }} />
          <span className="text-[10px] font-semibold text-[#005DDC]">AI‑Powered Matching</span>
        </div>
        <h3 className="font-bold text-[#0b1b3a] leading-tight" style={{ fontSize:"1.1rem", letterSpacing:"-0.03em" }}>
          Find your dream{" "}
          <span className="relative inline-block overflow-hidden align-bottom" style={{ minWidth:160 }}>
            <AnimatePresence mode="wait">
              <motion.span key={ri} className="inline-block font-bold" style={{ color:role.color }}
                initial={{ y:"100%", opacity:0 }} animate={{ y:"0%", opacity:1 }} exit={{ y:"-100%", opacity:0 }}
                transition={{ duration:0.35, ease:EASE }}>
                {role.label}
              </motion.span>
            </AnimatePresence>
          </span>{" "}role.
        </h3>
      </div>
      <div className="flex flex-col gap-1.5">
        {MATCHES.map((m, i) => (
          <motion.div key={m.co} initial={{ opacity:0, x:14 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:0.12+i*0.09, duration:0.35, ease:EASE }}
            className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2"
            style={{ border:"1px solid #E6ECF8", boxShadow:"0 1px 8px rgba(0,20,60,0.06)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background:m.color }}>{m.initial}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#0b1b3a] truncate">{m.role}</p>
              <p className="text-[9.5px] text-[#64748B]">{m.co}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[11px] font-black" style={{ color:"#005DDC" }}>{m.pct}%</span>
              <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background:"#EAF3FF" }}>
                <motion.div className="h-full rounded-full" style={{ background:"#005DDC" }}
                  initial={{ width:0 }} animate={{ width:`${m.pct}%` }}
                  transition={{ delay:0.4+i*0.08, duration:0.7, ease:"easeOut" }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const CODE_LINES = [
  { t: `function twoSum(nums, target) {`,      c: "#2563EB", d: 0.1 },
  { t: `  const map = new Map();`,             c: "#374151", d: 0.5 },
  { t: `  for (let i = 0; i < nums.length; i++) {`, c: "#374151", d: 0.9 },
  { t: `    if (map.has(target - nums[i]))`,   c: "#15803D", d: 1.3 },
  { t: `      return [map.get(…), i];`,        c: "#15803D", d: 1.7 },
  { t: `    map.set(nums[i], i);`,             c: "#374151", d: 2.1 },
  { t: `  }`,                                  c: "#374151", d: 2.4 },
  { t: `}`,                                    c: "#2563EB", d: 2.6 },
];
const TypeLine: React.FC<{ text:string; color:string; delay:number }> = ({ text, color, delay }) => {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let idx = 0;
    const t = setTimeout(() => {
      const iv = setInterval(() => { idx++; setShown(text.slice(0,idx)); if (idx >= text.length) clearInterval(iv); }, 14);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <div className="font-mono text-[9.5px] leading-snug" style={{ color }}>{shown || " "}</div>;
};
const CompactScene2: React.FC = () => (
  <motion.div key="cs2" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
    transition={{ duration:0.4, ease:EASE }} className="flex flex-col gap-2 w-full">
    <div className="flex items-center justify-between">
      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
        style={{ border:"1px solid rgba(124,58,237,0.18)", background:"rgba(124,58,237,0.06)" }}>
        <Award size={10} className="text-violet-600" />
        <span className="text-[10px] font-semibold text-violet-700">Skill Verification</span>
      </div>
      <span className="text-[10px] font-bold text-[#0b1b3a]">Score: <Count to={94} suffix="/100" duration={1.4} /></span>
    </div>
    <div className="rounded-xl overflow-hidden" style={{ background:"#F8FAFF", border:"1px solid #DDE8FF", boxShadow:"0 4px 16px rgba(0,40,120,0.08)" }}>
      <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor:"#DDE8FF", background:"#EEF3FF" }}>
        {["#FF5F57","#FEBC2E","#28C840"].map(c => <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ background:c }} />)}
        <span className="ml-2 text-[8.5px] font-mono text-[#94A3B8]">two-sum.js — assessment</span>
      </div>
      <div className="px-3 py-2">{CODE_LINES.map((l,i) => <TypeLine key={i} text={l.t} color={l.c} delay={l.d} />)}</div>
      <div className="grid grid-cols-3 border-t" style={{ borderColor:"#DDE8FF" }}>
        {[{l:"Runtime",v:"92ms",c:"#2563EB"},{l:"Memory",v:"42MB",c:"#7C3AED"},{l:"Score",v:"94%",c:"#16A34A"}].map(m=>(
          <div key={m.l} className="flex flex-col items-center py-1.5 border-r last:border-r-0" style={{ borderColor:"#DDE8FF" }}>
            <span className="text-[9px] font-bold font-mono" style={{ color:m.c }}>{m.v}</span>
            <span className="text-[7.5px] text-[#94A3B8]">{m.l}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const CompactScene3: React.FC = () => {
  const [sent, setSent] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSent(true), 2200); return () => clearTimeout(t); }, []);
  return (
    <motion.div key="cs3" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      transition={{ duration:0.4, ease:EASE }} className="flex flex-col gap-2 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
        style={{ border:"1px solid rgba(0,163,90,0.18)", background:"rgba(0,163,90,0.06)" }}>
        <TrendingUp size={10} className="text-[#00A35A]" />
        <span className="text-[10px] font-semibold text-[#00A35A]">Hiring Decision</span>
      </div>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border:"1px solid #E6ECF8", boxShadow:"0 4px 18px rgba(0,0,0,0.06)" }}>
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">A</div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-[#0b1b3a]">Ahmed Rahim</p>
            <p className="text-[9.5px] text-[#64748B]">Senior Frontend Engineer</p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"rgba(0,93,220,0.08)", border:"2px solid #005DDC" }}>
            <span className="text-[10px] font-black text-[#005DDC]">96%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
          {[{l:"Skills ✓",c:"#00A35A",bg:"#EAFBF2"},{l:"AI Match",c:"#005DDC",bg:"#EAF3FF"},{l:"Top 5%",c:"#7C3AED",bg:"#F3EEFF"}].map(s=>(
            <div key={s.l} className="rounded-lg px-1.5 py-1.5 text-center" style={{ background:s.bg }}>
              <p className="text-[9px] font-semibold" style={{ color:s.c }}>{s.l}</p>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <motion.button onClick={()=>setSent(true)} className="w-full py-2 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background:sent?"#0C8346":"#00A35A", boxShadow:sent?"none":"0 3px 12px rgba(0,163,90,0.22)" }}>
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.span key="s" initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:400, damping:18 }} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12}/> Offer Sent!
                </motion.span>
              ) : (
                <motion.span key="i" initial={{ opacity:0 }} animate={{ opacity:1 }}>Send Offer →</motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const SCENES = [
  { id: 0, label: "Matching",   accent: "#005DDC", dur: 6000 },
  { id: 1, label: "Assessment", accent: "#7C3AED", dur: 7500 },
  { id: 2, label: "Get Hired",  accent: "#00A35A", dur: 5500 },
];

/* ══ Responsive globe size hook ═══════════════════════════════ */
function useGlobeSize() {
  const [size, setSize] = useState(520);
  useEffect(() => {
    const update = () => {
      const panelW = window.innerWidth * 0.6;
      const panelH = window.innerHeight;
      // fill 80% of the shorter dimension, max 600
      setSize(Math.min(Math.round(Math.min(panelW, panelH) * 0.82), 600));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

/* ══ Main panel ════════════════════════════════════════════════ */
const AuthBrandPanel: React.FC = () => {
  const [scene, setScene] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globeSize = useGlobeSize();

  const schedule = (cur: number, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = (cur + 1) % SCENES.length;
      setScene(next);
      schedule(next, SCENES[next].dur);
    }, ms);
  };
  useEffect(() => {
    schedule(0, SCENES[0].dur);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goTo = (i: number) => { setScene(i); schedule(i, SCENES[i].dur); };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(108deg, #ffffff 0%, #f0f7ff 16%, #e4f0ff 46%, #d6e8ff 100%)" }}
    >

      {/* ── Left-edge blend: matches form panel white, narrower to not cut content ── */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none z-30"
        style={{ width: 40, background: "linear-gradient(to right, #ffffff 0%, transparent 100%)" }}
      />

      {/* ── Subtle dot-grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(37,99,235,0.16) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.45,
        }}
      />

      {/* ── Decorative orbit rings — centered in panel ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.10 }}
      >
        <circle cx="50%" cy="50%" r="310" fill="none" stroke="#2563EB" strokeWidth="1" strokeDasharray="5 10" />
        <circle cx="50%" cy="50%" r="390" fill="none" stroke="#2563EB" strokeWidth="0.6" strokeDasharray="2 14" />
      </svg>

      {/* ── Globe — FLEX-CENTERED so it's always in the middle of the panel ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="relative flex-shrink-0"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* white halo — blends the dark globe softly into the light panel */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -80,
              background: "radial-gradient(circle, rgba(255,255,255,0.0) 38%, rgba(230,242,255,0.55) 58%, rgba(255,255,255,0.92) 76%, #ffffff 90%)",
            }}
          />
          {/* blue atmospheric glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -12,
              boxShadow: "0 0 80px 24px rgba(20,80,200,0.14), 0 0 160px 60px rgba(20,80,200,0.06)",
            }}
          />
          <GlobeCanvas size={globeSize} />
        </motion.div>
      </div>

      {/* ── Floating job cards with Lucide location pin ── */}
      {FLOAT_JOBS.map((j, i) => (
        <motion.div
          key={j.company}
          className="absolute flex flex-col items-start pointer-events-none"
          style={{ top: j.top, left: j.left }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1, y: [0, j.dy, 0] }}
          transition={{
            opacity: { delay: 0.3 + i * 0.15, duration: 0.45 },
            scale:   { delay: 0.3 + i * 0.15, duration: 0.45 },
            y: { duration: 3.2 + i * 0.35, repeat: Infinity, ease: "easeInOut", delay: i * 0.55 },
          }}
        >
          {/* location pin row */}
          <div className="flex items-center gap-1 mb-1 ml-0.5">
            <div
              className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: j.color, boxShadow: `0 0 10px ${j.color}80` }}
            >
              <MapPin size={9} color="white" strokeWidth={2.5} />
            </div>
            <span className="text-[8px] font-bold whitespace-nowrap tracking-wide" style={{ color: j.color }}>
              {j.city}
            </span>
          </div>

          {/* card */}
          <div
            className="flex items-center gap-2 rounded-2xl px-2.5 py-2"
            style={{
              background: "rgba(255,255,255,0.96)",
              border: `1.5px solid ${j.color}20`,
              backdropFilter: "blur(18px)",
              boxShadow: `0 6px 24px rgba(0,40,120,0.10), 0 0 0 1px ${j.color}12`,
            }}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[10px] font-black"
              style={{ background: `linear-gradient(135deg, ${j.color}, ${j.color}CC)`, boxShadow: `0 2px 8px ${j.color}50` }}
            >
              {j.company[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#0b1b3a] whitespace-nowrap leading-tight">{j.label}</p>
              <div className="flex items-center gap-1">
                <Briefcase size={7} style={{ color: "#94A3B8" }} />
                <p className="text-[8.5px] text-[#64748B] leading-tight">{j.company}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5 ml-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00A35A] animate-pulse" />
              <span className="text-[6.5px] text-[#00A35A] font-semibold">LIVE</span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* ── Floating skill chips — Lucide icons, no emojis ── */}
      {SKILLS.map((s, i) => (
        <motion.div
          key={s.label}
          className="absolute pointer-events-none"
          style={{ top: s.top, left: s.left }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
          transition={{
            opacity: { delay: 0.65 + i * 0.18, duration: 0.4 },
            scale:   { delay: 0.65 + i * 0.18, duration: 0.4 },
            y: { duration: 2.8 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 },
          }}
        >
          <div
            className="flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1.5"
            style={{
              color: s.color,
              background: `linear-gradient(135deg, ${s.bg}, rgba(255,255,255,0.85))`,
              border: `1px solid ${s.color}28`,
              backdropFilter: "blur(12px)",
              boxShadow: `0 2px 14px ${s.color}18, inset 0 1px 0 rgba(255,255,255,0.7)`,
            }}
          >
            <div
              className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}18` }}
            >
              <s.Icon size={10} style={{ color: s.color }} />
            </div>
            <span className="text-[9px] font-semibold whitespace-nowrap">{s.label}</span>
            {s.hot && (
              <div
                className="flex items-center gap-0.5 rounded-full px-1 py-0.5"
                style={{ background: s.color }}
              >
                <Flame size={7} color="white" strokeWidth={2.5} />
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* ── Header: live ticker + globe stats ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 pt-3 z-10">
        {/* live activity ticker */}
        <div
          className="flex-1 overflow-hidden rounded-xl px-3 py-1.5"
          style={{
            background: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(0,93,220,0.10)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 1px 8px rgba(0,50,150,0.06)",
          }}
        >
          <Ticker />
        </div>
        {/* live opportunity counter badge */}
        <motion.div
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,93,220,0.12)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 1px 8px rgba(0,50,150,0.07)",
          }}
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
        >
          <Globe2 size={11} style={{ color: "#1B73E8" }} />
          <div>
            <p className="text-[10px] font-black text-[#0b1b3a] leading-none"><Count to={1240} suffix="+" duration={1.6} /></p>
            <p className="text-[7.5px] text-[#94A3B8] leading-none">open roles</p>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom-left: scene carousel with stats inside ── */}
      <motion.div
        className="absolute bottom-3 left-3"
        style={{ width: 300, zIndex: 10 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.65, ease: EASE }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(0,93,220,0.09)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 36px rgba(0,50,160,0.12)",
          }}
        >
          {/* tabs */}
          <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5">
            {SCENES.map(s => {
              const active = scene === s.id;
              return (
                <button key={s.id} onClick={() => goTo(s.id)}
                  className="flex items-center gap-1 rounded-lg text-[10px] font-semibold transition-all duration-200"
                  style={{
                    padding: "3px 8px",
                    color: active ? s.accent : "#94A3B8",
                    background: active ? "white" : "transparent",
                    border: active ? `1px solid ${s.accent}25` : "1px solid transparent",
                    boxShadow: active ? `0 2px 6px ${s.accent}12` : "none",
                  }}>
                  {active && <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: s.accent }} />}
                  {s.label}
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-auto">
              {SCENES.map(s => (
                <div key={s.id} className="h-[3px] rounded-full overflow-hidden transition-all duration-300"
                  style={{ width: scene === s.id ? 20 : 4, background: "#EAF3FF" }}>
                  {scene === s.id && (
                    <motion.div className="h-full rounded-full" style={{ background: s.accent }}
                      initial={{ width: "0%" }} animate={{ width: "100%" }}
                      transition={{ duration: s.dur / 1000, ease: "linear" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* scene content */}
          <div className="px-3 pb-2.5">
            <AnimatePresence mode="wait">
              {scene === 0 && <CompactScene1 key="s1" />}
              {scene === 1 && <CompactScene2 key="s2" />}
              {scene === 2 && <CompactScene3 key="s3" />}
            </AnimatePresence>
          </div>

          {/* stats row — inside card footer */}
          <div
            className="flex items-center justify-between px-3 py-2 border-t"
            style={{ borderColor: "rgba(0,93,220,0.07)", background: "rgba(0,93,220,0.02)" }}
          >
            {[
              { Icon: Users,           val: 50,  suf: "K+", label: "Candidates", c: "#2563EB" },
              { Icon: TrendingUp,      val: 3,   suf: "×",  label: "Faster",     c: "#16A34A" },
              { Icon: BadgeDollarSign, val: 500, suf: "+",  label: "Companies",  c: "#7C3AED" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.07 }}
                className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.c}12` }}>
                  <s.Icon size={10} style={{ color: s.c }} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#0b1b3a] leading-none">
                    <Count to={s.val} suffix={s.suf} duration={1.0} />
                  </p>
                  <p className="text-[7.5px] text-[#94A3B8]">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default AuthBrandPanel;

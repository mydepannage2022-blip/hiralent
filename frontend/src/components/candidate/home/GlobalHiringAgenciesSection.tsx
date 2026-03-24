"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  FileText,
  Send,
  ShieldCheck,
  Plane,
  ScanFace,
  Paperclip,
  Globe,
  CheckCircle2,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";

/* =========================
   Types + Data
========================= */

type CaseKey = "visa" | "relocation" | "integration";

type CaseItem = {
  key: CaseKey;
  title: string;
  subtitle: string;
  from: keyof typeof CITY_COORDS;
  to: keyof typeof CITY_COORDS;
  accent: string;
  stats: { label: string; value: string }[];
  verificationPhoto?: string;
};

const CASES: CaseItem[] = [
  {
    key: "visa",
    title: "Visa & documentation",
    subtitle: "Every document, approval, and deadline tracked automatically.",
    from: "Casablanca",
    to: "Dubai",
    accent: "#005DDC",
    stats: [
      { label: "Documents", value: "8/8" },
      { label: "Status", value: "Sent" },
      { label: "ETA", value: "14 days" },
    ],
    verificationPhoto: "/images/visa.jpg",
  },
  {
    key: "relocation",
    title: "Relocation & logistics",
    subtitle:
      "Flights, housing, onboarding — managed end-to-end through Hiralent.",
    from: "Mumbai",
    to: "Jeddah",
    accent: "#00A35A",
    stats: [
      { label: "Checklist", value: "11 items" },
      { label: "Next step", value: "Flight" },
      { label: "Managed by", value: "Hiralent" },
    ],
  },
  {
    key: "integration",
    title: "Onboarding & integration",
    subtitle:
      "Full visibility for employers and candidates — from offer to first day.",
    from: "Karachi",
    to: "Doha",
    accent: "#7C3AED",
    stats: [
      { label: "Status", value: "In progress" },
      { label: "Visibility", value: "Full" },
      { label: "Updates", value: "Real-time" },
    ],
  },
];

const CITY_COORDS = {
  Casablanca: { lat: 33.5731, lon: -7.5898 },
  Dubai: { lat: 25.2048, lon: 55.2708 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Jeddah: { lat: 21.4858, lon: 39.1925 },
  Karachi: { lat: 24.8607, lon: 67.0011 },
  Doha: { lat: 25.2854, lon: 51.531 },
} as const;

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/* =========================
   Component
========================= */

export default function GlobalHiringSection() {
  const [active, setActive] = useState<CaseKey>("visa");
  const current = useMemo(
    () => CASES.find((c) => c.key === active)!,
    [active]
  );

  return (
    <section className="relative w-full bg-white overflow-hidden">
      {/* glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.05] blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.035] blur-3xl" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-10 md:py-14">
        {/* ═══ Header ═══ */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-8 items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
              <Globe className="h-3 w-3 text-[#005DDC]" />
              Global Hiring
            </div>

            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-[#0b1b3a] leading-[1.12]">
              Hire Globally.{" "}
              <span className="relative inline-block text-[#005DDC]">
                Hiralent Handles the Rest.
                <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#005DDC]/15 rounded-full" />
              </span>
            </h2>

            <p className="mt-2 text-sm md:text-base text-[#64748B] max-w-2xl leading-relaxed">
              Visa processing, relocation logistics, candidate onboarding —
              Hiralent manages every step of international hiring in one
              platform, with trusted partners working behind the scenes.
            </p>
          </div>

          <div className="lg:col-span-5 flex lg:justify-end">
            <a
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#005DDC] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition"
            >
              Start Hiring Globally
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* ═══ Body ═══ */}
        <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          {/* ——— Left panel ——— */}
          <div className="lg:col-span-4 rounded-3xl border border-[#E6ECF8] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)]">
            <div className="text-sm font-semibold text-[#0b1b3a]">
              What Hiralent manages for you
            </div>

            <div className="mt-3 space-y-2.5">
              {[
                "End-to-end visa & work permit processing",
                "Relocation logistics and onboarding",
                "Real-time progress for all parties",
              ].map((t) => (
                <div key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#005DDC] flex-shrink-0" />
                  <div className="text-sm text-[#0b1b3a] font-medium">{t}</div>
                </div>
              ))}
            </div>

            {/* Case selector */}
            <div className="mt-5 rounded-2xl bg-[#F7FBFF] border border-[#E6ECF8] p-4">
              <div className="text-xs font-semibold text-[#0b1b3a]">
                See it in action
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {CASES.map((c) => {
                  const isActive = c.key === active;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setActive(c.key)}
                      className={[
                        "w-full rounded-2xl px-3 py-3 text-left border transition flex items-start gap-3",
                        isActive
                          ? "bg-white text-[#0b1b3a] border-[#005DDC]/30"
                          : "bg-transparent text-[#64748B] border-[#E6ECF8] hover:bg-white",
                      ].join(" ")}
                      style={
                        isActive
                          ? {
                              boxShadow:
                                "0 14px 32px -28px rgba(0,0,0,0.25)",
                            }
                          : undefined
                      }
                    >
                      <span
                        className="mt-1 inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: c.accent }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0b1b3a]">
                          {c.title}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5 line-clamp-2">
                          {c.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trust line */}
            <div className="mt-5 rounded-xl bg-[#F7FBFF] border border-[#E6ECF8] p-3 text-xs text-[#64748B] leading-relaxed">
              Powered by vetted local partners in 30+ countries - you deal with
              Hiralent, we coordinate everything else.
            </div>
          </div>

          {/* ——— Right panel ——— */}
          <div className="lg:col-span-8 rounded-3xl border border-[#E6ECF8] bg-gradient-to-br from-[#F8FBFF] to-white p-5 shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)] overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="/images/logo.png"
                  alt="Hiralent"
                  className="h-4 w-auto object-contain opacity-60"
                />
                <div className="text-sm font-semibold text-[#0b1b3a]">
                  Case Tracker
                </div>
              </div>
              <div className="text-xs font-semibold text-[#64748B]">
                {current.from} →{" "}
                <span className="text-[#0b1b3a]">{current.to}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Map */}
              <div className="md:col-span-7 rounded-2xl border border-[#E6ECF8] bg-white overflow-hidden relative min-h-[340px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.key}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.995 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.995 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <RealMapLibre
                      accent={current.accent}
                      fromCity={current.from}
                      toCity={current.to}
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Overlay */}
                <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-[#E6ECF8] bg-white/90 backdrop-blur px-3 py-2 shadow-sm max-w-[92%]">
                  <div className="text-[11px] font-semibold text-[#0b1b3a]">
                    {current.title}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5 line-clamp-2">
                    {current.subtitle}
                  </div>
                </div>
              </div>

              {/* Panel */}
              <div className="md:col-span-5 rounded-2xl border border-[#E6ECF8] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#0b1b3a]">
                    Progress
                  </div>
                  <span className="text-[10px] font-semibold text-[#64748B]">
                    <span className="text-[#0b1b3a]">{current.from}</span> →{" "}
                    <span className="text-[#0b1b3a]">{current.to}</span>
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {current.stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-[#E6ECF8] bg-[#FBFDFF] p-2"
                    >
                      <div className="text-[10px] text-[#64748B] font-semibold">
                        {s.label}
                      </div>
                      <div
                        className="mt-0.5 text-sm font-extrabold"
                        style={{ color: current.accent }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div className="mt-4 space-y-3">
                  <TimelineRow
                    icon={<FileText className="h-4 w-4" />}
                    title="Documents"
                    subtitle="Collected & validated"
                    accent={current.accent}
                    active
                  />
                  <TimelineRow
                    icon={<Send className="h-4 w-4" />}
                    title="Submission"
                    subtitle="Submitted to authorities"
                    accent={current.accent}
                  />
                  <TimelineRow
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="Approval"
                    subtitle="Under review"
                    accent={current.accent}
                  />
                  <TimelineRow
                    icon={<Plane className="h-4 w-4" />}
                    title="Arrival"
                    subtitle="Ready for onboarding"
                    accent={current.accent}
                  />
                </div>

                {/* Visa-only verification */}
                <AnimatePresence>
                  {current.key === "visa" && (
                    <motion.div
                      className="mt-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="text-xs font-semibold text-[#0b1b3a] flex items-center gap-2">
                        <Paperclip
                          className="h-4 w-4"
                          style={{ color: current.accent }}
                        />
                        Identity verification
                      </div>

                      <div className="mt-2 rounded-2xl border border-[#E6ECF8] bg-[#FBFDFF] p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-semibold text-[#0b1b3a] flex items-center gap-2">
                            <ScanFace
                              className="h-4 w-4"
                              style={{ color: current.accent }}
                            />
                            Document check
                          </div>
                          <span
                            className="text-[10px] font-extrabold"
                            style={{ color: current.accent }}
                          >
                            Verified
                          </span>
                        </div>

                        <div className="mt-2 rounded-xl border border-[#E6ECF8] bg-white overflow-hidden">
                          <VerificationScan
                            accent={current.accent}
                            src={current.verificationPhoto || ""}
                          />
                        </div>

                        <div className="mt-2 text-[11px] text-[#64748B]">
                          Photo + document consistency verified automatically
                          through Hiralent's verification pipeline.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 rounded-xl bg-[#F7FBFF] border border-[#E6ECF8] p-3 text-[11px] text-[#64748B]">
                  Both employers and candidates see live progress — no
                  back-and-forth emails needed.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================
   MapLibre
========================= */

function RealMapLibre({
  accent,
  fromCity,
  toCity,
}: {
  accent: string;
  fromCity: keyof typeof CITY_COORDS;
  toCity: keyof typeof CITY_COORDS;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const fromMarkerRef = useRef<maplibregl.Marker | null>(null);
  const toMarkerRef = useRef<maplibregl.Marker | null>(null);
  const planeMarkerRef = useRef<maplibregl.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  const from = CITY_COORDS[fromCity];
  const to = CITY_COORDS[toCity];

  const route = useMemo(
    () => buildGreatCircleArc([from.lon, from.lat], [to.lon, to.lat], 120),
    [from.lat, from.lon, to.lat, to.lon]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [(from.lon + to.lon) / 2, (from.lat + to.lat) / 2],
        zoom: 2.2,
        attributionControl: false,
        interactive: false,
      });
      mapRef.current = map;

      map.on("load", () => {
        safeUpsertRoute(map, route, accent);
        fromMarkerRef.current = addCityMarker(map, fromCity, from, accent, "From");
        toMarkerRef.current = addCityMarker(map, toCity, to, accent, "To");
        planeMarkerRef.current = addPlaneMarker(map, accent);
        fitToCities(map, from, to);
        startPlaneAnimation({ map, routeCoords: route, planeMarker: planeMarkerRef.current, accent, tRef, rafRef });
      });
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      fromMarkerRef.current?.remove();
      toMarkerRef.current?.remove();
      planeMarkerRef.current?.remove();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    tRef.current = 0;

    safeUpsertRoute(map, route, accent);
    fromMarkerRef.current?.remove();
    toMarkerRef.current?.remove();
    fromMarkerRef.current = addCityMarker(map, fromCity, from, accent, "From");
    toMarkerRef.current = addCityMarker(map, toCity, to, accent, "To");
    fitToCities(map, from, to);
    if (!planeMarkerRef.current) planeMarkerRef.current = addPlaneMarker(map, accent);
    startPlaneAnimation({ map, routeCoords: route, planeMarker: planeMarkerRef.current, accent, tRef, rafRef });
  }, [accent, fromCity, toCity, from, to, route]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 to-transparent" />
    </div>
  );
}

/* ═══ Map helpers ═══ */

function safeUpsertRoute(map: maplibregl.Map, coords: [number, number][], accent: string) {
  const srcId = "route-src", lineId = "route-line", glowId = "route-glow";
  const geojson = { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } }] };

  if (map.getSource(srcId)) {
    (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(geojson as any);
  } else {
    map.addSource(srcId, { type: "geojson", data: geojson as any });
    map.addLayer({ id: glowId, type: "line", source: srcId, paint: { "line-color": accent, "line-width": 10, "line-opacity": 0.14, "line-blur": 2 } });
    map.addLayer({ id: lineId, type: "line", source: srcId, paint: { "line-color": accent, "line-width": 3, "line-opacity": 0.9, "line-dasharray": [2, 2.2] } });
  }
  if (map.getLayer(glowId)) map.setPaintProperty(glowId, "line-color", accent);
  if (map.getLayer(lineId)) map.setPaintProperty(lineId, "line-color", accent);
}

function fitToCities(map: maplibregl.Map, from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([from.lon, from.lat]);
  bounds.extend([to.lon, to.lat]);
  map.fitBounds(bounds, { padding: 90, duration: 900 });
}

function addCityMarker(map: maplibregl.Map, label: string, coord: { lat: number; lon: number }, accent: string, variant: "From" | "To") {
  const el = document.createElement("div");
  el.style.display = "grid";
  el.style.placeItems = "center";

  const bubble = document.createElement("div");
  Object.assign(bubble.style, {
    display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 10px",
    borderRadius: "999px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(230,236,248,1)",
    boxShadow: "0 10px 28px -22px rgba(0,0,0,0.28)", fontSize: "11px", fontWeight: "700",
    color: "#0b1b3a", whiteSpace: "nowrap",
  });

  const dot = document.createElement("span");
  Object.assign(dot.style, { width: "8px", height: "8px", borderRadius: "999px", background: accent });

  const v = document.createElement("span");
  v.textContent = variant;
  v.style.color = "#64748B";
  v.style.fontWeight = "700";

  const name = document.createElement("span");
  name.textContent = label;
  name.style.fontWeight = "800";

  bubble.append(dot, v, name);
  el.appendChild(bubble);

  return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([coord.lon, coord.lat]).addTo(map);
}

function addPlaneMarker(map: maplibregl.Map, accent: string) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "40px", height: "40px", borderRadius: "16px", border: "1px solid rgba(230,236,248,1)",
    background: "white", boxShadow: `0 18px 40px -26px ${accent}55`, display: "grid", placeItems: "center",
    transform: "translate3d(0,0,0)",
  });
  el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 16l20-8-8 20-2-7-6-5z" fill="${accent}" opacity="0.95"/></svg>`;
  el.animate([{ transform: "translateY(0px)" }, { transform: "translateY(-2px)" }, { transform: "translateY(0px)" }], { duration: 1600, iterations: Infinity, easing: "ease-in-out" });
  return new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([0, 0]).addTo(map);
}

function startPlaneAnimation({ map, routeCoords, planeMarker, accent, tRef, rafRef }: { map: maplibregl.Map; routeCoords: [number, number][]; planeMarker: maplibregl.Marker | null; accent: string; tRef: React.MutableRefObject<number>; rafRef: React.MutableRefObject<number | null> }) {
  if (!planeMarker) return;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(60, now - last); last = now;
    tRef.current += dt / 6000;
    if (tRef.current > 1) tRef.current -= 1;
    planeMarker.setLngLat(samplePolyline(routeCoords, tRef.current));
    const phase = (now / 250) % 2;
    if (map.getLayer("route-line")) {
      map.setPaintProperty("route-line", "line-dasharray", phase < 1 ? [2, 2.2] : [0.6, 2.6]);
      map.setPaintProperty("route-glow", "line-color", accent);
      map.setPaintProperty("route-line", "line-color", accent);
    }
    rafRef.current = requestAnimationFrame(tick);
  };
  rafRef.current = requestAnimationFrame(tick);
}

/* ═══ Arc math ═══ */

function buildGreatCircleArc(a: [number, number], b: [number, number], steps = 120): [number, number][] {
  const [lon1, lat1] = a.map((x) => (x * Math.PI) / 180) as [number, number];
  const [lon2, lat2] = b.map((x) => (x * Math.PI) / 180) as [number, number];
  const p1 = sphToCart(lon1, lat1), p2 = sphToCart(lon2, lat2);
  const omega = Math.acos(clamp(dotP(p1, p2), -1, 1));
  const sinO = Math.sin(omega);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / sinO, s2 = Math.sin(t * omega) / sinO;
    const [lon, lat] = cartToSph([s1 * p1[0] + s2 * p2[0], s1 * p1[1] + s2 * p2[1], s1 * p1[2] + s2 * p2[2]]);
    coords.push([lon, lat]);
  }
  return coords;
}

function sphToCart(lon: number, lat: number): [number, number, number] { const c = Math.cos(lat); return [c * Math.cos(lon), c * Math.sin(lon), Math.sin(lat)]; }
function cartToSph(v: [number, number, number]): [number, number] { return [(Math.atan2(v[1], v[0]) * 180) / Math.PI, (Math.atan2(v[2], Math.sqrt(v[0] * v[0] + v[1] * v[1])) * 180) / Math.PI]; }
function dotP(a: [number, number, number], b: [number, number, number]) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function clamp(x: number, min: number, max: number) { return Math.max(min, Math.min(max, x)); }

function samplePolyline(coords: [number, number][], t: number): [number, number] {
  if (coords.length < 2) return coords[0] ?? [0, 0];
  let total = 0; const segs: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) { const d = approxDist(coords[i], coords[i + 1]); segs.push(d); total += d; }
  const target = t * total; let acc = 0;
  for (let i = 0; i < segs.length; i++) { const next = acc + segs[i]; if (target <= next) { const lt = (target - acc) / (segs[i] || 1); return [lerp(coords[i][0], coords[i + 1][0], lt), lerp(coords[i][1], coords[i + 1][1], lt)]; } acc = next; }
  return coords[coords.length - 1];
}

function approxDist(a: [number, number], b: [number, number]) { const R = 6371, l1 = (a[1] * Math.PI) / 180, l2 = (b[1] * Math.PI) / 180, x = ((b[0] - a[0]) * Math.PI / 180) * Math.cos((l1 + l2) / 2), y = l2 - l1; return Math.sqrt(x * x + y * y) * R; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ═══ Verification scan ═══ */

function VerificationScan({ accent, src }: { accent: string; src: string }) {
  return (
    <div className="relative h-28 w-full overflow-hidden">
      {src ? (
        <img src={src} alt="Verification" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#64748B]">
          Add /public/images/visa.jpg
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-transparent" />
      <motion.div className="absolute inset-3 rounded-xl border" style={{ borderColor: `${accent}55` }} animate={{ opacity: [0.55, 0.9, 0.55] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2" style={{ borderColor: accent }} />
      <div className="absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2" style={{ borderColor: accent }} />
      <div className="absolute left-3 bottom-3 h-4 w-4 border-l-2 border-b-2" style={{ borderColor: accent }} />
      <div className="absolute right-3 bottom-3 h-4 w-4 border-r-2 border-b-2" style={{ borderColor: accent }} />
      <motion.div className="absolute left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 24px ${accent}88` }} animate={{ top: ["10%", "88%"], opacity: [0.0, 0.95, 0.0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute inset-0" style={{ background: `linear-gradient(120deg, transparent 30%, ${accent}22 50%, transparent 70%)` }} animate={{ x: ["-30%", "30%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} />
      <div className="absolute left-3 bottom-3 rounded-full border border-white/40 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur flex items-center gap-1.5">
        <ScanFace className="h-3 w-3" />
        Scanning…
      </div>
      <div className="absolute right-3 bottom-3 rounded-full border border-white/40 bg-black/35 px-2 py-1 text-[10px] font-extrabold text-white backdrop-blur">
        VERIFIED
      </div>
    </div>
  );
}

/* ═══ Timeline row ═══ */

function TimelineRow({ icon, title, subtitle, accent, active }: { icon: React.ReactNode; title: string; subtitle: string; accent: string; active?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-2xl flex items-center justify-center border" style={{ borderColor: active ? `${accent}2A` : "#E6ECF8", background: active ? `${accent}12` : "#F7FBFF", color: active ? accent : "#64748B" }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-[#0b1b3a]">{title}</div>
        <div className="text-[12px] text-[#64748B]">{subtitle}</div>
      </div>
      {active && (
        <motion.div className="h-2.5 w-2.5 rounded-full mt-3" style={{ background: accent }} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
      )}
    </div>
  );
}
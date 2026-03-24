"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Select, { components } from "react-select";
import { locationOptions } from "../../../constants/groupedLocationOptions";
import { Play, X, ArrowRight, CheckCircle2, Search, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
/* ------------------------------------------------------------------ */
/*  Rotating roles                                                     */
/* ------------------------------------------------------------------ */
const roles = [
  { title: "Frontend Developer", color: "#005DDC" },
  { title: "AI Engineer", color: "#6D28D9" },
  { title: "Marketing Lead", color: "#D9480F" },
  { title: "Product Designer", color: "#0C8346" },
  { title: "Data Analyst", color: "#0E7490" },
  { title: "Backend Engineer", color: "#005DDC" },
];

/* ------------------------------------------------------------------ */
/*  Showcase screens                                                   */
/* ------------------------------------------------------------------ */
const screens = [
  {
    src: "/images/profile.png",
    label: "Smart Profile",
    caption: "119 skills auto-extracted from your resume",
    url: "app.hiralent.com/profile",
  },
  {
    src: "/images/profile2.png",
    label: "Hira AI Assistant",
    caption: "Instant help building your perfect profile",
    url: "app.hiralent.com/profile",
  },
  {
    src: "/images/assessment-ui.png",
    label: "Skill Assessment",
    caption: "Prove your skills with real coding challenges",
    url: "app.hiralent.com/assessment",
  },
];

/* ------------------------------------------------------------------ */
/*  Location select — stable custom components (outside render)        */
/* ------------------------------------------------------------------ */
const LocationPlaceholder = (props: any) => (
  <components.Placeholder {...props}>
    <span className="flex items-center gap-1.5 text-[#94A3B8]">
      <MapPin className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
      <span>Location</span>
    </span>
  </components.Placeholder>
);

const LocationValue = (props: any) => (
  <components.SingleValue {...props}>
    <span className="flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 text-[#005DDC] flex-shrink-0" strokeWidth={2} />
      <span className="truncate">{props.children}</span>
    </span>
  </components.SingleValue>
);

const selectComponents = {
  Placeholder: LocationPlaceholder,
  SingleValue: LocationValue,
};

/* ------------------------------------------------------------------ */
/*  Location select — styles matching Hiralent theme                   */
/* ------------------------------------------------------------------ */
const locStyles: Record<string, any> = {
  control: (base: any) => ({
    ...base,
    border: "none",
    boxShadow: "none",
    backgroundColor: "transparent",
    minHeight: "38px",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
  }),
  valueContainer: (base: any) => ({
    ...base,
    padding: "0 2px",
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "#94A3B8",
    fontSize: "14px",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "#0b1b3a",
    fontSize: "14px",
    fontWeight: 500,
  }),
  input: (base: any) => ({
    ...base,
    color: "#0b1b3a",
    fontSize: "14px",
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any, state: any) => ({
    ...base,
    color: state.isFocused ? "#005DDC" : "#CBD5E1",
    padding: "0 2px",
    transition: "transform 0.2s, color 0.15s",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    "&:hover": { color: "#005DDC" },
  }),
  clearIndicator: (base: any) => ({
    ...base,
    color: "#CBD5E1",
    padding: "0 2px",
    "&:hover": { color: "#EF4444" },
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: "14px",
    border: "1px solid #E6ECF8",
    boxShadow:
      "0 12px 40px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,93,220,0.04)",
    overflow: "hidden",
    zIndex: 50,
    marginTop: "8px",
    padding: "4px",
  }),
  menuList: (base: any) => ({
    ...base,
    padding: 0,
    maxHeight: "200px",
    "::-webkit-scrollbar": { width: "4px" },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: "#E2E8F0",
      borderRadius: "4px",
    },
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "rgba(0,93,220,0.08)"
      : state.isFocused
      ? "#F7FBFF"
      : "transparent",
    color: state.isSelected ? "#005DDC" : "#0b1b3a",
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: "13px",
    padding: "9px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background-color 0.1s",
  }),
  groupHeading: (base: any) => ({
    ...base,
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#94A3B8",
    padding: "8px 12px 4px",
  }),
};

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
const Hero = () => {
  const router = useRouter();
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);
  const [screenIndex, setScreenIndex] = useState(0);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(
      () => setRoleIndex((p) => (p + 1) % roles.length),
      2800
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setScreenIndex((p) => (p + 1) % screens.length),
      4500
    );
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTitle) params.set("q", searchTitle);
    if (searchLocation?.value) params.set("location", searchLocation.value);
    router.push(`/search?${params.toString()}`);
  };

  const current = screens[screenIndex];

  return (
    <section className="relative w-full overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#F8FAFF] to-[#EDF2FF]" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#0b1b3a 1px, transparent 1px), linear-gradient(90deg, #0b1b3a 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto w-[90%] max-w-[1360px] pt-24 pb-10 md:pt-32 md:pb-16">
        {/* ====== GRID ====== */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 lg:items-center">
          {/* ——— LEFT: 4 cols ——— */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4 flex flex-col items-center text-center lg:items-start lg:text-left"
          >


            {/* Headline + rotating role */}
            <h1 className="text-[2.25rem] md:text-[2.9rem] xl:text-[3.35rem] font-bold tracking-[-0.04em] text-[#0b1b3a] leading-[1.05]">
              Get Hired As A
              <br />
              <span className="relative inline-block h-[1.05em] overflow-hidden w-full lg:w-auto">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={roleIndex}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="block whitespace-nowrap text-[2.9rem] md:text-[2.35rem] xl:text-[2.7rem]"
                    style={{ color: roles[roleIndex].color }}
                  >
                    {roles[roleIndex].title}
                  </motion.span>
                </AnimatePresence>
                <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-[#005DDC]/15" />
              </span>
            </h1>

            {/* Subcopy */}
            <p className="mt-4 max-w-md text-[#475569] text-[15px] leading-relaxed">
              Hiralent matches your real skills to real jobs. Validate what you
              know, see your fit score, and get noticed by employers who care
              about ability, not keywords on a PDF.
            </p>

            {/* ═══════════ SEARCH BAR ═══════════ */}
            <div className="mt-7 w-full max-w-md">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_24px_rgba(0,93,220,0.06)]">
                {/* Row 1 — Job title input */}
                <div className="flex items-center gap-2.5 px-4 py-3.5">
                  <Search
                    className="h-[18px] w-[18px] text-[#CBD5E1] flex-shrink-0"
                    strokeWidth={2}
                  />
                  <input
                    type="text"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Job title, skill, or keyword..."
                    className="flex-1 bg-transparent text-[15px] text-[#0b1b3a] placeholder:text-[#94A3B8] outline-none min-w-0"
                  />
                </div>

                {/* Divider */}
                <div className="mx-4 h-px bg-[#F1F5F9]" />

                {/* Row 2 — Location + Search button */}
                <div className="flex items-center gap-2 pl-3 pr-2.5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <Select
                      options={locationOptions}
                      value={searchLocation}
                      onChange={setSearchLocation}
                      placeholder="Location"
                      isSearchable
                      isClearable
                      styles={locStyles}
                      components={selectComponents}
                      classNamePrefix="loc"
                      instanceId="hero-location-select"
                    />
                  </div>

                  <button
                    onClick={handleSearch}
                    className="flex items-center gap-2 rounded-xl bg-[#005DDC] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0050C0] active:scale-[0.97] transition-all shadow-[0_2px_12px_rgba(0,93,220,0.25)] flex-shrink-0"
                  >
                    <Search className="h-4 w-4" strokeWidth={2.5} />
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Proof */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <img
                    src="/images/frame-1890165341.png"
                    alt=""
                    className="h-7 w-7 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="/images/frame-2147225745.png"
                    alt=""
                    className="h-7 w-7 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="/images/frame-2147225746.png"
                    alt=""
                    className="h-7 w-7 rounded-full border-2 border-white object-cover"
                  />
                </div>
                <span className="text-sm text-[#64748B]">
                  <span className="font-bold text-[#0b1b3a]">999+</span> hired
                  this month
                </span>
              </div>
              <span className="hidden sm:block h-4 w-px bg-[#E2E8F0]" />
              <span className="text-sm text-[#64748B] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#005DDC]" />
                Free to start
              </span>
            </div>

            {/* Watch demo */}
            <button
              onClick={() => setIsVideoOpen(true)}
              className="mt-5 inline-flex items-center gap-2.5 text-sm text-[#475569] hover:text-[#005DDC] transition-colors group"
            >
              <div className="h-8 w-8 rounded-full bg-[#005DDC] flex items-center justify-center group-hover:bg-[#0050C0] transition shadow-sm">
                <Play
                  className="h-3.5 w-3.5 text-white translate-x-[1px]"
                  fill="white"
                />
              </div>
              <span className="font-medium">Watch 60s demo</span>
            </button>
          </motion.div>

          {/* ——— RIGHT: 8 cols — Product showcase ——— */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-8 relative"
          >
            <div className="relative rounded-xl border border-[#C8CED7] bg-white shadow-[0_16px_48px_rgba(0,20,60,0.1)] overflow-hidden">
              {/* Chrome bar */}
              <div className="flex items-center gap-3 border-b border-[#E5E9EF] px-4 py-2.5 bg-[#F4F6F8]">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                  <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                  <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-1.5 rounded-md bg-white border border-[#DADFE6] px-3 py-1 w-64">
                    <svg
                      className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M8 1a7 7 0 100 14A7 7 0 008 1z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M5.5 8l2 2 3-4"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={screenIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] text-[#64748B] select-none truncate"
                      >
                        {current.url}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {screens.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setScreenIndex(i)}
                      className={`rounded-full transition-all duration-300 ${
                        screenIndex === i
                          ? "h-2 w-5 bg-[#005DDC]"
                          : "h-2 w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]"
                      }`}
                      aria-label={s.label}
                    />
                  ))}
                </div>
              </div>

              {/* Screenshot */}
              <div className="relative bg-[#F0F2F5] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={screenIndex}
                    src={current.src}
                    alt={current.label}
                    className="w-full h-auto block object-contain"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    loading="eager"
                    draggable={false}
                  />
                </AnimatePresence>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between border-t border-[#E5E9EF] px-4 py-2.5 bg-[#F9FAFB]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={screenIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2"
                  >
                    <span className="rounded-full bg-[#005DDC] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {current.label}
                    </span>
                    <span className="text-[11px] text-[#64748B] hidden sm:inline">
                      {current.caption}
                    </span>
                  </motion.div>
                </AnimatePresence>
                <button
                  onClick={() => setIsVideoOpen(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-[#005DDC] hover:underline"
                >
                  <Play className="h-3 w-3" fill="currentColor" />
                  Watch demo
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ====== VALUE STRIP ====== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            {
              title: "Skills, not keywords",
              desc: "119+ skills auto-extracted from your resume - employers see your real abilities.",
            },
            {
              title: "Hira AI Assistant",
              desc: "Get instant help optimizing your profile, preparing for assessments, and standing out.",
            },
            {
              title: "Real match scores",
              desc: "See exactly how well you fit every role before you apply. No more guessing.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#E2E8F0] bg-white/80 backdrop-blur-sm p-4 hover:border-[#005DDC]/15 hover:bg-white transition-all"
            >
              <p className="text-sm font-semibold text-[#0b1b3a]">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ====== VIDEO MODAL ====== */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVideoOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-[#1E1E2E] shadow-2xl"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 10, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsVideoOpen(false)}
                className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative">
                <img
                  src="/images/assessment-ui.png"
                  alt="Hiralent demo"
                  className="w-full h-auto block max-h-[80vh] object-contain bg-black"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                  <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/20 transition">
                    <Play
                      className="h-8 w-8 text-white translate-x-[2px]"
                      fill="white"
                    />
                  </div>
                  <p className="mt-4 text-white/60 text-sm font-medium">
                    Replace with your demo video
                  </p>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="rounded-full bg-[#005DDC] px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-[#0050C0] transition cursor-pointer">
                    Get started free
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
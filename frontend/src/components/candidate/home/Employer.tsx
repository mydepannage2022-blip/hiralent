"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

const Employer = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -26 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <section className="relative w-full overflow-hidden bg-white font-sans">
      {/* Background WHITE + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(2,8,23,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(2,8,23,0.03) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F7FBFF] to-transparent" />
        <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.045] blur-3xl" />
        <div className="absolute -bottom-32 -right-28 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-14 md:py-18">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* LEFT COPY */}
          <motion.div
            className="lg:col-span-5"
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-4 py-2 text-xs font-semibold text-[#0b1b3a]">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#EAF2FF]">
                <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
              </span>
              For Employers
            </div>

            <h2 className="mt-6 text-[42px] leading-[1.05] md:text-5xl font-extrabold tracking-tight text-[#0b1b3a]">
              Are you an employer?
            </h2>

            <div className="mt-3 text-lg font-medium text-[#64748B]">
              Post roles and hire with signal - not noise.
            </div>

            <p className="mt-4 text-sm md:text-base text-[#64748B] leading-relaxed max-w-xl">
              You can find various solutions by accessing our platform. We’re
              committed to maintaining the quality of user service — with
              structured workflows, assessments, and clean collaboration.
            </p>

            {/* Search-like CTA */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <div className="relative w-full max-w-xl overflow-hidden rounded-[26px] border border-[#E6ECF8] bg-white/90 shadow-[0_22px_55px_-45px_rgba(2,8,23,0.28)] backdrop-blur">
                <div className="absolute inset-0 bg-gradient-to-br from-[#005DDC]/[0.05] via-transparent to-transparent" />
                <div className="relative flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F3F7FF] text-[#005DDC]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M21 21l-4.35-4.35"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#94A3B8]">
                      Post a Job →
                    </div>
                    <div className="text-xs font-semibold text-[#94A3B8] mt-1">
                      No credit card required • 5 min setup
                    </div>
                  </div>

                  <motion.button
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#005DDC] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition border border-[#005DDC]/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Post a Job
                  </motion.button>
                </div>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-white/90 px-4 py-2 text-xs font-semibold text-[#0b1b3a] shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
                <span>Clean workflows</span>
                <span className="text-[#94A3B8]">•</span>
                <span>Fast hiring</span>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT SCREENS — smaller */}
          <div className="lg:col-span-7">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-10 rounded-[44px] bg-[radial-gradient(circle_at_35%_20%,rgba(0,93,220,0.08),transparent_40%),radial-gradient(circle_at_85%_65%,rgba(0,93,220,0.06),transparent_45%)]" />

              <div className="relative min-h-[400px] md:min-h-[440px]">
                {/* Center device (smaller) */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55 }}
                  className="absolute left-1/2 top-6 w-[64%] -translate-x-1/2 md:top-4 md:w-[40%]"
                >
                  <DeviceFrame title="Hiring overview">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-[#EAF0FA] bg-white/90 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-xl bg-[#EAF2FF] grid place-items-center text-[#005DDC]">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M4 12a8 8 0 0 1 16 0"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path d="M6 12h2v4H6zM16 12h2v4h-2z" fill="currentColor" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-[#64748B]">
                                ATL Airlines • 712,4019
                              </div>
                              <div className="text-[11px] font-semibold text-[#94A3B8]">
                                Collectived to review
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                            <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                            <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                            <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
                          </div>
                        </div>

                        <div className="mt-3 flex items-end justify-between">
                          <div>
                            <div className="text-3xl font-extrabold text-[#005DDC] leading-none">
                              23
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-[#94A3B8]">
                              New applications
                            </div>
                            <div className="mt-2 text-[10px] font-semibold text-[#94A3B8]">
                              Oct 3 — Apr 11
                            </div>
                          </div>

                          <div className="relative">
                            <div className="h-12 w-12 rounded-full border border-[#E6ECF8] bg-white shadow-sm overflow-hidden">
                              <img
                                src="/images/profile.png"
                                alt="Profile"
                                className="h-full w-full object-cover"
                                draggable={false}
                              />
                            </div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#005DDC] text-white text-[10px] font-extrabold px-2 py-0.5 shadow">
                              12
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <svg viewBox="0 0 260 44" className="w-full h-8">
                            <path
                              d="M2 36 C 30 30, 48 26, 68 28 C 92 31, 110 20, 132 18 C 158 16, 176 26, 196 22 C 222 16, 236 18, 258 10"
                              fill="none"
                              stroke="rgba(0,93,220,0.9)"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <path
                              d="M2 36 C 30 30, 48 26, 68 28 C 92 31, 110 20, 132 18 C 158 16, 176 26, 196 22 C 222 16, 236 18, 258 10 L 258 44 L 2 44 Z"
                              fill="rgba(0,93,220,0.10)"
                            />
                          </svg>
                          <div className="flex justify-between text-[10px] font-semibold text-[#94A3B8]">
                            <span>Oct 3</span>
                            <span>Apr 11</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#EAF0FA] bg-white/90 p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-extrabold text-[#0b1b3a]">
                            Pipeline
                          </div>
                          <div className="text-xs font-bold text-[#94A3B8]">×</div>
                        </div>

                        <div className="mt-2 space-y-2">
                          <ProgressRow label="New candidates" valueRight="62" percent={0.55} />
                          <ProgressRow label="Screened" valueRight="12" percent={0.25} />
                          <ProgressRow label="Assessment" valueRight="16" percent={0.42} />
                          <ProgressRow label="Interview" valueRight="7" percent={0.18} />
                        </div>

                        <button className="mt-3 w-full rounded-2xl bg-[#005DDC] py-2.5 text-sm font-bold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)]">
                          View details
                        </button>
                      </div>
                    </div>
                  </DeviceFrame>
                </motion.div>

                {/* Top-right device */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: 0.05, duration: 0.55 }}
                  className="absolute right-0 top-12 w-[56%] md:right-10 md:top-10 md:w-[34%]"
                  style={{ transformOrigin: "bottom left" }}
                >
                  <div style={{ transform: "rotate(6deg)" }}>
                    <DeviceFrame title="Pipeline" compact>
                      <div className="space-y-2.5">
                        <PersonRow
                          name="Khalid A."
                          meta="Together stories"
                          tag="Reviewing"
                          tagTone="neutral"
                          avatarSrc="/images/profile.png"
                        />
                        <PersonRow
                          name="Sara D."
                          meta="Candidate called"
                          tag="Candidate called"
                          tagTone="warn"
                          avatarSrc="/images/profile.png"
                        />
                        <PersonRow
                          name="Johan G."
                          meta="Anton ornert"
                          tag="Assessment"
                          tagTone="blue"
                          avatarSrc="/images/profile.png"
                        />
                      </div>
                    </DeviceFrame>
                  </div>
                </motion.div>

                {/* Bottom-right device */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: 0.12, duration: 0.55 }}
                  className="absolute right-2 bottom-0 w-[58%] md:right-8 md:bottom-6 md:w-[36%]"
                  style={{ transformOrigin: "top left" }}
                >
                  <div style={{ transform: "rotate(-8deg)" }}>
                    <DeviceFrame title="Assessments" compact>
                      <div className="rounded-2xl border border-[#EAF0FA] bg-white/90 p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full border border-[#E6ECF8] bg-white overflow-hidden shadow-sm">
                              <img
                                src="/images/hira-avatar.png"
                                alt="Hira avatar"
                                className="h-full w-full object-cover"
                                draggable={false}
                              />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-[#0b1b3a]">
                                Maria S.
                              </div>
                              <div className="text-[11px] font-semibold text-[#94A3B8]">
                                JavaScript Fundamentals
                              </div>
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 rounded-full border border-[#E6ECF8] bg-white px-2 py-1 text-[11px] font-extrabold text-[#64748B]">
                            89% <span className="text-[#16A34A]">✓</span>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-[#EAF0FA] bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-extrabold text-[#0b1b3a]">
                              JavaScript Fundamentals
                            </div>
                            <div className="rounded-xl bg-[#005DDC] px-2 py-1 text-[11px] font-extrabold text-white">
                              89%
                            </div>
                          </div>

                          <div className="mt-3 h-2.5 w-full rounded-full bg-[#EEF2F7] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#005DDC]"
                              style={{ width: "89%" }}
                            />
                          </div>

                          <div className="mt-2 text-[10px] font-semibold text-[#94A3B8]">
                            Store p/hy 20%
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <MiniTaskRow label="QA/Test Automation" />
                        <MiniTaskRow label="Logical Reasoning" />
                      </div>
                    </DeviceFrame>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          {/* end right */}
        </div>
      </div>
    </section>
  );
};

export default Employer;

/* =======================
   Helpers
======================= */

function DeviceFrame({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-[0_26px_70px_-52px_rgba(2,8,23,0.45)] backdrop-blur">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#005DDC]/[0.07] via-transparent to-transparent" />
      <div className="absolute inset-0 ring-1 ring-inset ring-[#E6ECF8]" />

      <div className={compact ? "p-3" : "p-4"}>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <div className="ml-2 text-sm font-extrabold text-[#0b1b3a] opacity-85">
            {title}
          </div>
          <div className="ml-auto flex gap-1.5 opacity-70">
            <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
            <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
            <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
          </div>
        </div>

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  valueRight,
  percent,
}: {
  label: string;
  valueRight: string;
  percent: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-xl bg-[#F3F7FF] grid place-items-center text-[#005DDC]">
        <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold text-[#0b1b3a]">{label}</div>
          <div className="text-[12px] font-extrabold text-[#64748B]">
            {valueRight}
          </div>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-[#EEF2F7] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#005DDC]"
            style={{ width: `${Math.round(percent * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PersonRow({
  name,
  meta,
  tag,
  tagTone,
  avatarSrc,
}: {
  name: string;
  meta: string;
  tag: string;
  tagTone: "neutral" | "warn" | "blue";
  avatarSrc?: string;
}) {
  const tone =
    tagTone === "warn"
      ? "bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]"
      : tagTone === "blue"
      ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
      : "bg-[#F8FAFC] border-[#E6ECF8] text-[#64748B]";

  return (
    <div className="rounded-2xl border border-[#EAF0FA] bg-white/90 p-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full border border-[#E6ECF8] bg-white overflow-hidden shadow-sm">
          <img
            src={avatarSrc || "/images/profile.png"}
            alt={name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
        <div className="flex-1">
          <div className="text-sm font-extrabold text-[#0b1b3a]">{name}</div>
          <div className="text-[11px] font-semibold text-[#94A3B8]">{meta}</div>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-[11px] font-extrabold ${tone}`}
        >
          {tag}
        </div>
      </div>
    </div>
  );
}

function MiniTaskRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#EAF0FA] bg-white/90 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-[#F3F7FF] grid place-items-center text-[#005DDC]">
          <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
        </div>
        <div className="text-sm font-extrabold text-[#0b1b3a]">{label}</div>
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-7 rounded-xl border border-[#E6ECF8] bg-white grid place-items-center text-[#94A3B8] text-xs font-black">
          🔒
        </div>
        <div className="h-7 w-7 rounded-xl border border-[#E6ECF8] bg-white grid place-items-center text-[#94A3B8] text-xs font-black">
          1
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Timer, Cpu, ScanSearch, Code2, Check, X } from "lucide-react";

const SkillVerificationSection = () => {
  const points = [
    { icon: Code2, text: "Real code execution in multiple languages" },
    { icon: Cpu, text: "Automated test cases and runtime metrics" },
    { icon: ScanSearch, text: "Anti-cheating and plagiarism detection" },
    { icon: ShieldCheck, text: "Clear, shareable assessment reports" },
  ];

  return (
    <section className="relative w-full bg-[#FAFBFC] overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent" />

      <div className="relative mx-auto w-[92%] max-w-7xl py-14 md:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14 lg:items-center">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#005DDC]/10 bg-[#005DDC]/[0.04] px-3.5 py-1.5 mb-4">
              <span className="text-xs font-semibold text-[#005DDC]">
                Skill Verification
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl xl:text-[2.75rem] font-extrabold text-[#0b1b3a] tracking-tight leading-tight">
              Proof of Skill
              <br />
              <span className="text-[#005DDC]">Changes Everything</span>
            </h2>

            <p className="mt-3 text-[15px] text-[#64748B] max-w-md leading-relaxed">
              Resumes explain.{" "}
              <span className="font-semibold text-[#0b1b3a]">Skills convince.</span>{" "}
              Hiralent assessments measure real execution - not just what candidates claim.
            </p>

            <div className="mt-6 space-y-3">
              {points.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.text}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                  >
                    <div className="h-8 w-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-[#005DDC]" strokeWidth={1.8} />
                    </div>
                    <span className="text-[13px] font-medium text-[#0b1b3a]">
                      {p.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-7">
              <a
                href="/assessments"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0b1b3a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a2a4a] transition-colors"
              >
                Explore Assessments
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          {/* RIGHT — Terminal-style assessment UI */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-2xl border border-[#1e2433] bg-[#0d1117] shadow-[0_24px_64px_rgba(0,0,0,0.2)] overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#161b22]">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                  <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                  <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-[11px] font-mono text-white/40">
                  hiralent-assessment-runner
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] font-semibold text-white/50">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Challenge + Code split */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                {/* Challenge */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                      Challenge
                    </span>
                    <span className="rounded bg-[#FFBD2E]/20 px-2 py-0.5 text-[10px] font-bold text-[#FFBD2E]">
                      Medium
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-white/90">
                    Implement{" "}
                    <span className="text-[#79C0FF] font-mono">twoSum()</span>
                  </p>
                  <p className="mt-2 text-[11px] text-white/40 leading-relaxed">
                    Return indices of two numbers that add up to target.
                  </p>
                  <div className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="font-mono text-[11px] text-white/50">
                      <span className="text-white/30">Input:</span> [2,7,11,15], 9
                    </p>
                    <p className="font-mono text-[11px] text-[#7EE787] mt-1">
                      <span className="text-white/30">Output:</span> [0, 1]
                    </p>
                  </div>
                </div>

                {/* Code */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                      Solution
                    </span>
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-white/50">
                      python
                    </span>
                  </div>
                  <pre className="text-[11px] leading-[1.7] font-mono">
                    <span className="text-[#FF7B72]">def</span>{" "}
                    <span className="text-[#D2A8FF]">twoSum</span>
                    <span className="text-white/60">(nums, target):</span>
                    {"\n"}
                    <span className="text-white/40">{"    "}seen = {"{}"}</span>
                    {"\n"}
                    <span className="text-[#FF7B72]">{"    "}for</span>{" "}
                    <span className="text-white/60">i, n</span>{" "}
                    <span className="text-[#FF7B72]">in</span>{" "}
                    <span className="text-[#D2A8FF]">enumerate</span>
                    <span className="text-white/60">(nums):</span>
                    {"\n"}
                    <span className="text-white/40">{"        "}diff = target - n</span>
                    {"\n"}
                    <span className="text-[#FF7B72]">{"        "}if</span>{" "}
                    <span className="text-white/60">diff</span>{" "}
                    <span className="text-[#FF7B72]">in</span>{" "}
                    <span className="text-white/60">seen:</span>
                    {"\n"}
                    <span className="text-[#FF7B72]">{"            "}return</span>{" "}
                    <span className="text-white/60">[seen[diff], i]</span>
                    {"\n"}
                    <span className="text-white/40">{"        "}seen[n] = i</span>
                  </pre>
                </div>
              </div>

              {/* Test results — animated line by line */}
              <div className="border-t border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                    Test Results
                  </span>
                  <motion.span
                    className="text-[10px] font-bold text-[#22C55E]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.4 }}
                  >
                    6/7 PASSED
                  </motion.span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { name: "Basic pair", passed: true },
                    { name: "Negative nums", passed: true },
                    { name: "Large array", passed: true },
                    { name: "Duplicates", passed: true },
                    { name: "Single element", passed: false },
                    { name: "Zero target", passed: true },
                    { name: "Edge case", passed: true },
                  ].map((test, i) => (
                    <motion.div
                      key={test.name}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5"
                      style={{
                        backgroundColor: test.passed
                          ? "rgba(34,197,94,0.06)"
                          : "rgba(239,68,68,0.06)",
                      }}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.12, duration: 0.3 }}
                    >
                      {test.passed ? (
                        <Check className="h-3 w-3 text-[#22C55E] flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-[#EF4444] flex-shrink-0" />
                      )}
                      <span className="text-[11px] font-mono text-white/60 flex-1">
                        {test.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          test.passed ? "text-[#22C55E]/70" : "text-[#EF4444]/70"
                        }`}
                      >
                        {test.passed ? "PASS" : "FAIL"}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Metrics bar */}
              <div className="border-t border-white/[0.06] px-4 py-3 flex items-center gap-4 bg-[#161b22]">
                <Metric icon={Timer} label="Runtime" value="142ms" />
                <div className="h-4 w-px bg-white/[0.06]" />
                <Metric icon={Cpu} label="Memory" value="38.2 MB" />
                <div className="h-4 w-px bg-white/[0.06]" />
                <Metric icon={ScanSearch} label="Plagiarism" value="6%" />
                <div className="ml-auto">
                  <motion.div
                    className="rounded-lg bg-[#005DDC] px-3 py-1.5 text-[10px] font-bold text-white"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Submit
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Score card floating */}
            <motion.div
              className="absolute -right-3 -bottom-3 lg:-right-5 lg:-bottom-5 rounded-xl bg-white border border-[#E2E8F0] p-3 shadow-lg z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.6, duration: 0.4, type: "spring" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#005DDC]/10 flex items-center justify-center">
                  <span className="text-sm font-extrabold text-[#005DDC]">86</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#0b1b3a]">Skill Score</p>
                  <p className="text-[10px] text-[#64748B]">Top 15% candidates</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SkillVerificationSection;

/* ---- Metric pill in bottom bar ---- */
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-white/30" strokeWidth={1.5} />
      <div>
        <p className="text-[9px] text-white/30 leading-none">{label}</p>
        <p className="text-[11px] font-semibold text-white/70 leading-tight">{value}</p>
      </div>
    </div>
  );
}
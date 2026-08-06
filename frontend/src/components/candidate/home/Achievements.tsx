import React from "react";
import { motion } from "framer-motion";
import { Variants } from "framer-motion";

const Achievements = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const boxVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* theme glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.045] blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#005DDC] opacity-[0.03] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#F7FBFF] to-transparent" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-14 md:py-18">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-start">
          {/* Header */}
          <motion.div
            className="lg:col-span-4 flex flex-col items-center lg:items-start gap-4"
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
              <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
              Why Hiralent
            </div>

            <motion.h2 className="text-[#0b1b3a] text-3xl md:text-4xl font-semibold tracking-tight leading-[1.12] text-center lg:text-left">
              Built to Hire Smarter
            </motion.h2>

            <motion.p
              className="text-[#64748B] text-sm md:text-base text-center lg:text-left leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Whether you're an employer looking for top talent or a job seeker
              searching for the perfect role, Hiralent matches real skills to
              real jobs — validated assessments, auto-extracted skill profiles,
              and transparent fit scores instead of keyword-stuffed résumés.
            </motion.p>

            <div className="mt-1 text-[11px] font-semibold text-[#94A3B8] text-center lg:text-left">
              Skill-first hiring • Transparent by design
            </div>
          </motion.div>

          {/* Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card base class is reused to keep your structure but match theme */}
            {[
              {
                delay: 0.1,
                value: "AI-Powered",
                label: "Skill Matching",
                media: (
                  <motion.img
                    src="/images/user-achivments.png"
                    alt="User Achievement"
                    className="h-10 w-10 object-contain"
                    animate={{ rotate: [0, 4, -4, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                ),
                bg: "bg-[#F7FBFF]",
                ring: "ring-[#E6ECF8]",
              },
              {
                delay: 0.2,
                value: "119+",
                label: "Skills Auto-Extracted",
                media: (
                  <motion.div
                    className="h-10 w-10 flex items-center justify-center"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                        stroke="#005DDC"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ),
                bg: "bg-white",
                ring: "ring-[#E6ECF8]",
              },
              {
                delay: 0.3,
                value: "Real",
                label: "Coding Assessments",
                media: (
                  <motion.div
                    className="h-10 w-10 flex items-center justify-center"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z"
                        stroke="#005DDC"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 7V5C8 4.46957 8.21071 3.96086 8.58579 3.58579C8.96086 3.21071 9.46957 3 10 3H14C14.5304 3 15.0391 3.21071 15.4142 3.58579C15.7893 3.96086 16 4.46957 16 5V7"
                        stroke="#005DDC"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ),
                bg: "bg-white",
                ring: "ring-[#E6ECF8]",
              },
              {
                delay: 0.4,
                value: "Verified",
                label: "Skill Profiles",
                media: (
                  <motion.div
                    className="h-10 w-10 flex items-center justify-center"
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 6H20M4 12H20M4 18H20"
                        stroke="#005DDC"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ),
                bg: "bg-[#F7FBFF]",
                ring: "ring-[#E6ECF8]",
              },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                className={[
                  "group relative w-full rounded-3xl border border-[#E6ECF8]",
                  card.bg,
                  "p-5 md:p-6 shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)]",
                  "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-40px_rgba(0,0,0,0.26)]",
                ].join(" ")}
                variants={boxVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: card.delay }}
              >
                {/* subtle inner glow on hover (theme-only) */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[#005DDC]/[0.06] via-transparent to-transparent" />

                <div className="relative flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl border border-[#E6ECF8] bg-white/70 backdrop-blur flex items-center justify-center">
                    {card.media}
                  </div>

                  <div className="flex flex-col items-start gap-0.5">
                    <motion.h3
                      className="text-[#0b1b3a] text-lg md:text-xl font-extrabold tracking-tight"
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: card.delay + 0.15, duration: 0.45 }}
                    >
                      {card.value}
                    </motion.h3>
                    <p className="text-[#64748B] text-sm font-medium">{card.label}</p>
                  </div>

                  <div className="ml-auto hidden sm:block">
                    <span className="inline-flex items-center rounded-full border border-[#E6ECF8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0b1b3a]">
                      Built-in
                      <span className="ml-2 h-1.5 w-1.5 rounded-full bg-[#005DDC]" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Achievements;

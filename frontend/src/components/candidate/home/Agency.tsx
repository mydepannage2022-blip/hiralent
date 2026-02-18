import React from "react";
import { motion, Variants } from "framer-motion";
import Link from "next/link";

const Agency = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* theme glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.03] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#F7FBFF] to-transparent" />
      </div>

      <div className="relative mx-auto w-[92%] max-w-7xl py-14 md:py-18">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Image */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-3xl border border-[#E6ECF8] bg-gradient-to-br from-[#F8FBFF] to-white shadow-[0_18px_45px_-38px_rgba(0,0,0,0.22)]">
              <div className="absolute inset-0 bg-gradient-to-tl from-[#005DDC]/[0.06] via-transparent to-transparent" />
              <img
                src="/images/agency.png"
                alt="Agency Partner"
                className="w-full h-full object-cover"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#E6ECF8]" />
            </div>
          </div>

          {/* Copy */}
          <motion.div
            className="lg:col-span-5 order-1 lg:order-2"
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6ECF8] bg-[#F7FBFF] px-3 py-1 text-xs font-semibold text-[#0b1b3a]">
              <span className="h-2 w-2 rounded-full bg-[#005DDC]" />
              For Agencies
            </div>

            <motion.h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-[#0b1b3a] leading-[1.12]">
              Are you an agency?
              <span className="block text-[#64748B] text-base md:text-lg font-medium mt-2">
                Help candidates relocate — in one shared workspace.
              </span>
            </motion.h2>

            <motion.p
              className="mt-4 text-sm md:text-base text-[#64748B] leading-relaxed max-w-xl"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              Partner with Hiralent to support visa, relocation, and integration.
              Join our trusted network and operate inside the same timeline as
              candidates and employers.
            </motion.p>

            {/* Benefits List */}
            <motion.ul
              className="mt-5 space-y-2 text-sm text-[#64748B]"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.45 }}
            >
              {["Steady flow of clients", "Easy-to-use platform", "Grow your business"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#005DDC]" />
                  <span className="font-medium">{t}</span>
                </li>
              ))}
            </motion.ul>

            {/* Button */}
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.45 }}
            >
              <Link href="/agency/home">
                <motion.button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#005DDC] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(0,93,220,0.45)] hover:opacity-95 transition border border-[#005DDC]/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Become a Partner <span aria-hidden>→</span>
                </motion.button>
              </Link>

              <div className="mt-3 text-[11px] font-semibold text-[#94A3B8]">
                Verified partners • Transparent case tracking
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Agency;

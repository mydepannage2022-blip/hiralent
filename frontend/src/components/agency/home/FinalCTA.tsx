import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const FinalCTA = () => {
  return (
    <div className="w-full flex justify-center items-center bg-[#005DDC] py-20 lg:py-28">
      <div className="lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col items-center gap-8">
        
        {/* Heading */}
        <motion.h2
          className="text-white text-3xl lg:text-4xl xl:text-5xl font-bold text-center"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          Ready to Partner?
        </motion.h2>

        {/* Subtext */}
        <motion.p
          className="text-white/90 text-base lg:text-xl text-center max-w-2xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Join our growing network of trusted agencies and start receiving cases today
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Link href="/agency/apply">
            <motion.button
              className="bg-white text-[#005DDC] font-semibold py-4 px-12 lg:px-16 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Apply Now →
            </motion.button>
          </Link>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="flex flex-wrap justify-center items-center gap-8 lg:gap-12 mt-8 text-white/80 text-sm lg:text-base"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span>No upfront fees</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span>Quick approval process</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span>Dedicated support</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default FinalCTA;
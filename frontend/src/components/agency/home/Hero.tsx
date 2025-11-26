import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const Hero = () => {
  return (
    <div className="w-full flex justify-center items-center bg-gradient-to-br from-[#EFF5FF] to-white pt-32 pb-20">
      <div className="lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col justify-center items-center gap-8">
        
        {/* Heading */}
        <motion.h1
          className="text-[#222] text-4xl lg:text-5xl xl:text-6xl font-bold text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Partner With Hiralent
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="text-[#757575] text-base lg:text-lg xl:text-xl text-center max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Join the leading global relocation platform and help candidates 
          transition successfully. Partner with top companies worldwide and grow your business.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Link href="/agency/apply">
            <motion.button
              className="bg-[#005DDC] text-white font-semibold py-4 px-12 lg:px-16 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Apply Now →
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats (Optional) */}
        <motion.div
          className="flex flex-col lg:flex-row justify-center items-center gap-8 lg:gap-16 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="text-center">
            <h3 className="text-3xl lg:text-4xl font-bold text-[#005DDC]">50+</h3>
            <p className="text-[#757575] text-sm lg:text-base">Partner Agencies</p>
          </div>
          <div className="text-center">
            <h3 className="text-3xl lg:text-4xl font-bold text-[#005DDC]">500+</h3>
            <p className="text-[#757575] text-sm lg:text-base">Successful Relocations</p>
          </div>
          <div className="text-center">
            <h3 className="text-3xl lg:text-4xl font-bold text-[#005DDC]">95%</h3>
            <p className="text-[#757575] text-sm lg:text-base">Success Rate</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Hero;
import React from "react";
import { motion, Variants } from "framer-motion";
import Link from "next/link";

const Agency = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="w-full flex justify-center items-center bg-white">
      <div className="lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col lg:flex-row justify-start items-center gap-12 pt-8 lg:py-12">
        
        {/* Image Section - LEFT SIDE */}
        <div className="w-full lg:w-2/3 flex justify-center items-center order-2 lg:order-1">
          <img src="/images/agency.png" alt="Agency Partner" />
        </div>

        {/* Text Section - RIGHT SIDE */}
        <motion.div
          className="flex flex-col justify-center items-center gap-5 w-full lg:w-1/3 pb-8 lg:pb-12 order-1 lg:order-2"
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h2
            className="text-[#222] text-2xl lg:text-3xl xl:text-4xl font-semibold text-center"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Are you an Agency?
          </motion.h2>
          
          <motion.p
            className="text-[#757575] text-sm lg:text-base text-center max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Partner with Hiralent to help candidates relocate successfully. 
            Join our trusted network of visa, relocation, and integration agencies.
          </motion.p>

          {/* Benefits List */}
          <motion.ul
            className="text-[#757575] text-sm lg:text-base space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <li className="flex items-start gap-2">
              <span className="text-[#005DDC] font-bold">✓</span>
              <span>Steady flow of clients</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#005DDC] font-bold">✓</span>
              <span>Easy-to-use platform</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#005DDC] font-bold">✓</span>
              <span>Grow your business</span>
            </li>
          </motion.ul>

          {/* Button */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Link href="/agency/home">
              <motion.button
                className="bg-[#005DDC] text-white font-semibold py-4 px-8 lg:px-16 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
                whileHover={{
                  scale: 1.05,
                  boxShadow:
                    "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className="bg-white bg-clip-text text-transparent cursor-pointer"
                  whileHover={{
                    backgroundPosition: ["0% 50%", "100% 50%"],
                  }}
                  transition={{ duration: 0.5 }}
                >
                  Become a Partner →
                </motion.span>
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
};

export default Agency;
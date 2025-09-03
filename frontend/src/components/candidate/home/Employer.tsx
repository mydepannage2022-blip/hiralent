import React from "react";
import { motion, Variants } from "framer-motion";

const Employer = () => {
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
    <div className="w-full flex justify-center items-center bg-[#EFF5FF]">
      <div className="lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col lg:flex-row justify-start items-center gap-12 pt-8 lg:py-0">
        {/* Header Section */}
        <motion.div
          className="flex flex-col justify-center items-center gap-5 w-full lg:w-1/3 pb-8 lg:pb-12"
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
            Are you employer?
          </motion.h2>
          <motion.p
            className="text-[#757575] text-sm lg:text-base text-center max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            You can find various solutions just by accessing our platform.
            Because we are committed to maintaining the quality of user service
          </motion.p>
          {/* View All Button */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
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
                Post a Job →
              </motion.span>
            </motion.button>
          </motion.div>
        </motion.div>


        <div className="w-full lg:w-2/3 flex justify-center items-center">
          <img src="/images/employer.png" alt="Employer" />
        </div>
      </div>
    </div>
  );
};

export default Employer;

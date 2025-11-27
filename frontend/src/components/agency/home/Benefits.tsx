import React from "react";
import { motion } from "framer-motion";
import { HiOutlineBriefcase, HiOutlineTrendingUp, HiOutlineLightningBolt } from "react-icons/hi";

const Benefits = () => {
  const benefits = [
    {
      icon: HiOutlineBriefcase,
      title: "Steady Client Flow",
      description: "Access a continuous stream of qualified candidates from top companies seeking relocation services.",
    },
    {
      icon: HiOutlineTrendingUp,
      title: "Grow Your Business",
      description: "Expand your reach and increase revenue by partnering with the leading global talent platform.",
    },
    {
      icon: HiOutlineLightningBolt,
      title: "Easy-to-Use Platform",
      description: "Manage all your cases in one simple dashboard. Track progress, upload documents, and communicate seamlessly.",
    },
  ];

  return (
    <div className="w-full flex justify-center items-center bg-white py-16 lg:py-24">
      <div className="lg:max-w-5xl xl:max-w-7xl w-9/10">
        
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-[#222] text-3xl lg:text-4xl xl:text-5xl font-bold mb-4">
            Why Partner With Us?
          </h2>
          <p className="text-[#757575] text-base lg:text-lg max-w-2xl mx-auto">
            Join our trusted network of agencies and unlock new opportunities for growth
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center p-6 lg:p-8 bg-[#F9FAFB] rounded-xl hover:shadow-lg transition-shadow duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                whileHover={{ scale: 1.03, y: -5 }}
              >
                {/* Icon */}
                <motion.div
                className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4"
                whileHover={{ scale: 1.2, rotate: 10 }}
                transition={{ duration: 0.3 }}
                >
                <IconComponent className="text-[#005DDC] text-4xl lg:text-5xl" />
                </motion.div>

                {/* Title */}
                <h3 className="text-[#222] text-xl lg:text-2xl font-semibold mb-3">
                  {benefit.title}
                </h3>

                {/* Description */}
                <p className="text-[#757575] text-sm lg:text-base">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Benefits;
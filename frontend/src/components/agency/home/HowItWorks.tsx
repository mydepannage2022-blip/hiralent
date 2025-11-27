import React from "react";
import { motion } from "framer-motion";

const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      title: "Apply",
      description: "Fill out our simple application form in just 5 minutes. Tell us about your agency and services.",
    },
    {
      number: "2",
      title: "Get Approved",
      description: "We review your application and respond within 48 hours. Our team ensures quality partnerships.",
    },
    {
      number: "3",
      title: "Start Working",
      description: "Receive cases, manage them through our dashboard, and grow your business with steady clients.",
    },
  ];

  return (
    <div className="w-full flex justify-center items-center bg-[#EFF5FF] py-16 lg:py-24">
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
            How It Works
          </h2>
          <p className="text-[#757575] text-base lg:text-lg max-w-2xl mx-auto">
            Getting started is simple. Follow these three easy steps.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
            >
              {/* Number Circle */}
              <motion.div
                className="w-20 h-20 lg:w-24 lg:h-24 bg-[#005DDC] text-white rounded-full flex items-center justify-center text-3xl lg:text-4xl font-bold mb-6 shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                {step.number}
              </motion.div>

              {/* Connecting Line (hidden on last item) */}
                {index < steps.length - 1 && (
                <div 
                    className="hidden md:block absolute top-10 left-1/2 h-1 bg-[#005DDC] opacity-20" 
                    style={{ 
                    width: "calc(100% - 3rem)",
                    transform: "translateX(1.5rem)"
                    }} 
                />
                )}

              {/* Title */}
              <h3 className="text-[#222] text-xl lg:text-2xl font-semibold mb-3">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-[#757575] text-sm lg:text-base max-w-xs">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default HowItWorks;
// components/layouts/AuthLayout.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProgressSteps, { signupSteps } from "../auth/ProgressSteps";
import TabSelector from "../auth/TabSelector";

// Types
interface Testimonial {
  id: number;
  name: string;
  role: string;
  text: string;
  image: string;
}

interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage: string;
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  currentStep?: number;
  showTabs?: boolean;
  activeTab?: 'candidate' | 'company';
}

// Testimonial Slider Component
const TestimonialSlider: React.FC<{ testimonials: Testimonial[] }> = ({ testimonials }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="absolute bottom-6 lg:left-6 lg:right-6 xl:left-24 xl:right-24 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="w-full flex-shrink-0"
          >
            <div className="mb-4">
              <p className="text-gray-700 text-sm leading-relaxed font-medium">
                "{testimonials[currentSlide].text}"
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-full overflow-hidden"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={testimonials[currentSlide].image}
                    alt={testimonials[currentSlide].name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {testimonials[currentSlide].name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {testimonials[currentSlide].role}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {testimonials.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      index === currentSlide ? "bg-[#063B82]" : "bg-gray-300"
                    }`}
                    whileHover={{ scale: 1.3 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  backgroundImage, 
  testimonials,
  title,
  subtitle,
  currentStep,
  showTabs = true,
  activeTab = 'candidate'
}) => {
  return (
    <div className="w-full flex justify-center min-h-screen items-center bg-[#FFFFFF]">
      <div className="w-full flex flex-col lg:flex-row justify-between items-start lg:gap-0 xl:gap-16">
        {/* Left Column - Form Content */}
        <motion.div
          className="w-full lg:w-1/2 flex flex-col justify-start items-center lg:items-center lg:gap-0 xl:gap-4 p-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Progress Steps */}
          {currentStep && (
            <ProgressSteps currentStep={currentStep} steps={signupSteps} />
          )}

          {/* Logo */}
          <motion.div
            className="flex justify-center items-center gap-3 p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <img src="/images/logo.png" alt="logo" className="w-[200px]" />
          </motion.div>

          {/* Tab Selection */}
          {showTabs && (
            <TabSelector activeTab={activeTab} />
          )}

          {/* Title and Subtitle */}
          {(title || subtitle) && (
            <motion.div
              className="flex flex-col justify-center items-center gap-1 py-2 text-[#222]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {title && <h2 className="text-2xl font-bold">{title}</h2>}
              {subtitle && (
                <p className="text-center text-xs lg:text-sm w-full lg:w-2/3">
                  {subtitle}
                </p>
              )}
            </motion.div>
          )}

          {/* Form Content */}
          <div className="w-full max-w-md">
            {children}
          </div>
        </motion.div>

        {/* Right Column - Image and Testimonials */}
        <motion.div
          className="hidden lg:block w-full lg:w-1/2 relative h-[95vh] mr-4 rounded-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.img
            src={backgroundImage}
            alt="Auth background"
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          <TestimonialSlider testimonials={testimonials} />
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
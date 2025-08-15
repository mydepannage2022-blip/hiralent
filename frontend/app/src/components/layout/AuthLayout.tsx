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
    <div className="absolute bottom-6 left-6 right-6 lg:left-8 lg:right-8 xl:left-12 xl:right-12 bg-white/95 backdrop-blur-sm rounded-xl p-4 lg:p-6 shadow-xl border border-white/20">
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
            <div className="mb-3 lg:mb-4">
              <p className="text-gray-700 text-xs lg:text-sm leading-relaxed font-medium">
                "{testimonials[currentSlide].text}"
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={testimonials[currentSlide].image}
                    alt={testimonials[currentSlide].name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-xs lg:text-sm truncate">
                    {testimonials[currentSlide].name}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {testimonials[currentSlide].role}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
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
    <div className="w-full min-h-screen bg-[#FFFFFF] lg:overflow-hidden">
      <div className="w-full h-screen flex flex-col lg:flex-row">
        <motion.div
          className="w-full lg:w-1/2 flex flex-col justify-start items-center lg:overflow-y-auto lg:h-screen p-3 py-6 lg:py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="w-full max-w-md space-y-6 lg:space-y-8">
            {/* Progress Steps */}
            {currentStep && (
              <div className="flex justify-center">
                <ProgressSteps currentStep={currentStep} steps={signupSteps} />
              </div>
            )}

            {/* Logo */}
            <motion.div
              className="flex justify-center items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <img src="/images/logo.png" alt="logo" className="w-[180px] lg:w-[200px]" />
            </motion.div>

            {/* Tab Selection */}
            {showTabs && (
              <div className="flex justify-center">
                <TabSelector activeTab={activeTab} />
              </div>
            )}

            {/* Title and Subtitle */}
            {(title || subtitle) && (
              <motion.div
                className="flex flex-col justify-center items-center gap-2 text-[#222] text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {title && <h2 className="text-xl lg:text-2xl font-bold">{title}</h2>}
                {subtitle && (
                  <p className="text-xs lg:text-sm text-gray-600 max-w-sm">
                    {subtitle}
                  </p>
                )}
              </motion.div>
            )}

            {/* Form Content */}
            <div className="w-full">
              {children}
            </div>

            {/* Spacer for mobile to ensure content doesn't stick to bottom */}
            <div className="h-8 lg:hidden"></div>
          </div>
        </motion.div>

        {/* Right Column - Image and Testimonials (Sticky) */}
        <motion.div
          className="hidden lg:block lg:w-1/2 lg:h-screen lg:sticky lg:top-0 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Background Image */}
          <motion.img
            src={backgroundImage}
            alt="Auth background"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/10"></div>
          
          {/* Testimonials */}
          <div className="relative z-10 h-full">
            <TestimonialSlider testimonials={testimonials} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
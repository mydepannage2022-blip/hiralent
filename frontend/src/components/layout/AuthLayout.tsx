// src/components/layout/AuthLayout.tsx
"use client";

import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ProgressSteps = dynamic(() => import("../auth/ProgressSteps"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-8 w-64 rounded mb-2"></div>
});

const TabSelector = dynamic(() => import("../auth/TabSelector"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-10 w-48 rounded mb-2"></div>
});

// Import steps statically (they're small)
import { signupSteps, companySteps } from "../auth/ProgressSteps";

// Types
interface Testimonial {
  id: number;
  name: string;
  role: string;
  text: string;
  image: string;
}

interface Step {
  id: number;
  path: string;
  label: string;
  isCompleted?: boolean;
  isActive?: boolean;
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
  steps?: Step[];
}

// Testimonial Slider Component - Simple transitions only
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
        <div className="w-full flex-shrink-0">
          <div className="mb-3 lg:mb-4">
            <p className="text-gray-700 text-xs lg:text-sm leading-relaxed font-medium">
              "{testimonials[currentSlide].text}"
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden flex-shrink-0 hover:scale-105 transition-transform duration-200">
                <img
                  src={testimonials[currentSlide].image}
                  alt={testimonials[currentSlide].name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
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
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                    index === currentSlide ? "bg-[#063B82]" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
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
  activeTab = 'candidate',
  steps
}) => {
  // Determine which steps to use
  const getStepsToUse = () => {
    if (steps) return steps;
    if (activeTab === 'company') return companySteps;
    return signupSteps;
  };

  const stepsToUse = getStepsToUse();

  return (
    <div className="w-full min-h-screen bg-[#FFFFFF]">
      <div className="w-full h-screen flex flex-col lg:flex-row">
        {/* Left Column - Form Content (Scrollable) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-start items-center overflow-y-auto h-screen p-3 py-6 lg:py-8">
          <div className="w-full max-w-md flex flex-col items-center gap-2 lg:gap-4 xl:gap-6">
            {/* Progress Steps */}
            {currentStep && (
              <div className="flex justify-center mb-2">
                <ProgressSteps currentStep={currentStep} steps={stepsToUse} />
              </div>
            )}

            {/* Logo */}
            <div className="flex justify-center items-center mb-1">
              <img src="/images/logo.png" alt="logo" className="w-[120px] lg:w-[160px]" loading="eager" />
            </div>

            {/* Tab Selection */}
            {showTabs && (
              <div className="flex justify-center my-2">
                <TabSelector activeTab={activeTab} />
              </div>
            )}

            {/* Title and Subtitle */}
            {(title || subtitle) && (
              <div className="flex flex-col justify-center items-center gap-1 text-[#222] text-center mb-1">
                {title && <h2 className="text-lg lg:text-xl font-bold">{title}</h2>}
                {subtitle && (
                  <p className="text-xs lg:text-xs text-gray-600 max-w-sm">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Form Content */}
            <div className="w-full">
              {children}
            </div>
          </div>
        </div>

        {/* Right Column - Background & Testimonials */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-blue-800/10 to-transparent" />
          
          {/* Testimonials */}
          <TestimonialSlider testimonials={testimonials} />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
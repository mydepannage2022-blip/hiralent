// src/components/layout/AuthLayout.tsx
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ProgressSteps = dynamic(() => import("../auth/ProgressSteps"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-8 w-64 rounded mb-2" />,
});
const TabSelector = dynamic(() => import("../auth/TabSelector"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-10 w-48 rounded mb-2" />,
});
const AuthBrandPanel = dynamic(() => import("./AuthBrandPanel"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg,#EFF6FF 0%,#EBF3FF 45%,#F7FBFF 100%)" }}>
      <div className="w-[340px] h-[340px] rounded-full animate-pulse" style={{ background: "#DBEAFE" }} />
    </div>
  ),
});

import { signupSteps, companySteps } from "../auth/ProgressSteps";

interface Testimonial { id: number; name: string; role: string; text: string; image: string; }
interface Step { id: number; path: string; label: string; isCompleted?: boolean; isActive?: boolean; }
interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage: string;
  testimonials: Testimonial[];
  title?: string; subtitle?: string; currentStep?: number;
  showTabs?: boolean; activeTab?: "candidate" | "company"; steps?: Step[];
}

/* ─── Testimonial slider ─── */
const TestimonialSlider: React.FC<{ testimonials: Testimonial[] }> = ({ testimonials }) => {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCur(p => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  return (
    <div className="absolute bottom-5 left-5 right-5 z-40 bg-white/96 backdrop-blur-sm rounded-[16px] p-4 border border-[#E6ECF8]"
      style={{ boxShadow: "0 4px 24px rgba(0,93,220,0.09)" }}>
      <p className="text-[#475569] text-[11px] leading-relaxed mb-3">
        &ldquo;{testimonials[cur].text}&rdquo;
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[#E6ECF8] flex-shrink-0">
            <img src={testimonials[cur].image} alt={testimonials[cur].name}
              className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div>
            <p className="text-[#0b1b3a] text-[11px] font-semibold">{testimonials[cur].name}</p>
            <p className="text-[#94A3B8] text-[9px]">{testimonials[cur].role}</p>
          </div>
        </div>
        <div className="flex gap-1 items-center">
          {testimonials.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
              i === cur ? "bg-[#005DDC] w-4" : "bg-[#E2E8F0] w-1.5"
            }`} />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Main layout ─── */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children, backgroundImage, testimonials, title, subtitle,
  currentStep, showTabs = true, activeTab = "candidate", steps,
}) => {
  const stepsToUse = steps ?? (activeTab === "company" ? companySteps : signupSteps);

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full h-screen flex flex-col lg:flex-row">

        {/* Left — form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-start items-center overflow-y-auto h-screen p-3 py-6 lg:py-8">
          <div className="w-full max-w-md flex flex-col items-center gap-2 lg:gap-4 xl:gap-6">
            {currentStep && (
              <div className="flex justify-center mb-2">
                <ProgressSteps currentStep={currentStep} steps={stepsToUse} />
              </div>
            )}
            <div className="flex justify-center items-center mb-1">
              <img src="/images/logo.png" alt="Hiralent" className="w-[120px] lg:w-[160px]" loading="eager" />
            </div>
            {showTabs && (
              <div className="flex justify-center my-2">
                <TabSelector activeTab={activeTab} />
              </div>
            )}
            {(title || subtitle) && (
              <div className="flex flex-col justify-center items-center gap-1 text-[#222] text-center mb-1">
                {title && <h2 className="text-lg lg:text-xl font-bold">{title}</h2>}
                {subtitle && <p className="text-xs text-gray-600 max-w-sm">{subtitle}</p>}
              </div>
            )}
            <div className="w-full">{children}</div>
          </div>
        </div>

        {/* Right — brand panel */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <AuthBrandPanel />
          <TestimonialSlider testimonials={testimonials} />
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;

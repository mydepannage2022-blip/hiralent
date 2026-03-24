// src/components/layout/AuthLayout.tsx
"use client";

import React from "react";
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
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "linear-gradient(148deg, #FAFCFF 0%, #F2F7FF 28%, #EAF1FE 58%, #E0EAFD 100%)" }}
    >
      <div
        className="w-72 h-72 rounded-full animate-pulse"
        style={{ background: "rgba(37,99,235,0.07)" }}
      />
    </div>
  ),
});

import { signupSteps, companySteps } from "../auth/ProgressSteps";

interface Step { id: number; path: string; label: string; isCompleted?: boolean; isActive?: boolean; }
interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage?: string;
  /** @deprecated no longer rendered — kept for backwards compatibility */
  testimonials?: unknown[];
  title?: string;
  subtitle?: string;
  currentStep?: number;
  showTabs?: boolean;
  activeTab?: "candidate" | "company";
  steps?: Step[];
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  currentStep,
  showTabs = true,
  activeTab = "candidate",
  steps,
}) => {
  const stepsToUse = steps ?? (activeTab === "company" ? companySteps : signupSteps);

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full h-screen flex flex-col lg:flex-row">

        {/* Left — form pane (unchanged styling, narrowed to 40%) */}
        <div className="w-full lg:w-[40%] flex flex-col justify-start items-center overflow-y-auto h-screen p-3 py-6 lg:py-8">
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
                {title    && <h2 className="text-lg lg:text-xl font-bold">{title}</h2>}
                {subtitle && <p className="text-xs text-gray-600 max-w-sm">{subtitle}</p>}
              </div>
            )}
            <div className="w-full">{children}</div>
          </div>
        </div>

        {/* Right — dark globe panel (60%) */}
        <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
          <AuthBrandPanel />
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;

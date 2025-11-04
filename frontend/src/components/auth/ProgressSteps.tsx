// src/components/auth/ProgressSteps.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import SmartLink from "../layout/SmartLink";

interface Step {
  id: number;
  path: string;
  label: string;
  isCompleted?: boolean;
  isActive?: boolean;
}

interface ProgressStepsProps {
  currentStep: number;
  steps: Step[];
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep, steps }) => {
  return (
    <motion.div
      className="flex justify-center items-center gap-3 px-8 py-4 lg:px-4 lg:py-2  xl:px-8 xl:py-2 "
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isClickable = currentStep >= step.id;

        return (
          <motion.div
            key={step.id}
            className="relative group"
            whileHover={isClickable ? { scale: 1.05 } : {}}
            transition={{ duration: 0.3 }}
          >
            {isClickable ? (
              <SmartLink
                href={step.path}
                className={`block py-[1px] px-3 md:px-10 lg:px-8 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-[#005DDC] text-white shadow-lg"
                    : isCompleted
                    ? "bg-[#005DDC] text-white"
                    : "bg-[#CFE3FF] text-[#063B82] hover:bg-[#B8D4FF]"
                }`}
                onClick={() => console.log(`Navigating to ${step.label}`)}
              >
                <span className="text-sm font-medium">{step.id}</span>
              </SmartLink>
            ) : (
              <div
                className="py-[1px] px-3 md:px-10 lg:px-8 rounded-lg bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                title={`Complete previous steps to unlock ${step.label}`}
              >
                <span className="text-sm font-medium">{step.id}</span>
              </div>
            )}

            {/* Step connector line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute top-1/2 -right-1.5 w-3 h-0.5 transform -translate-y-1/2 transition-colors duration-300 ${
                  isCompleted ? "bg-[#063B82]" : "bg-[#E5E7EB]"
                }`}
              />
            )}

            {/* Tooltip with step name on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10">
              {step.label}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

// Configuration for candidate signup steps
export const signupSteps: Step[] = [
  {
    id: 1,
    path: "/auth/signup",
    label: "Basic Information"
  },
  {
    id: 2,
    path: "/auth/signup/location",
    label: "Location"
  },
  {
    id: 3,
    path: "/auth/signup/salary",
    label: "Salary Preferences"
  },
  {
    id: 4,
    path: "/auth/signup/profile-picture",
    label: "Profile Picture"
  },
  {
    id: 5,
    path: "/auth/signup/uploadresume",
    label: "Upload Resume"
  }
];

// Configuration for company registration steps
// Add step 3 in companySteps array
export const companySteps: Step[] = [
  {
    id: 1,
    path: "/auth/companyRegister",
    label: "Admin Information"
  },
  {
    id: 2,
    path: "/auth/companyRegister/info", 
    label: "Company Details"
  },
  {
    id: 3,
    path: "/auth/companyRegister/verification",
    label: "Document Verification"
  }
];

export default ProgressSteps;
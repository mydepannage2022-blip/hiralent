// frontend/src/components/company/dashboard/employer/ProfileCompleteness.tsx

"use client";

import React from "react";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { useProfileCompleteness } from "@/src/lib/company/employer.queries";

interface ProfileCompletenessProps {
  onSectionClick?: (section: string) => void;
}

const SECTION_CONFIG: Record<
  string,
  { label: string; description: string }
> = {
  basic_info: {
    label: "Company Info",
    description: "Name, tagline, description",
  },
  contact: {
    label: "Contact Details",
    description: "Email, phone, address",
  },
  business: {
    label: "Business Details",
    description: "Industry, size, founded year",
  },
  hiring: {
    label: "Hiring Preferences",
    description: "Work types, benefits, culture",
  },
  social: {
    label: "Social Links",
    description: "Website, LinkedIn, etc.",
  },
  logo: {
    label: "Company Logo",
    description: "Brand identity",
  },
};

export default function ProfileCompleteness({
  onSectionClick,
}: ProfileCompletenessProps) {
  const { data, isLoading } = useProfileCompleteness();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEDED] p-5">
        <div className="animate-pulse">
          <div className="h-4 bg-[#F0F0F0] rounded w-32 mb-3" />
          <div className="h-2 bg-[#F0F0F0] rounded w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-[#F0F0F0] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const score = data?.score || 0;
  const sections = data?.sections || {};

  // Determine color based on score
  const getScoreColor = () => {
    if (score >= 80) return "#16a34a"; // Green
    if (score >= 50) return "#f59e0b"; // Amber
    return "#dc2626"; // Red
  };

  const getScoreBg = () => {
    if (score >= 80) return "#DCFCE7";
    if (score >= 50) return "#FEF3C7";
    return "#FEE2E2";
  };

  const completedCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(sections).length;

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
          Profile Completeness
        </h3>
        <div
          className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
          style={{ backgroundColor: getScoreBg(), color: getScoreColor() }}
        >
          {score}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreColor(),
          }}
        />
      </div>

      {/* Summary */}
      <p className="text-[12px] text-[#888] mb-4">
        {completedCount} of {totalCount} sections completed
      </p>

      {/* Section checklist */}
      <div className="space-y-1">
        {Object.entries(SECTION_CONFIG).map(([key, config]) => {
          const isComplete = sections[key] === true;

          return (
            <button
              key={key}
              onClick={() => onSectionClick?.(key)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                ${onSectionClick ? "hover:bg-[#F9F9F9] cursor-pointer" : "cursor-default"}
              `}
            >
              {isComplete ? (
                <CheckCircle size={16} color="#16a34a" />
              ) : (
                <Circle size={16} color="#ccc" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-medium ${
                    isComplete ? "text-[#333]" : "text-[#888]"
                  }`}
                >
                  {config.label}
                </p>
              </div>
              {!isComplete && (
                <span className="text-[11px] text-[#f59e0b] bg-[#FEF3C7] px-2 py-0.5 rounded">
                  Incomplete
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tip */}
      {score < 100 && (
        <div className="mt-4 pt-4 border-t border-[#EDEDED]">
          <div className="flex gap-2 p-3 bg-[#EFF5FF] rounded-lg">
            <AlertCircle size={16} color="#005DDC" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-[#005DDC]">
                Complete your profile
              </p>
              <p className="text-[11px] text-[#005DDC]/70 mt-0.5">
                A complete profile helps attract better candidates and builds trust.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

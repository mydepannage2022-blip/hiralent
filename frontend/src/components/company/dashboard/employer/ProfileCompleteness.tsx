// frontend/src/components/company/dashboard/employer/ProfileCompleteness.tsx

"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle, Circle, AlertCircle, Link2, Check, ExternalLink } from "lucide-react";
import { useProfileCompleteness } from "@/src/lib/company/employer.queries";
import type { CompanyProfile } from "@/src/types/employer.types";

interface ProfileCompletenessProps {
  onSectionClick?: (section: string) => void;
  profile?: CompanyProfile;
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
  profile,
}: ProfileCompletenessProps) {
  const { data, isLoading } = useProfileCompleteness();
  const [isCopied, setIsCopied] = useState(false);

  // Build public profile URL
  const publicProfileUrl = useMemo(() => {
    const slug = (profile as any)?.slug;
    if (!slug) return "";
    
    const envBase =
      process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
      (typeof window !== "undefined" ? window.location.origin : "");
    
    if (!envBase) return "";
    const base = envBase.replace(/\/+$/, "");
    return `${base}/company/${slug}`;
  }, [(profile as any)?.slug]);

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return;

    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = publicProfileUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

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
    <div className="space-y-4">
      {/* Public Profile URL Card */}
      {publicProfileUrl && (
        <div className="bg-white rounded-xl border border-[#EDEDED] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} className="text-[#005DDC]" />
            <h3 className="text-[13px] font-semibold text-[#1a1a1a]">
              Public Profile
            </h3>
          </div>
          <p className="text-[11px] sm:text-[12px] text-[#005DDC] font-medium break-all mb-3">
            {publicProfileUrl}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-[12px] font-medium rounded-lg transition-colors ${
                isCopied
                  ? "bg-[#DCFCE7] text-[#16a34a]"
                  : "bg-[#005DDC] text-white hover:bg-[#0046B3]"
              }`}
            >
              {isCopied ? <Check size={14} /> : <Link2 size={14} />}
              {isCopied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-[12px] font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              <ExternalLink size={14} />
              View
            </a>
          </div>
        </div>
      )}

      {/* Profile Completeness Card */}
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
    </div>
  );
}

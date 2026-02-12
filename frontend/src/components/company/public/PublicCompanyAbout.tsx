// frontend/src/components/company/public/PublicCompanyAbout.tsx

"use client";

import React from "react";
import {
  Building2,
  Heart,
  Code,
  Gift,
  Home,
  Briefcase,
} from "lucide-react";
import { WORK_TYPE_OPTIONS } from "@/src/types/employer.types";
import type { CompanyProfile } from "@/src/types/employer.types";

interface PublicCompanyAboutProps {
  profile: CompanyProfile;
}

export default function PublicCompanyAbout({ profile }: PublicCompanyAboutProps) {
  const hasAbout = profile.description;
  const hasCulture = profile.culture_description;
  const hasBenefits = profile.benefits && profile.benefits.length > 0;
  const hasTechStack = profile.tech_stack && profile.tech_stack.length > 0;
  const hasWorkTypes = profile.work_types && profile.work_types.length > 0;

  const hasAnyContent = hasAbout || hasCulture || hasBenefits || hasTechStack || hasWorkTypes;

  if (!hasAnyContent) {
    return null;
  }

  // Get work type labels
  const getWorkTypeLabel = (value: string) => {
    const option = WORK_TYPE_OPTIONS.find((o) => o.value === value);
    return option?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* About Company */}
      {hasAbout && (
        <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} color="#005DDC" />
            <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
              About {profile.name}
            </h2>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-[14px] text-[#555] leading-relaxed whitespace-pre-line">
              {profile.description}
            </p>
          </div>
        </div>
      )}

      {/* Culture */}
      {hasCulture && (
        <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={18} color="#005DDC" />
            <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
              Our Culture
            </h2>
          </div>
          <p className="text-[14px] text-[#555] leading-relaxed whitespace-pre-line">
            {profile.culture_description}
          </p>
        </div>
      )}

      {/* Work Types & Benefits Grid */}
      {(hasWorkTypes || hasBenefits) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Types */}
          {hasWorkTypes && (
            <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Home size={18} color="#005DDC" />
                <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
                  Work Arrangements
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.work_types?.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1.5 text-[13px] font-medium bg-[#EFF5FF] text-[#005DDC] rounded-lg"
                  >
                    {getWorkTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {hasBenefits && (
            <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Gift size={18} color="#005DDC" />
                <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
                  Benefits & Perks
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.benefits?.map((benefit) => (
                  <span
                    key={benefit}
                    className="px-3 py-1.5 text-[13px] font-medium bg-[#F0FDF4] text-[#16a34a] rounded-lg"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tech Stack */}
      {hasTechStack && (
        <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code size={18} color="#005DDC" />
            <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
              Tech Stack
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.tech_stack?.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 text-[13px] font-medium bg-[#F5F5F5] text-[#555] rounded-lg border border-[#EDEDED]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

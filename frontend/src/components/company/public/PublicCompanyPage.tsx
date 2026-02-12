"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Building2, AlertCircle } from "lucide-react";
import { usePublicCompanyProfile } from "@/src/lib/company/employer.queries";
import PublicCompanyHeader from "./PublicCompanyHeader";
import PublicCompanyAbout from "./PublicCompanyAbout";
import PublicCompanyJobs from "./PublicCompanyJobs";

type Tab = "about" | "jobs";

export default function PublicCompanyPage() {
  const params = useParams() as { slug: string };
  const slug = params.slug;

  const [activeTab, setActiveTab] = useState<Tab>("about");

  const { data: company, isLoading, isError } = usePublicCompanyProfile(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={32}
            color="#005DDC"
            className="animate-spin mx-auto"
          />
          <p className="text-[14px] text-[#888] mt-3">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} color="#dc2626" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-2">
            Company Not Found
          </h1>
          <p className="text-[13px] text-[#888]">
            The company profile you're looking for doesn't exist or may have been removed.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "about" as Tab, label: "About" },
    { key: "jobs" as Tab, label: "Open Jobs" },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Header */}
      <PublicCompanyHeader company={company} />

      {/* Content container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] mb-6">
          <div className="flex items-center border-b border-[#EDEDED]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    px-6 py-3.5 text-[14px] font-medium border-b-2 -mb-px transition-colors
                    ${
                      isActive
                        ? "border-[#005DDC] text-[#005DDC]"
                        : "border-transparent text-[#888] hover:text-[#555]"
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === "about" && <PublicCompanyAbout company={company} />}
            {activeTab === "jobs" && <PublicCompanyJobs companySlug={slug} />}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pb-8">
          <p className="text-[12px] text-[#999]">
            Company profile on HiRalent
          </p>
        </div>
      </div>
    </div>
  );
}

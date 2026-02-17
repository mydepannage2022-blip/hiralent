"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft, Share2, ExternalLink } from "lucide-react";
import { usePublicCompanyProfile } from "@/src/lib/company/employer.queries";
import PublicCompanyHeader from "./PublicCompanyHeader";
import PublicCompanyAbout from "./PublicCompanyAbout";
import PublicCompanyJobs from "./PublicCompanyJobs";

type Tab = "about" | "jobs";

export default function PublicCompanyPage() {
  const params = useParams() as { slug: string };
  const slug = params.slug;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = usePublicCompanyProfile(slug);
  const profile = data?.profile;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} color="#005DDC" className="animate-spin mx-auto" />
          <p className="text-[14px] text-[#888] mt-3">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} color="#dc2626" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-2">Company Not Found</h1>
          <p className="text-[13px] text-[#888]">
            The company profile you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <button
            onClick={() => router.back()}
            className="inline-block mt-6 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
          >
            Go Back
          </button>
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
      {/* Top Mini Nav */}
      <div className="bg-white border-b border-[#EDEDED]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[52px]">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[#666] hover:text-[#005DDC] transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <Link href="/" className="text-[18px] font-bold text-[#005DDC]">
              HiRalent
            </Link>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#666] hover:text-[#005DDC] bg-[#F5F5F5] hover:bg-[#EFF5FF] rounded-lg transition-colors"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <PublicCompanyHeader profile={profile} />
      </div>

      {/* Tabs + Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Tabs */}
        <div className="bg-white rounded-t-xl border border-[#EDEDED] border-b-0">
          <div className="flex items-center">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    px-5 sm:px-6 py-3.5 text-[13px] sm:text-[14px] font-medium border-b-2 -mb-px transition-colors
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
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl border border-[#EDEDED] border-t border-t-[#EDEDED]">
          <div className="p-4 sm:p-6">
            {activeTab === "about" && <PublicCompanyAbout profile={profile} />}
            {activeTab === "jobs" && (
              <PublicCompanyJobs
                slug={slug}
                companyName={profile?.company_name || profile?.display_name || ""}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-[11px] text-[#bbb]">
            Company profile on{" "}
            <Link href="/" className="text-[#005DDC] hover:underline">
              HiRalent
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

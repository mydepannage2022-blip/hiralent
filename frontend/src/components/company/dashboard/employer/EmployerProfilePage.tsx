// frontend/src/components/company/dashboard/employer/EmployerProfilePage.tsx

"use client";

import React, { useState, useRef } from "react";
import {
  Building2,
  Mail,
  Briefcase,
  Users,
  Link2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useCompanyProfile } from "@/src/lib/company/employer.queries";
import ProfileHeader from "./ProfileHeader";
import ProfileCompleteness from "./ProfileCompleteness";
import CompanyInfoForm from "./CompanyInfoForm";
import ContactForm from "./ContactForm";
import BusinessDetailsForm from "./BusinessDetailsForm";
import HiringPreferencesForm from "./HiringPreferencesForm";
import SocialLinksForm from "./SocialLinksForm";
import SecurityAccount from "@/src/components/candidate/dashboard/settings/SecurityAccount";

type Tab = "info" | "contact" | "business" | "hiring" | "social" | "security";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "info", label: "Company Info", icon: Building2 },
  { key: "contact", label: "Contact", icon: Mail },
  { key: "business", label: "Business", icon: Briefcase },
  { key: "hiring", label: "Hiring", icon: Users },
  { key: "social", label: "Social Links", icon: Link2 },
  { key: "security", label: "Security", icon: ShieldCheck },
];

// Map completeness sections to tabs
const SECTION_TO_TAB: Record<string, Tab> = {
  basic_info: "info",
  contact: "contact",
  business: "business",
  hiring: "hiring",
  social: "social",
  logo: "info",
  security: "security",
};

export default function EmployerProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const formRefs = useRef<Record<Tab, HTMLDivElement | null>>({
    info: null,
    contact: null,
    business: null,
    hiring: null,
    social: null,
    security: null,
  });

  const { data: profileData, isLoading, isError } = useCompanyProfile();
  const profile = profileData?.profile;

  // Handle section click from completeness component
  const handleSectionClick = (section: string) => {
    const tab = SECTION_TO_TAB[section];
    if (tab) {
      setActiveTab(tab);
      // Scroll to form after tab change
      setTimeout(() => {
        formRefs.current[tab]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={32} color="#005DDC" className="animate-spin mx-auto" />
        <p className="text-[14px] text-[#888] mt-3">Loading profile...</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="py-20 text-center">
        <Building2 size={40} color="#ccc" className="mx-auto mb-3" />
        <p className="text-[15px] font-medium text-[#888]">
          Failed to load profile
        </p>
        <p className="text-[12px] text-[#aaa] mt-1">
          Please try again later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header (Logo/Cover) */}
      <ProfileHeader profile={profile} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Completeness */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <ProfileCompleteness 
              onSectionClick={handleSectionClick} 
              profile={profile}
            />
          </div>
        </div>

        {/* Main Content - Forms */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-[#EDEDED]">
            <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-lg whitespace-nowrap transition-colors
                      ${
                        isActive
                          ? "bg-[#EFF5FF] text-[#005DDC]"
                          : "text-[#888] hover:text-[#555] hover:bg-[#F9F9F9]"
                      }
                    `}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Form */}
          <div ref={(el) => { formRefs.current[activeTab] = el; }}>
            {activeTab === "info" && <CompanyInfoForm key={profile.updated_at || profile.company_id} profile={profile} />}
            {activeTab === "contact" && <ContactForm key={profile.updated_at || profile.company_id} profile={profile} />}
            {activeTab === "business" && <BusinessDetailsForm key={profile.updated_at || profile.company_id} profile={profile} />}
            {activeTab === "hiring" && <HiringPreferencesForm key={profile.updated_at || profile.company_id} profile={profile} />}
            {activeTab === "social" && <SocialLinksForm key={profile.updated_at || profile.company_id} profile={profile} />}
            {activeTab === "security" && <SecurityAccount />}
          </div>

        </div>
      </div>
    </div>
  );
}

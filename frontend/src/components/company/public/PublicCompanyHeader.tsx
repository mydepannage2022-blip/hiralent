
// frontend/src/components/company/public/PublicCompanyHeader.tsx

"use client";

import React from "react";
import Image from "next/image";
import {
  MapPin,
  Users,
  Calendar,
  Briefcase,
  Globe,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import type { CompanyProfile } from "@/src/types/employer.types";

interface PublicCompanyHeaderProps {
  profile: CompanyProfile;
}

export default function PublicCompanyHeader({ profile }: PublicCompanyHeaderProps) {
  const socialLinks = [
    { key: "website_url", icon: Globe, label: "Website" },
    { key: "linkedin_url", icon: Linkedin, label: "LinkedIn" },
    { key: "twitter_url", icon: Twitter, label: "Twitter" },
    { key: "facebook_url", icon: Facebook, label: "Facebook" },
    { key: "instagram_url", icon: Instagram, label: "Instagram" },
    { key: "youtube_url", icon: Youtube, label: "YouTube" },
  ].filter((link) => profile[link.key as keyof CompanyProfile]);

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED] overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-[200px] md:h-[240px] bg-gradient-to-r from-[#005DDC] to-[#0046B3]">
        {profile.cover_url && (
          <Image
            src={profile.cover_url}
            alt="Cover"
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-12">
          {/* Logo */}
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl border-4 border-white bg-white shadow-md overflow-hidden flex-shrink-0">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt={profile.name || "Company"}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-[#EFF5FF] flex items-center justify-center">
                <span className="text-[40px] font-bold text-[#005DDC]">
                  {profile.name?.charAt(0)?.toUpperCase() || "C"}
                </span>
              </div>
            )}
          </div>

          {/* Company Details */}
          <div className="flex-1 pt-4 md:pt-0 md:pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[24px] md:text-[28px] font-bold text-[#1a1a1a]">
                    {profile.name}
                  </h1>
                  {profile.is_verified && (
                    <CheckCircle size={20} color="#16a34a" className="flex-shrink-0" />
                  )}
                </div>
                {profile.tagline && (
                  <p className="text-[14px] text-[#666] mt-1">{profile.tagline}</p>
                )}
              </div>

              {/* Social Links - Desktop */}
              {socialLinks.length > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  {socialLinks.map((link) => {
                    const Icon = link.icon;
                    const url = profile[link.key as keyof CompanyProfile] as string;
                    return (
                      <a
                        key={link.key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#666] hover:bg-[#EFF5FF] hover:text-[#005DDC] transition-colors"
                        title={link.label}
                      >
                        <Icon size={18} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4">
              {profile.industry && (
                <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
                  <Briefcase size={14} color="#888" />
                  <span>{profile.industry}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
                  <MapPin size={14} color="#888" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.company_size && (
                <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
                  <Users size={14} color="#888" />
                  <span>{profile.company_size} employees</span>
                </div>
              )}
              {profile.founded_year && (
                <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
                  <Calendar size={14} color="#888" />
                  <span>Founded {profile.founded_year}</span>
                </div>
              )}
            </div>

            {/* Social Links - Mobile */}
            {socialLinks.length > 0 && (
              <div className="flex md:hidden items-center gap-2 mt-4">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  const url = profile[link.key as keyof CompanyProfile] as string;
                  return (
                    <a
                      key={link.key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#666] hover:bg-[#EFF5FF] hover:text-[#005DDC] transition-colors"
                      title={link.label}
                    >
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Website CTA */}
        {profile.website_url && (
          <div className="mt-5 pt-5 border-t border-[#EDEDED]">
            <a
              href={profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#005DDC] bg-[#EFF5FF] rounded-lg hover:bg-[#E0EDFF] transition-colors"
            >
              <Globe size={15} />
              Visit Website
              <ExternalLink size={13} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

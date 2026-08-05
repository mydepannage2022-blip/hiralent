// frontend/src/components/company/public/PublicCompanyHeader.tsx

"use client";

import React from "react";
import Image from "next/image";
import { API_HOST } from "@/src/lib/config/api";
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
  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const backendUrl = API_HOST;
    return `${backendUrl}${url}`;
  };

  const logoUrl = getImageUrl(profile.logo_url);
  const coverUrl =
    getImageUrl(profile.banner_url) || getImageUrl((profile as any).cover_url);

  const socialLinks = [
    { key: "website", icon: Globe, label: "Website" },
    { key: "linkedin_profile", icon: Linkedin, label: "LinkedIn" },
    { key: "twitter_handle", icon: Twitter, label: "Twitter" },
    { key: "facebook_page", icon: Facebook, label: "Facebook" },
    { key: "instagram_url", icon: Instagram, label: "Instagram" },
    { key: "youtube_url", icon: Youtube, label: "YouTube" },
  ].filter((link) => (profile as any)[link.key]);

  const metaItems = [
    { icon: Briefcase, value: profile.industry },
    { icon: MapPin, value: profile.headquarters || (profile as any).location },
    { icon: Users, value: profile.company_size ? `${profile.company_size} employees` : null },
    { icon: Calendar, value: profile.founded_year ? `Founded ${profile.founded_year}` : null },
  ].filter((item) => item.value);

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED] overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-[120px] sm:h-[160px] md:h-[200px] bg-gradient-to-r from-[#005DDC] to-[#0046B3]">
        {coverUrl && (
          <Image
            src={coverUrl}
            alt="Cover"
            fill
            className="object-cover"
            unoptimized
            priority
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 sm:px-6 pb-5 sm:pb-6">
        {/* Logo + Company Name row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12">
          {/* Logo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl border-4 border-white bg-white shadow-md overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={profile.company_name || profile.display_name || "Company"}
                width={112}
                height={112}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#EFF5FF] flex items-center justify-center">
                <span className="text-[28px] sm:text-[36px] font-bold text-[#005DDC]">
                  {(profile.company_name || profile.display_name)
                    ?.charAt(0)
                    ?.toUpperCase() || "C"}
                </span>
              </div>
            )}
          </div>

          {/* Name + Tagline */}
          <div className="flex-1 min-w-0 sm:pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#1a1a1a] truncate">
                {profile.company_name || profile.display_name}
              </h1>
              {profile.verified && (
                <CheckCircle size={20} color="#16a34a" className="flex-shrink-0" />
              )}
            </div>
            {(profile as any).tagline && (
              <p className="text-[13px] sm:text-[14px] text-[#666] mt-0.5 line-clamp-2">
                {(profile as any).tagline}
              </p>
            )}
          </div>

          {/* Social Links - Desktop */}
          {socialLinks.length > 0 && (
            <div className="hidden md:flex items-center gap-2 flex-shrink-0 pb-1">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                const url = (profile as any)[link.key] as string;
                return (
                  <a
                    key={link.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#666] hover:bg-[#EFF5FF] hover:text-[#005DDC] transition-colors"
                    title={link.label}
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Meta Info */}
        {metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 mt-4 pt-4 border-t border-[#EDEDED]">
            {metaItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-[#666]"
                >
                  <Icon size={14} color="#999" className="flex-shrink-0" />
                  <span>{item.value}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Social Links - Mobile */}
        {socialLinks.length > 0 && (
          <div className="flex md:hidden items-center gap-2 mt-4">
            {socialLinks.map((link) => {
              const Icon = link.icon;
              const url = (profile as any)[link.key] as string;
              return (
                <a
                  key={link.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#666] hover:bg-[#EFF5FF] hover:text-[#005DDC] transition-colors"
                  title={link.label}
                >
                  <Icon size={15} />
                </a>
              );
            })}
          </div>
        )}

        {/* Website CTA */}
        {(profile.website || (profile as any).website_url) && (
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-[#EDEDED]">
            <a
              href={profile.website || (profile as any).website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-[12px] sm:text-[13px] font-medium text-[#005DDC] bg-[#EFF5FF] rounded-lg hover:bg-[#E0EDFF] transition-colors"
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

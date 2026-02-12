// frontend/src/components/company/dashboard/employer/SocialLinksForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Link2, Loader2, Check, Globe, Linkedin, Twitter, Facebook, Instagram, Youtube } from "lucide-react";
import { useUpdateSocialLinks } from "@/src/lib/company/employer.queries";
import type { CompanyProfile, UpdateSocialLinksPayload } from "@/src/types/employer.types";

interface SocialLinksFormProps {
  profile: CompanyProfile;
}

const SOCIAL_FIELDS = [
  {
    key: "website_url" as const,
    label: "Website",
    placeholder: "https://yourcompany.com",
    icon: Globe,
  },
  {
    key: "linkedin_url" as const,
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/yourcompany",
    icon: Linkedin,
  },
  {
    key: "twitter_url" as const,
    label: "Twitter / X",
    placeholder: "https://twitter.com/yourcompany",
    icon: Twitter,
  },
  {
    key: "facebook_url" as const,
    label: "Facebook",
    placeholder: "https://facebook.com/yourcompany",
    icon: Facebook,
  },
  {
    key: "instagram_url" as const,
    label: "Instagram",
    placeholder: "https://instagram.com/yourcompany",
    icon: Instagram,
  },
  {
    key: "youtube_url" as const,
    label: "YouTube",
    placeholder: "https://youtube.com/@yourcompany",
    icon: Youtube,
  },
];

export default function SocialLinksForm({ profile }: SocialLinksFormProps) {
  const [formData, setFormData] = useState<UpdateSocialLinksPayload>({
    website_url: "",
    linkedin_url: "",
    twitter_url: "",
    facebook_url: "",
    instagram_url: "",
    youtube_url: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateSocialLinks();

  useEffect(() => {
    setFormData({
      website_url: profile.website_url || "",
      linkedin_url: profile.linkedin_url || "",
      twitter_url: profile.twitter_url || "",
      facebook_url: profile.facebook_url || "",
      instagram_url: profile.instagram_url || "",
      youtube_url: profile.youtube_url || "",
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  // Simple URL validation
  const isValidUrl = (url: string) => {
    if (!url) return true; // Empty is valid
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const hasInvalidUrls = SOCIAL_FIELDS.some(
    (field) => formData[field.key] && !isValidUrl(formData[field.key] || "")
  );

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EDEDED]">
        <div className="flex items-center gap-2">
          <Link2 size={18} color="#005DDC" />
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
            Social Links
          </h3>
        </div>
        <p className="text-[12px] text-[#888] mt-1">
          Connect your social profiles
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {SOCIAL_FIELDS.map((field) => {
          const Icon = field.icon;
          const value = formData[field.key] || "";
          const isInvalid = value && !isValidUrl(value);

          return (
            <div key={field.key}>
              <label className="block text-[12px] font-medium text-[#555] mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                <Icon
                  size={15}
                  color={isInvalid ? "#dc2626" : "#999"}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  type="url"
                  name={field.key}
                  value={value}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className={`
                    w-full pl-9 pr-3 py-2 text-[13px] border rounded-lg outline-none transition-colors
                    ${
                      isInvalid
                        ? "border-[#dc2626] focus:border-[#dc2626]"
                        : "border-[#EDEDED] focus:border-[#005DDC]"
                    }
                  `}
                />
              </div>
              {isInvalid && (
                <p className="text-[11px] text-[#dc2626] mt-1">
                  Please enter a valid URL
                </p>
              )}
            </div>
          );
        })}

        {/* Error message */}
        {updateMutation.isError && (
          <div className="p-3 bg-[#FEF2F2] rounded-lg">
            <p className="text-[12px] text-[#dc2626]">
              {updateMutation.error?.message || "Failed to update. Please try again."}
            </p>
          </div>
        )}

        {/* Success message */}
        {updateMutation.isSuccess && !hasChanges && (
          <div className="flex items-center gap-2 p-3 bg-[#DCFCE7] rounded-lg">
            <Check size={14} color="#16a34a" />
            <p className="text-[12px] text-[#16a34a]">Changes saved successfully</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!hasChanges || hasInvalidUrls || updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

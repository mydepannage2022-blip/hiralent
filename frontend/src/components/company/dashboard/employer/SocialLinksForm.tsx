// frontend/src/components/company/dashboard/employer/SocialLinksForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Link2, Globe, Linkedin, Twitter, Facebook, Instagram, Youtube, Loader2, Check } from "lucide-react";
import { useUpdateSocialLinks } from "@/src/lib/company/employer.queries";
import type { CompanyProfile, UpdateSocialLinksPayload } from "@/src/types/employer.types";

interface SocialLinksFormProps {
  profile: CompanyProfile;
}

export default function SocialLinksForm({ profile }: SocialLinksFormProps) {
  const [formData, setFormData] = useState({
    website: "",
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
      website: profile.website || "",
      linkedin_url: profile.linkedin_profile || "",
      twitter_url: profile.twitter_handle || "",
      facebook_url: profile.facebook_page || "",
      instagram_url: (profile as any).instagram_url || "",
      youtube_url: (profile as any).youtube_url || "",
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateSocialLinksPayload = {
      website: formData.website || undefined,
      linkedin_url: formData.linkedin_url || undefined,
      twitter_url: formData.twitter_url || undefined,
      facebook_url: formData.facebook_url || undefined,
      instagram_url: formData.instagram_url || undefined,
      youtube_url: formData.youtube_url || undefined,
    };
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const socialFields = [
    { name: "website", label: "Website", icon: Globe, placeholder: "https://yourcompany.com" },
    { name: "linkedin_url", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/company/yourcompany" },
    { name: "twitter_url", label: "Twitter / X", icon: Twitter, placeholder: "https://twitter.com/yourcompany" },
    { name: "facebook_url", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/yourcompany" },
    { name: "instagram_url", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourcompany" },
    { name: "youtube_url", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@yourcompany" },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED]">
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-[#EDEDED]">
        <div className="flex items-center gap-2">
          <Link2 size={18} color="#005DDC" />
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1a1a1a]">
            Social Links
          </h3>
        </div>
        <p className="text-[11px] sm:text-[12px] text-[#888] mt-1">
          Connect your social media profiles
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {socialFields.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.name}>
              <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                <Icon
                  size={15}
                  color="#999"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  type="url"
                  name={field.name}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
                />
              </div>
            </div>
          );
        })}

        {/* Error message */}
        {updateMutation.isError && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
            <p className="text-[11px] sm:text-[12px] text-[#dc2626]">
              {updateMutation.error?.message || "Failed to update. Please try again."}
            </p>
          </div>
        )}

        {/* Success message */}
        {updateMutation.isSuccess && !hasChanges && (
          <div className="flex items-center gap-2 p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg">
            <Check size={14} color="#16a34a" />
            <p className="text-[11px] sm:text-[12px] text-[#16a34a]">Changes saved successfully</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!hasChanges || updateMutation.isPending}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

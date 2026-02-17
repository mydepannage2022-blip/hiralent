// frontend/src/components/company/dashboard/employer/CompanyInfoForm.tsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Building2, Loader2, Check } from "lucide-react";
import { useUpdateCompanyInfo } from "@/src/lib/company/employer.queries";
import type { CompanyProfile, UpdateCompanyInfoPayload } from "@/src/types/employer.types";

interface CompanyInfoFormProps {
  profile: CompanyProfile;
}

export default function CompanyInfoForm({ profile }: CompanyInfoFormProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    tagline: "",
    description: "",
    slug: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateCompanyInfo();

  // Get base URL for display
  const baseUrl = useMemo(() => {
    const envBase =
      process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return envBase.replace(/\/+$/, "");
  }, []);

  useEffect(() => {
    setFormData({
      company_name: profile.company_name || profile.display_name || "",
      tagline: (profile as any).tagline || "",
      description: profile.description || "",
      slug: (profile as any).slug || "",
    });
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");
    setFormData((prev) => ({ ...prev, slug: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateCompanyInfoPayload = {
      company_name: formData.company_name || undefined,
      tagline: formData.tagline || undefined,
      description: formData.description || undefined,
      slug: formData.slug || undefined,
    };
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED]">
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-[#EDEDED]">
        <div className="flex items-center gap-2">
          <Building2 size={18} color="#005DDC" />
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1a1a1a]">
            Company Information
          </h3>
        </div>
        <p className="text-[11px] sm:text-[12px] text-[#888] mt-1">
          Basic details about your company
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
            Company Name <span className="text-[#dc2626]">*</span>
          </label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="Enter company name"
            required
            className="w-full px-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
            Tagline
          </label>
          <input
            type="text"
            name="tagline"
            value={formData.tagline}
            onChange={handleChange}
            placeholder="A short slogan or tagline"
            maxLength={120}
            className="w-full px-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
          />
          <p className="text-[10px] sm:text-[11px] text-[#999] mt-1">
            {formData.tagline?.length || 0}/120 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
            About Company
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your company, mission, and what makes you unique..."
            rows={5}
            maxLength={2000}
            className="w-full px-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all resize-none"
          />
          <p className="text-[10px] sm:text-[11px] text-[#999] mt-1">
            {formData.description?.length || 0}/2000 characters
          </p>
        </div>

        {/* Profile URL / Slug */}
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
            Profile URL
          </label>
          <div className="flex flex-col sm:flex-row">
            <span className="px-3 py-2.5 text-[11px] sm:text-[12px] text-[#888] bg-[#F5F5F5] border border-[#EDEDED] rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none sm:border-r-0 truncate">
              {baseUrl}/company/
            </span>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleSlugChange}
              placeholder="your-company-name"
              className="flex-1 px-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
            />
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#999] mt-1">
            Only lowercase letters, numbers, and hyphens allowed
          </p>
        </div>

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

// frontend/src/components/company/dashboard/employer/BusinessDetailsForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Briefcase, Loader2, Check, ChevronDown } from "lucide-react";
import { useUpdateBusinessDetails } from "@/src/lib/company/employer.queries";
import {
  INDUSTRY_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  COMPANY_TYPE_OPTIONS,
} from "@/src/types/employer.types";
import type { CompanyProfile, UpdateBusinessPayload } from "@/src/types/employer.types";

interface BusinessDetailsFormProps {
  profile: CompanyProfile;
}

export default function BusinessDetailsForm({ profile }: BusinessDetailsFormProps) {
  const [formData, setFormData] = useState<UpdateBusinessPayload>({
    industry: "",
    company_size: "",
    company_type: "",
    founded_year: undefined,
    registration_number: "",
    tax_id: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateBusinessDetails();

  useEffect(() => {
    setFormData({
      industry: profile.industry || "",
      company_size: profile.company_size || "",
      company_type: profile.company_type || "",
      founded_year: profile.founded_year || undefined,
      registration_number: profile.registration_number || "",
      tax_id: profile.tax_id || "",
    });
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "founded_year" ? (value ? parseInt(value) : undefined) : value,
    }));
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

  // Generate year options (1900 to current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: currentYear - 1899 },
    (_, i) => currentYear - i
  );

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EDEDED]">
        <div className="flex items-center gap-2">
          <Briefcase size={18} color="#005DDC" />
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
            Business Details
          </h3>
        </div>
        <p className="text-[12px] text-[#888] mt-1">
          Information about your business
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Industry */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-1.5">
            Industry
          </label>
          <div className="relative">
            <select
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors appearance-none bg-white"
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              color="#999"
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        {/* Company Size & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              Company Size
            </label>
            <div className="relative">
              <select
                name="company_size"
                value={formData.company_size}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors appearance-none bg-white"
              >
                <option value="">Select size</option>
                {COMPANY_SIZE_OPTIONS.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                color="#999"
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              Company Type
            </label>
            <div className="relative">
              <select
                name="company_type"
                value={formData.company_type}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors appearance-none bg-white"
              >
                <option value="">Select type</option>
                {COMPANY_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                color="#999"
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Founded Year */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-1.5">
            Founded Year
          </label>
          <div className="relative">
            <select
              name="founded_year"
              value={formData.founded_year || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors appearance-none bg-white"
            >
              <option value="">Select year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              color="#999"
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        {/* Registration & Tax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              Registration Number
            </label>
            <input
              type="text"
              name="registration_number"
              value={formData.registration_number}
              onChange={handleChange}
              placeholder="Company registration number"
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
            <p className="text-[11px] text-[#999] mt-1">Optional - for verification</p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              Tax ID / EIN
            </label>
            <input
              type="text"
              name="tax_id"
              value={formData.tax_id}
              onChange={handleChange}
              placeholder="Tax identification number"
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
            <p className="text-[11px] text-[#999] mt-1">Optional - for verification</p>
          </div>
        </div>

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
            disabled={!hasChanges || updateMutation.isPending}
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

// frontend/src/components/company/dashboard/employer/ContactForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Loader2, Check } from "lucide-react";
import { useUpdateContact } from "@/src/lib/company/employer.queries";
import type { CompanyProfile, UpdateContactPayload } from "@/src/types/employer.types";

interface ContactFormProps {
  profile: CompanyProfile;
}

export default function ContactForm({ profile }: ContactFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    location: "",
    address: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateContact();

  useEffect(() => {
    setFormData({
      email: (profile as any).contact_email || "",
      phone: profile.contact_number || "",
      location: profile.headquarters || "",
      address: profile.full_address || "",
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateContactPayload = {
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      location: formData.location || undefined,
      address: formData.address || undefined,
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
          <Mail size={18} color="#005DDC" />
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1a1a1a]">
            Contact Information
          </h3>
        </div>
        <p className="text-[11px] sm:text-[12px] text-[#888] mt-1">
          How candidates can reach you
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {/* Email & Phone row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
              Contact Email
            </label>
            <div className="relative">
              <Mail
                size={15}
                color="#999"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@company.com"
                className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone
                size={15}
                color="#999"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Location (display) */}
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
            Location (Display)
          </label>
          <div className="relative">
            <MapPin
              size={15}
              color="#999"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., San Francisco, CA"
              className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
            />
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#999] mt-1">
            This is shown on your public profile
          </p>
        </div>

        {/* Address */}
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-[#555] mb-1.5">
            Full Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main Street, Suite 100, San Francisco, CA 94105"
            className="w-full px-3 py-2.5 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]/20 transition-all"
          />
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

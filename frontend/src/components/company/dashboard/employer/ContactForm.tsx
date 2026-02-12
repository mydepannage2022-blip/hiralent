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
  const [formData, setFormData] = useState<UpdateContactPayload>({
    contact_email: "",
    contact_phone: "",
    location: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateContact();

  useEffect(() => {
    setFormData({
      contact_email: profile.contact_email || "",
      contact_phone: profile.contact_phone || "",
      location: profile.location || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      country: profile.country || "",
      postal_code: profile.postal_code || "",
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

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EDEDED]">
        <div className="flex items-center gap-2">
          <Mail size={18} color="#005DDC" />
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
            Contact Information
          </h3>
        </div>
        <p className="text-[12px] text-[#888] mt-1">
          How candidates can reach you
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Email & Phone row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
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
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                placeholder="contact@company.com"
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
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
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Location (display) */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-1.5">
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
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
          </div>
          <p className="text-[11px] text-[#999] mt-1">
            This is shown on your public profile
          </p>
        </div>

        {/* Address */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-1.5">
            Street Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main Street, Suite 100"
            className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
          />
        </div>

        {/* City & State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="San Francisco"
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              State / Province
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="California"
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
          </div>
        </div>

        {/* Country & Postal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="United States"
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#555] mb-1.5">
              Postal Code
            </label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              placeholder="94105"
              className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
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

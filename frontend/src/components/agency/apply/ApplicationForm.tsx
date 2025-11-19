"use client";

import React, { useState, FormEvent } from "react";
import { motion } from "framer-motion";

type AgencyType = "VISA" | "RELOCATION" | "INTEGRATION";

const agencyTypeOptions: { value: AgencyType; label: string }[] = [
  { value: "VISA", label: "Visa Agency" },
  { value: "RELOCATION", label: "Relocation Agency" },
  { value: "INTEGRATION", label: "Integration Agency" },
];

const serviceCategoryOptions = [
  "Visa Processing",
  "Relocation & Housing",
  "Integration & Settling-in",
  "Legal & Documentation",
  "Family Relocation",
  "Corporate Relocation",
];

const ApplicationForm: React.FC = () => {
  // Basic Info
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyType, setAgencyType] = useState<AgencyType | "">("");

  // Business Details
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [operatingCountriesInput, setOperatingCountriesInput] = useState("");
  const [operatingCountries, setOperatingCountries] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);

  // Documents
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addCountryTag = () => {
    const value = operatingCountriesInput.trim();
    if (!value) return;
    if (!operatingCountries.includes(value)) {
      setOperatingCountries((prev) => [...prev, value]);
    }
    setOperatingCountriesInput("");
  };

  const handleCountriesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCountryTag();
    }
  };

  const toggleServiceCategory = (category: string) => {
    setServiceCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!agencyName.trim()) newErrors.agencyName = "Agency name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    if (!phone.trim()) newErrors.phone = "Phone number is required.";
    if (!agencyType) newErrors.agencyType = "Please select an agency type.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // TODO: Hook this up to your backend endpoint (e.g. POST /api/agency/apply)
      // const formData = new FormData();
      // formData.append("name", agencyName);
      // formData.append("email", email);
      // formData.append("phone", phone);
      // formData.append("type", agencyType);
      // formData.append("description", description);
      // formData.append("website", website);
      // formData.append("operatingCountries", JSON.stringify(operatingCountries));
      // formData.append("serviceCategories", JSON.stringify(serviceCategories));
      // if (businessLicense) {
      //   formData.append("businessLicense", businessLicense);
      // }
      //
      // await fetch("/api/agency/apply", {
      //   method: "POST",
      //   body: formData,
      // });

      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit agency application", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex justify-center items-center bg-gradient-to-br from-[#EFF5FF] to-white pt-28 pb-16 min-h-screen">
      <motion.div
        className="lg:max-w-3xl xl:max-w-4xl w-11/12 bg-white rounded-2xl shadow-xl px-6 py-8 lg:px-10 lg:py-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-[#222] text-2xl lg:text-3xl font-bold mb-2">
            Agency Partnership Application
          </h1>
          <p className="text-[#757575] text-sm lg:text-base max-w-xl mx-auto">
            Fill out the form below to apply as a partner agency. We’ll review
            your application and get back to you within{" "}
            <span className="font-semibold">48 hours</span>.
          </p>
        </div>

        {/* Success message */}
        {submitted && (
          <motion.div
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-medium">Thank you for applying! 🎉</p>
            <p>
              We’ve received your application. Our team will review your details
              and contact you shortly.
            </p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Basic Info */}
          <div className="space-y-4">

            {/* Agency Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#222]">
                Agency Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC]"
                placeholder="Ex: Global Move Partners"
              />
              {errors.agencyName && (
                <p className="text-xs text-red-500 mt-1">{errors.agencyName}</p>
              )}
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#222]">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC]"
                  placeholder="contact@agency.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#222]">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC]"
                  placeholder="+212 6 12 34 56 78"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Agency Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#222]">
                Agency Type <span className="text-red-500">*</span>
              </label>
              <select
                value={agencyType}
                onChange={(e) => setAgencyType(e.target.value as AgencyType | "")}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC]"
              >
                <option value="">Select type</option>
                {agencyTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.agencyType && (
                <p className="text-xs text-red-500 mt-1">{errors.agencyType}</p>
              )}
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#222]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC] resize-none"
                placeholder="Tell us about your agency, services, and experience."
              />
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#222]">
                Website (optional)
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC]"
                placeholder="https://www.your-agency.com"
              />
            </div>

            {/* Operating Countries */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#222]">
                Operating Countries
              </label>
              <p className="text-xs text-[#6B7280] mb-1">
                Type a country and press <span className="font-semibold">Enter</span> or
                <span className="font-semibold"> , </span> to add it.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {operatingCountries.map((country) => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-1 rounded-full bg-[#EFF5FF] text-[#005DDC] text-xs px-3 py-1"
                  >
                    {country}
                    <button
                      type="button"
                      className="text-[#2563EB] hover:text-[#1D4ED8]"
                      onClick={() =>
                        setOperatingCountries((prev) =>
                          prev.filter((c) => c !== country)
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={operatingCountriesInput}
                onChange={(e) => setOperatingCountriesInput(e.target.value)}
                onKeyDown={handleCountriesKeyDown}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-[#005DDC]"
                placeholder="Ex: France, Germany, Canada..."
              />
            </div>

            {/* Service Categories */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#222]">
                Service Categories
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviceCategoryOptions.map((category) => {
                  const checked = serviceCategories.includes(category);
                  return (
                    <label
                      key={category}
                      className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm cursor-pointer hover:border-[#005DDC] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServiceCategory(category)}
                        className="h-4 w-4 rounded border-[#CBD5E1] text-[#005DDC] focus:ring-[#005DDC]"
                      />
                      <span className="text-[#374151]">{category}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-3">

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#222]">
                Business License Upload (optional)
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-[#CBD5F5] bg-[#F9FAFF] px-3 py-2.5 text-sm text-[#4B5563] cursor-pointer hover:border-[#005DDC] transition-colors">
                <span>
                  {businessLicense
                    ? businessLicense.name
                    : "Upload PDF or image of your business license"}
                </span>
                <span className="inline-flex items-center rounded-md bg-[#005DDC] px-3 py-1.5 text-xs font-semibold text-white">
                  Choose file
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setBusinessLicense(file);
                  }}
                />
              </label>
              <p className="text-xs text-[#9CA3AF]">
                Optional, but uploading it can speed up the approval process.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#005DDC] text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.97 } : {}}
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </motion.button>
            <p className="mt-3 text-[11px] text-center text-[#9CA3AF]">
              By submitting, you agree to be contacted by the Hiralent team
              regarding this partnership application.
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ApplicationForm;

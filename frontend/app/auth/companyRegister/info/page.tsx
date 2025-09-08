// app/auth/companyRegister/info/page.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Select, { SingleValue } from "react-select";
import { getAuthPageConfig } from "../../../../config/authPagesConfig";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";
import { locationOptions } from "@/src/constants/groupedLocationOptions";
// Types
import { industryOptions } from "@/src/constants/groupedIndustriesOptions";
interface FormData {
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  location: string;
  description: string;
}

interface FormErrors {
  companyName?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  location?: string;
  description?: string;
}

interface FormTouched {
  companyName?: boolean;
  industry?: boolean;
  companySize?: boolean;
  website?: boolean;
  location?: boolean;
  description?: boolean;
}

interface OptionType {
  value: string;
  label: string;
}

const CompanyInfoPage = () => {
  const pageConfig = getAuthPageConfig('companyInfo');
  
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
    location: "",
    description: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);



  const companySizeOptions: OptionType[] = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "501-1000", label: "501-1000 employees" },
    { value: "1000+", label: "1000+ employees" },
  ];



  const customSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      padding: "0px 8px",
      borderRadius: "8px",
      borderColor: state.isFocused ? "#063B82" : "#d1d5db",
      outline: "none",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(6, 59, 130, 0.2)" : "none",
      border: "1px solid",
      fontSize: "12px",
      "&:hover": {
        borderColor: "#063B82",
      },
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
      color: "#111",
      padding: "8px",
      fontWeight: state.isSelected ? "bold" : "normal",
      fontSize: "12px",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#757575",
      fontSize: "12px",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#757575",
      fontSize: "12px",
    }),
  };

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case "companyName":
        if (!value.trim()) return "Company name is required";
        if (value.trim().length < 2) return "Company name must be at least 2 characters";
        return undefined;

      case "industry":
        if (!value.trim()) return "Industry is required";
        return undefined;

      case "companySize":
        if (!value.trim()) return "Company size is required";
        return undefined;

      case "website":
        if (value.trim() && !value.includes('.')) return "Please enter a valid website URL";
        return undefined;

      case "location":
        if (!value.trim()) return "Location is required";
        return undefined;

      case "description":
        if (!value.trim()) return "Company description is required";
        if (value.trim().length < 10) return "Description must be at least 10 characters";
        return undefined;

      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Real-time validation
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    }
  };

  const handleSelectChange = (fieldName: keyof FormData) => (selectedOption: SingleValue<OptionType>) => {
    const value = selectedOption?.value || "";
    
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Real-time validation
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    const fieldName = name as keyof FormData;

    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    const error = validateField(fieldName, formData[fieldName]);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleSelectBlur = (fieldName: keyof FormData) => () => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    const error = validateField(fieldName, formData[fieldName]);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mark all fields as touched
    const allTouched: FormTouched = {
      companyName: true,
      industry: true,
      companySize: true,
      website: true,
      location: true,
      description: true,
    };
    setTouched(allTouched);

    // Validate all fields
    const newErrors: FormErrors = {};
    Object.keys(formData).forEach((key) => {
      const fieldName = key as keyof FormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) newErrors[fieldName] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        // TODO: Implement company info registration API call
        console.log("Company info data:", formData);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Redirect to success page or company dashboard
        alert("Company registration successful!");
        window.location.href = '/company/dashboard';
      } catch (error) {
        console.error("Company registration failed:", error);
        alert("Registration failed. Please try again.");
      }
    }

    setIsSubmitting(false);
  };

  const getInputClassName = (fieldName: keyof FormData) => {
    const baseClass = "w-full px-4 py-2 border rounded-lg focus:outline-none text-xs text-[#757575]";
    const hasError = touched[fieldName] && errors[fieldName];

    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent`;
    }

    return `${baseClass} border-gray-300 focus:ring-2 focus:ring-[#063B82] focus:border-transparent`;
  };

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      currentStep={2}
      showTabs={true}
      activeTab="company"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company Name Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Company Name<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="text"
            name="companyName"
            id="companyName"
            placeholder="Enter your company name"
            className={getInputClassName("companyName")}
            value={formData.companyName}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
          {touched.companyName && errors.companyName && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.companyName}
            </motion.p>
          )}
        </motion.div>

        {/* Industry Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Industry<span className="text-red-500">*</span>
          </label>
          <Select
            options={industryOptions}
            value={industryOptions.find(option => option.value === formData.industry) || null}
            onChange={handleSelectChange("industry")}
            onBlur={handleSelectBlur("industry")}
            placeholder="Select industry"
            styles={customSelectStyles}
            isSearchable
          />
          {touched.industry && errors.industry && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.industry}
            </motion.p>
          )}
        </motion.div>

        {/* Company Size Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Company Size<span className="text-red-500">*</span>
          </label>
          <Select
            options={companySizeOptions}
            value={companySizeOptions.find(option => option.value === formData.companySize) || null}
            onChange={handleSelectChange("companySize")}
            onBlur={handleSelectBlur("companySize")}
            placeholder="Select company size"
            styles={customSelectStyles}
          />
          {touched.companySize && errors.companySize && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.companySize}
            </motion.p>
          )}
        </motion.div>

        {/* Website Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Website
          </label>
          <motion.input
            type="url"
            name="website"
            id="website"
            placeholder="https://yourcompany.com"
            className={getInputClassName("website")}
            value={formData.website}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
          {touched.website && errors.website && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.website}
            </motion.p>
          )}
        </motion.div>

        {/* Location Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Location<span className="text-red-500">*</span>
          </label>
          <Select
            options={locationOptions}
            value={locationOptions.find(option => option.value === formData.location) || null}
            onChange={handleSelectChange("location")}
            onBlur={handleSelectBlur("location")}
            placeholder="Select location"
            styles={customSelectStyles}
            isSearchable
          />
          {touched.location && errors.location && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.location}
            </motion.p>
          )}
        </motion.div>

        {/* Description Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Company Description<span className="text-red-500">*</span>
          </label>
          <motion.textarea
            name="description"
            id="description"
            placeholder="Tell us about your company..."
            className={`${getInputClassName("description")} resize-none`}
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
          {touched.description && errors.description && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.description}
            </motion.p>
          )}
        </motion.div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          transition={{ duration: 0.3 }}
          disabled={isSubmitting}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isSubmitting ? "Registering Company..." : "Register Company"}
        </motion.button>

        {/* Back to Step 1 Link */}
        <motion.div
          className="text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          Need to change your details?{" "}
          <SmartLink href="/auth/companyRegister" className="text-[#1B73E8] hover:underline font-medium">
            Go back to previous step
          </SmartLink>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default CompanyInfoPage;
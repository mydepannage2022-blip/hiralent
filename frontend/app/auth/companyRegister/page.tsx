// app/auth/companyRegister/page.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { getAuthPageConfig } from "../../../config/authPagesConfig";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";
import { useSignup } from "../../../src/lib/auth/auth.queries";


// Types
interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface FormTouched {
  fullName?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

const CompanyRegisterPage = () => {
  const pageConfig = getAuthPageConfig('companyRegister');
  const signupMutation = useSignup();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case "fullName":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Full name must be at least 2 characters";
        return undefined;

      case "email":
        if (!value.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Please enter a valid email address";
        return undefined;

      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        return undefined;

      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return undefined;

      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Special case: validate confirmPassword when password changes
    if (fieldName === "password" && touched.confirmPassword) {
      const confirmPasswordError = validateField("confirmPassword", formData.confirmPassword);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmPasswordError,
      }));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   setIsSubmitting(true);

  //   // Mark all fields as touched
  //   const allTouched: FormTouched = {
  //     fullName: true,
  //     email: true,
  //     password: true,
  //     confirmPassword: true,
  //   };
    
  //   setTouched(allTouched);

  //   // Validate all fields
  //   const newErrors: FormErrors = {};
  //   Object.keys(formData).forEach((key) => {
  //     const fieldName = key as keyof FormData;
  //     const error = validateField(fieldName, formData[fieldName]);
  //     if (error) newErrors[fieldName] = error;
  //   });

  //   setErrors(newErrors);

  //   if (Object.keys(newErrors).length === 0) {
  //     try {
  //       // TODO: Implement company admin registration API call
  //       console.log("Company admin registration data:", {
  //         fullName: formData.fullName,
  //         email: formData.email.toLowerCase().trim(),
  //         password: formData.password,
  //         role: 'company'
  //       });

  //       // Simulate API call
  //       await new Promise(resolve => setTimeout(resolve, 1000));
        
  //       // Redirect to company info step
  //       window.location.href = '/auth/companyRegister/info';
  //     } catch (error) {
  //       console.error("Registration failed:", error);
  //       alert("Registration failed. Please try again.");
  //     }
  //   }

  //   setIsSubmitting(false);
  // };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  // Mark all fields as touched
  const allTouched: FormTouched = {
    fullName: true,
    email: true,
    password: true,
    confirmPassword: true,
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
    // ✅ Use existing signup mutation
    signupMutation.mutate({
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
      full_name: formData.fullName,
      role: 'company_admin'
    });
  }
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
      currentStep={1}
      showTabs={true}
      activeTab="company"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Full Name<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="text"
            name="fullName"
            id="fullName"
            placeholder="Enter your full Name"
            className={getInputClassName("fullName")}
            value={formData.fullName}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
          {touched.fullName && errors.fullName && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.fullName}
            </motion.p>
          )}
        </motion.div>

        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Email<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="email"
            name="email"
            id="email"
            placeholder="Enter your Email Address"
            className={getInputClassName("email")}
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
          {touched.email && errors.email && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.email}
            </motion.p>
          )}
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <motion.input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              placeholder="Enter your Password"
              className={getInputClassName("password")}
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {touched.password && errors.password && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.password}
            </motion.p>
          )}
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mb-1"
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Confirm Password<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <motion.input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirmed your Password"
              className={getInputClassName("confirmPassword")}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {touched.confirmPassword && errors.confirmPassword && (
            <motion.p
              className="text-red-500 text-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errors.confirmPassword}
            </motion.p>
          )}
        </motion.div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          transition={{ duration: 0.3 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          disabled={signupMutation.isPending}
        >
{signupMutation.isPending ? "Processing..." : "Proceed"}
        </motion.button>

        {/* Login Link */}
        <motion.div
          className="text-center text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          OR
        </motion.div>

        <motion.div
          className="text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          Do you already have an account?{" "}
          <SmartLink href="/auth/login" className="text-[#1B73E8] hover:underline font-medium">
            Login
          </SmartLink>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default CompanyRegisterPage;
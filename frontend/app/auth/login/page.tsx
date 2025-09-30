// pages/auth/login.tsx
"use client";

import React, { useState } from "react";
import dynamic from 'next/dynamic';
import { motion } from "framer-motion";
import { useLogin } from "../../../src/lib/auth/auth.queries";
import { getAuthPageConfig } from "../../../config/authPagesConfig";
import SmartLink from "@/src/components/layout/SmartLink";
import AuthLayout from "@/src/components/layout/AuthLayout";
// Types
interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface FormTouched {
  email?: boolean;
  password?: boolean;
}

interface ValidationRules {
  email: {
    pattern: RegExp;
  };
  password: {
    minLength: number;
  };
}

const validationRules: ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 6,
  },
};

const LoginPage = () => {
  const loginMutation = useLogin();
  const pageConfig = getAuthPageConfig('login');
  
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [passwordVisibility, setPasswordVisibility] = useState(false);

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case "email":
        if (!value.trim()) {
          return "Email is required";
        }
        if (!validationRules.email.pattern.test(value)) {
          return "Please enter a valid email address";
        }
        return undefined;

      case "password":
        if (!value) {
          return "Password is required";
        }
        if (value.length < validationRules.password.minLength) {
          return `Password must be at least ${validationRules.password.minLength} characters`;
        }
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
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;

    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    const error = validateField(fieldName, value);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const togglePasswordVisibility = () => {
    setPasswordVisibility((prev) => !prev);
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Mark all fields as touched
  const allTouched: FormTouched = {
    email: true,
    password: true,
  };
  setTouched(allTouched);

  // Validate all fields
  const newErrors: FormErrors = {};
  Object.keys(formData).forEach((key) => {
    const fieldName = key as keyof FormData;
    const error = validateField(fieldName, formData[fieldName]);
    if (error) {
      newErrors[fieldName] = error;
    }
  });

  setErrors(newErrors);

  // Submit if form is valid
  if (Object.keys(newErrors).length === 0) {
    // ✅ Email ko lowercase normalize kar ke API call
    loginMutation.mutate({
      email: formData.email.toLowerCase().trim(), // 👈 CHANGE: normalize email
      password: formData.password,
    });
  }
};
  const getInputClassName = (fieldName: keyof FormData) => {
    const baseClass =
      "w-full px-4 py-3 border rounded-lg focus:outline-none text-xs text-[#757575]";
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
      showTabs={false}
      activeTab="candidate"
    > 
    <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className={"mb-1"}
        >
          <label className="block text-[#222] font-medium text-xs  mb-1">
            Email<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Enter your Email Address"
            className={getInputClassName("email")}
            required
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
          {touched.email && errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className={"mb-1"}
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <motion.input
              type={passwordVisibility ? "text" : "password"}
              name="password"
              id="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="Enter your Password"
              className={`${getInputClassName("password")} pr-10`}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
            <motion.button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              {passwordVisibility ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </motion.button>
          </div>
          {touched.password && errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </motion.div>

        {/* Forgot Password Link */}
        <div className="text-right mb-1">
          <SmartLink href="/auth/forgot-password" className="text-[#1B73E8] hover:underline text-xs">
            Forgot your password?
          </SmartLink>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          whileHover={{ scale: loginMutation.isPending ? 1 : 1.05 }}
          whileTap={{ scale: loginMutation.isPending ? 1 : 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </motion.button>

        <div className="text-center text-gray-500 text-sm">OR</div>

        {/* Google Login Button */}
        <motion.button
          type="button"
          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 text-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </motion.button>

        {/* Sign Up Link */}
        <motion.div
          className="text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Don't have an account?{" "}
          <motion.span whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }}>
            <SmartLink href="/auth/signup" className="text-[#1B73E8] hover:underline">
              Sign up
            </SmartLink>
          </motion.span>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
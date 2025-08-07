"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion"; // Import Framer Motion
import { useSignup } from "../../src/lib/auth.queries";
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'next/router';
// Types (unchanged)
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

interface PasswordVisibility {
  password: boolean;
  confirmPassword: boolean;
}

interface ValidationRules {
  fullName: {
    minLength: number;
    pattern: RegExp;
  };
  email: {
    pattern: RegExp;
  };
  password: {
    minLength: number;
    patterns: {
      lowercase: RegExp;
      uppercase: RegExp;
      number: RegExp;
      special: RegExp;
    };
  };
}

const testimonials = [
  {
    id: 1,
    name: "Sarah",
    role: "Marketing Manager",
    text: "This platform has completely transformed how we manage our projects. Simple, elegant, and exactly what we needed.",
    image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
  },
  {
    id: 2,
    name: "Ahmed Ali",
    role: "Software Developer",
    text: "Clean interface, powerful features. The user experience is outstanding and support team is incredibly responsive.",
    image: "https://img.a.transfermarkt.technology/portrait/big/995642-1712863495.jpg?lm=1",
  },
  {
    id: 3,
    name: "Emma Wilson",
    role: "Business Owner",
    text: "Six months in and still impressed. Great value, reliable service, and intuitive design that just works.",
    image:
      "https://resize-elle.ladmedia.fr/r/400,279,ffffff,forcex,center-middle/img/var/plain_site/storage/images/people/la-vie-des-people/news/emma-watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-emma-roberts-3979994/95896063-1-fre-FR/Emma-Watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-Emma-Roberts.jpg",
  },
];

const validationRules: ValidationRules = {
  fullName: {
    minLength: 2,
    pattern: /^[a-zA-Z\s]+$/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 8,
    patterns: {
      lowercase: /[a-z]/,
      uppercase: /[A-Z]/,
      number: /\d/,
      special: /[!@#$%^&*(),.?":{}|<>]/,
    },
  },
};

// Testimonial Slider Component with Framer Motion
const TestimonialSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-6 lg:left-6 lg:right-6 xl:left-24 xl:right-24 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="w-full flex-shrink-0"
          >
            <div className="mb-4">
              <p className="text-gray-700 text-sm leading-relaxed font-medium">
                "{testimonials[currentSlide].text}"
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-full overflow-hidden"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={testimonials[currentSlide].image}
                    alt={testimonials[currentSlide].name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {testimonials[currentSlide].name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {testimonials[currentSlide].role}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {testimonials.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      index === currentSlide ? "bg-[#063B82]" : "bg-gray-300"
                    }`}
                    whileHover={{ scale: 1.3 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const Page = () => {
  const signupMutation = useSignup();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibility>({
    password: false,
    confirmPassword: false,
  });

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case "fullName":
        if (!value.trim()) {
          return "Full name is required";
        }
        if (value.length < validationRules.fullName.minLength) {
          return `Full name must be at least ${validationRules.fullName.minLength} characters`;
        }
        if (!validationRules.fullName.pattern.test(value)) {
          return "Full name can only contain letters and spaces";
        }
        return undefined;

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
        if (!validationRules.password.patterns.lowercase.test(value)) {
          return "Password must contain at least one lowercase letter";
        }
        if (!validationRules.password.patterns.uppercase.test(value)) {
          return "Password must contain at least one uppercase letter";
        }
        if (!validationRules.password.patterns.number.test(value)) {
          return "Password must contain at least one number";
        }
        if (!validationRules.password.patterns.special.test(value)) {
          return "Password must contain at least one special character";
        }
        return undefined;

      case "confirmPassword":
        if (!value) {
          return "Please confirm your password";
        }
        if (value !== formData.password) {
          return "Passwords do not match";
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

      // Also validate confirm password if password changes
      if (fieldName === "password" && touched.confirmPassword) {
        const confirmError = validateField("confirmPassword", formData.confirmPassword);
        setErrors((prev) => ({
          ...prev,
          confirmPassword: confirmError,
        }));
      }
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

  const togglePasswordVisibility = (field: keyof PasswordVisibility) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };


 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const allTouched: FormTouched = {
    fullName: true,
    email: true,
    password: true,
    confirmPassword: true,
  };
  setTouched(allTouched);

  const newErrors: FormErrors = {};
  Object.keys(formData).forEach((key) => {
    const fieldName = key as keyof FormData;
    const error = validateField(fieldName, formData[fieldName]);
    if (error) newErrors[fieldName] = error;
  });

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    const { fullName, email, password } = formData;

    signupMutation.mutate({
      email,
      password,
      full_name: fullName,
      role: 'candidate',
    });
  }
};



  const getInputClassName = (fieldName: keyof FormData) => {
    const baseClass =
      "w-full px-4 py-3 border rounded-lg focus:outline-none text-sm text-[#757575]";
    const hasError = touched[fieldName] && errors[fieldName];

    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent`;
    }

    return `${baseClass} border-gray-300 focus:ring-2 focus:ring-[#063B82] focus:border-transparent`;
  };

  return (
    <div className="w-full flex justify-center h-screen items-center bg-[#FFFFFF]">
      <div className="w-full flex flex-col lg:flex-row justify-between items-start lg:gap-0 xl:gap-16">
        <motion.div
          className="w-full lg:w-1/2 flex flex-col justify-start items-center lg:items-center lg:gap-0 xl:gap-4 p-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="flex justify-center items-center gap-3 p-8 lg:p-4 xl:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div className="p-none" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link href="/auth/signup/location" className="py-[-10px] px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg">
                {/* Placeholder */}
              </Link>
            </motion.div>
            <motion.div className="p-none" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link href="/auth/signup/location" className="py-[-10px] px-6 md:px-10 lg:px-12 bg-[#CFE3FF] rounded-lg">
                {/* Placeholder */}
              </Link>
            </motion.div>
            <motion.div className="p-none" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link href="/auth/signup/location" className="py-[-10px] px-6 md:px-10 lg:px-12 bg-[#CFE3FF] rounded-lg">
                {/* Placeholder */}
              </Link>
            </motion.div>
            <motion.div className="p-none" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link href="/auth/signup/profile-picture" className="py-[-10px] px-6 md:px-10 lg:px-12 bg-[#CFE3FF] rounded-lg">
                {/* Placeholder */}
              </Link>
            </motion.div>
            <motion.div className="p-none" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link href="/auth/signup/location" className="py-[-10px] px-6 md:px-10 lg:px-12 bg-[#CFE3FF] rounded-lg">
                {/* Placeholder */}
              </Link>
            </motion.div>
          </motion.div>
          <motion.div
            className="flex justify-center items-center gap-3 p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <img src="/images/logo.jpg" alt="logo" className="w-[200px]" />
          </motion.div>

          <motion.div
            className="flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                className="border-r-1 border-t-1 border-b-1 rounded-t-none rounded-l-lg border-[#005DDC] bg-[#005DDC] py-2 px-2 lg:px-8 text-sm text-white"
                href={"/auth/signup/info"}
              >
                As a Candidate
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                className="border-r-1 border-t-1 border-b-1 rounded-t-none rounded-r-lg border-[#005DDC] bg-white py-2 px-2 lg:px-8 text-sm text-[#222]"
                href={"/auth/companyRegister"}
              >
                As a Company
              </Link>
            </motion.div>
          </motion.div>
          <motion.div
            className="flex flex-col justify-center items-center gap-1 py-2 text-[#222]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold">Give us your information</h2>
            <p className="text-center text-xs lg:text-sm w-full lg:w-2/3">
              Please enter your personal details to set up your account and personalize your experience
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Full Name<span className="text-red-500">*</span>
              </label>
              <motion.input
                type="text"
                name="fullName"
                id="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="Enter your Full Name"
                className={getInputClassName("fullName")}
                required
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              />
              {touched.fullName && errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <motion.input
                  type={passwordVisibility.password ? "text" : "password"}
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
                  onClick={() => togglePasswordVisibility("password")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {passwordVisibility.password ? (
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Confirm Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <motion.input
                  type={passwordVisibility.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="Confirm your Password"
                  className={`${getInputClassName("confirmPassword")} pr-10`}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {passwordVisibility.confirmPassword ? (
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
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </motion.div>

            <motion.button
              type="submit"
              className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
               {signupMutation.isPending ? 'Signing up...' : 'Sign Up'}
            </motion.button>

            <div className="text-center text-gray-500 text-sm">OR</div>

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
              Sign up with Google
            </motion.button>

            <motion.div
              className="text-center text-sm text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              Do you already have an account?{" "}
              <motion.a
                href="/"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={"/auth/login"} 
                className="text-[#1B73E8] hover:underline"
                
                > 
                Login
                </Link>
              </motion.a>
            </motion.div>
          </form>
        </motion.div>

        <motion.div
          className="hidden lg:block w-full lg:w-1/2 relative h-[95vh] mr-4 rounded-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.img
            src="/images/signup.jpg"
            alt=""
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          <TestimonialSlider />
        </motion.div>
      </div>
    </div>
  );
};

export default Page;
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Select, { SingleValue } from "react-select"; // Added react-select
import { industryOptions } from "../../../../src/constants/groupedIndustriesOptions"; // Assuming industryOptions is in a separate file
import { locationOptions } from "../../../../src/constants/groupedLocationOptions";

const testimonials = [
  {
    id: 1,
    name: "NovaEdge Marketing",
    role: "Marketing Agency",
    text: "This platform has completely transformed how we handle client campaigns. Simple, elegant, and exactly what we needed to scale efficiently.",
    image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
  },
  {
    id: 2,
    name: "CodeCraft Labs",
    role: "Software Development Firm",
    text: "Clean interface and powerful tools. Our hiring process is now faster and more accurate. The support team is incredibly responsive too.",
    image: "https://static.wixstatic.com/media/49fa21_344efda1a72e4badbec5a00ee6a7f0de%7Emv2.jpg/v1/fill/w_192%2Ch_192%2Clg_1%2Cusm_0.66_1.00_0.01/49fa21_344efda1a72e4badbec5a00ee6a7f0de%7Emv2.jpg",
  },
  {
    id: 3,
    name: "Wilson & Co.",
    role: "Small Business Enterprise",
    text: "Six months in and still impressed. Great value, reliable service, and an intuitive design that helps us find the right talent quickly.",
    image: "https://www.wilsonco.com/wp-content/uploads/2024/01/cropped-wilson-and-co-favicon-32x32.png",
  },
];

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
   const [selectedLocation, setSelectedLocation] = useState<SingleValue<{ value: string; label: string }>>(null);
 const [selectedIndustry, setSelectedIndustry] = useState<SingleValue<{ value: string; label: string }>>(null);
   const customStyles = {
    control: (base: any) => ({
      ...base,
      padding: "4px",
      borderRadius: "8px",
      borderColor: "transparent",
      outline: "none",
      boxShadow: "none",
      border: "none",
      fontSize: "16px",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
      color: "#111",
      padding: "10px",
      fontWeight: state.isSelected ? "bold" : "normal",
    }),
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
            className="flex justify-center items-center gap-3 p-8 lg:p-4 xl:p-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                href="/auth/companyRegister"
                className="px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg"
              ></Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                href="/auth/companyRegister/info"
                className="px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg"
              ></Link>
            </motion.div>
          </motion.div>
          <motion.div
            className="flex justify-center items-center gap-3 p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <img src="/images/logo.png" alt="logo" className="w-[200px]" />
          </motion.div>

          <motion.div
            className="flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                className="border-l-1 border-t-1 border-b-1 rounded-t-none rounded-l-lg border-[#005DDC] bg-white py-2 px-2 lg:px-8 text-sm text-[#222]"
                href={"/auth/signup"}
              >
                As a Candidate
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                className="border-r-1 border-t-1 border-b-1 rounded-t-none rounded-r-lg border-[#005DDC] bg-[#005DDC] py-2 px-2 lg:px-8 text-sm"
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
            <h2 className="text-2xl xl:text-3xl font-bold">Give us Company information</h2>
            <p className="text-center text-xs lg:text-sm w-full lg:w-2/3">
              Please provide your company details to complete your profile and access all features
            </p>
          </motion.div>

          <form className="w-full max-w-md space-y-3 justify-center items-center">
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="relative left-45"
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Company Logo<span className="text-red-500">*</span>
              </label>
              <div className="relative w-24 h-24">
                <motion.label
                  htmlFor="companyLogo"
                  className="w-24 h-24 border border-gray-300 rounded-full flex justify-center items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#063B82] focus:border-transparent bg-white hover:bg-gray-50 transition-colors"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg
                    className="w-10 h-10 text-[#757575]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </motion.label>
                <input
                  type="file"
                  name="companyLogo"
                  id="companyLogo"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Company Name<span className="text-red-500">*</span>
              </label>
              <motion.input
                type="text"
                name="companyName"
                id="companyName"
                placeholder="Enter your Company Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#063B82] focus:border-transparent text-sm text-[#757575]"
                required
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Company Field<span className="text-red-500">*</span>
              </label>
              <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <Select
                  options={industryOptions}
                  name="companyField"
                  id="companyField"
                  placeholder="Search or Select Industry"
                  isSearchable
                  className="text-sm text-[#757575]"
                  classNamePrefix="select"
                  required
                  value={selectedIndustry}
                  onChange={setSelectedIndustry}
                />
              </motion.div>
            </motion.div>

     <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Location<span className="text-red-500">*</span>
              </label>
              <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <Select
                  options={locationOptions}
                  name="location"
                  id="location"
                  placeholder="Search or Select Location"
                  isSearchable
                  className="w-full text-sm text-[#757575] border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#063B82] focus:border-transparent rounded-lg"
                  classNamePrefix="select"
                  styles={customStyles}
                  required
                  value={selectedLocation}
                  onChange={(newValue: SingleValue<{ value: string; label: string }>) => setSelectedLocation(newValue)}
                />
              </motion.div>
            </motion.div>


            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
                Company Description<span className="text-red-500">*</span>
              </label>
              <motion.textarea
                name="companyDescription"
                id="companyDescription"
                placeholder="Enter your Company Description"
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#063B82] focus:border-transparent text-sm text-[#757575]"
                rows={2}
                required
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>

            <motion.button
              type="submit"
              className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              Register Company
            </motion.button>

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
              <motion.a
                href="/"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={"/auth/companyLogin"} className="text-[#1B73E8] hover:underline">
                  Login as Company
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
            src="https://revistacariere.ro/wp-content/uploads/2018/08/24.03.2014-echipa-manaceri.jpg"
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
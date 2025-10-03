// pages/auth/signup/location.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { locationOptions } from "../../../../src/constants/groupedLocationOptions";
import Select from "react-select";
import { useUpdateLocation } from "../../../../src/lib/auth/auth.queries";
import { getAuthPageConfig } from "../../../../config/authPagesConfig";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";

interface LocationOption {  
  value: string;
  label: string;
}

const LocationPage = () => {
  const { mutate } = useUpdateLocation();
  const pageConfig = getAuthPageConfig('location');
  const [postalCodeInput, setPostalCodeInput] = useState<number>();
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null); 

  const customStyles = {
    control: (base: any) => ({
      ...base,
      padding: "4px",
      borderRadius: "8px",
      borderColor: "transparent",
      outline: "none",
      boxShadow: "none",
      border: "none",
      fontSize: "12px",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
      color: "#111",
      padding: "10px",
      fontWeight: state.isSelected ? "bold" : "normal",
    }),
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLocation || !postalCodeInput) {
      alert("Please fill out both fields.");
      return;
    }
    
    const payload = {
      location: selectedLocation.value,
      postalCode: Number(postalCodeInput),
    };
    
    console.log("📤 Sending Payload:", payload);
    mutate(payload);
  };

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      currentStep={2}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={"mb-1"}
        >
          <label className="block text-[#222] font-medium text-xs  mb-1">
            Location<span className="text-red-500">*</span>
          </label>
          <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
            <Select
              options={locationOptions}
              name="location"
              id="location"
              placeholder="Search or Select Location"
              isSearchable
              className="w-full text-xs  text-[#757575] border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#063B82] focus:border-transparent rounded-lg"
              classNamePrefix="select"
              styles={customStyles}
              required
              value={selectedLocation}
              onChange={(option) => setSelectedLocation(option as LocationOption)}
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className={"mb-1"}
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Postal Code<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="number"
            name="postalCode"
            id="postalCode"
            placeholder="Enter your Postal or Zip Code"
            className="w-full outline-none px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#063B82] focus:border-transparent text-[12px] text-[#757575] mb-1"
            onChange={(e) => setPostalCodeInput(Number(e.target.value))}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        <motion.button
          type="submit"
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm cursor-pointer mt-4"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          Continue
        </motion.button>

        <SmartLink href={"/auth/signup/salary"}>
          <motion.div
            className="text-center text-gray-500 text-sm cursor-pointer hover:text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            Skip
          </motion.div>
        </SmartLink>
      </form>
    </AuthLayout>
  );
};

export default LocationPage;
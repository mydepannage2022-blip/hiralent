// pages/auth/signup/salary.tsx
"use client";

import React, { useState } from "react";
import Select, { SingleValue } from "react-select";
import { motion } from "framer-motion";
import { useUpdateSalary } from "../../../../src/lib/auth/auth.queries";
import { getAuthPageConfig } from "../../../../config/authPagesConfig";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";

const SalaryPage = () => {
  const updateSalaryMutation = useUpdateSalary();
  const pageConfig = getAuthPageConfig('salary');
  const [minSalary, setMinSalary] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState<SingleValue<{ value: string; label: string }>>(null);

  const paymentPeriodOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const customStyles = {
    control: (base: any) => ({
      ...base,
      padding: "0px 8px",
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
      padding: "8px",
      fontWeight: state.isSelected ? "bold" : "normal",
    }),
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!minSalary || !paymentPeriod?.value) {
      alert("Please fill in all fields");
      return;
    }

    updateSalaryMutation.mutate({
      minimumSalary: parseInt(minSalary),
      paymentPeriod: paymentPeriod.value,
    });
  };

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      currentStep={3}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Minimum Salary Amount<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="number"
            name="minSalary"
            id="minSalary"
            placeholder="Enter minimum salary amount"
            className="w-full outline-none px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#063B82] focus:border-transparent text-xs text-[#757575]"
            required
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <label className="block text-[#222] font-medium text-xs mb-1">
            Payment Period<span className="text-red-500">*</span>
          </label>
          <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
            <Select
              options={paymentPeriodOptions}
              name="paymentPeriod"
              id="paymentPeriod"
              placeholder="Select Payment Period"
              isSearchable
              className="w-full text-xs text-[#757575] border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#063B82] focus:border-transparent rounded-lg"
              classNamePrefix="select"
              styles={customStyles}
              required
              value={paymentPeriod}
              onChange={(newValue: SingleValue<{ value: string; label: string }>) => setPaymentPeriod(newValue)}
            />
          </motion.div>
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

        <SmartLink href={"/auth/signup/profile-picture"}>
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

export default SalaryPage;
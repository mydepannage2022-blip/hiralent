// src/components/auth/TabSelector.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import SmartLink from "../layout/SmartLink";

interface TabSelectorProps {
  activeTab?: 'candidate' | 'company';
  candidateLink?: string;
  companyLink?: string;
}

const TabSelector: React.FC<TabSelectorProps> = ({ 
  activeTab = 'candidate',
  candidateLink = "/auth/signup",
  companyLink = "/auth/companyRegister"
}) => {
  return (
    <motion.div
      className="flex justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      
      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
        <SmartLink
          href={candidateLink}
          className={`border-l-1 border-t-1 border-b-1 rounded-t-none rounded-l-lg border-[#005DDC] py-1.5 px-2 lg:px-8 text-[14px] transition-colors duration-200 ${
            activeTab === 'candidate'
              ? 'bg-[#005DDC] text-white'
              : 'bg-white text-[#222] hover:bg-gray-50'
          }`}
        >
          As a Candidate
        </SmartLink>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
        <SmartLink
          href={companyLink}
          className={`border-r-1 border-t-1 border-b-1 rounded-t-none rounded-r-lg border-[#005DDC] py-1.5 px-2 lg:px-8 text-[14px] transition-colors duration-200 ${
            activeTab === 'company'
              ? 'bg-[#005DDC] text-white'
              : 'bg-white text-[#222] hover:bg-gray-50'
          }`}
        >
          As a Company
        </SmartLink>
      </motion.div>
    </motion.div>
  );
};

export default TabSelector;
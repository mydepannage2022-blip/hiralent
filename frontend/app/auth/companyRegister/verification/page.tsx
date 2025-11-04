"use client";

import { motion } from "framer-motion";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";
import { getAuthPageConfig } from "@/config/authPagesConfig";
import CompanyOCRUpload from "@/src/components/auth/CompanyOCRUpload";

export default function CompanyVerificationPage() {
  const pageConfig = getAuthPageConfig('companyVerification');

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      currentStep={3}
      showTabs={false}
      activeTab="company"
    >
      <motion.div
        className="w-full space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <CompanyOCRUpload />

        <motion.div
          className="text-center text-sm text-gray-600 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div>
            Need to change company details?{" "}
            <SmartLink href="/auth/companyRegister/info" className="text-[#1B73E8] hover:underline font-medium">
              Go back to previous step
            </SmartLink>
          </div>
          
          <div>
            Or{" "}
            <SmartLink href="/company/dashboard" className="text-[#1B73E8] hover:underline font-medium">
              Skip verification and go to dashboard
            </SmartLink>
          </div>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}
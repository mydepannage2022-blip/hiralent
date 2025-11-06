// app/(dashboard)/company/settings/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

import CompanyInfoSection from "@/src/components/company/dashboard/settings/CompanyInfoSection";
import AccountSection from "@/src/components/company/dashboard/settings/AccountSection";
import SecuritySection from "@/src/components/company/dashboard/settings/SecuritySection";
import NotificationSection from "@/src/components/company/dashboard/settings/NotificationSection";
import DeleteAccountSection from "@/src/components/company/dashboard/settings/DeleteAccountSection";

const DevicesAccount = dynamic(
  () => import("@/src/components/candidate/dashboard/settings/DevicesAccount"),
  { loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl mb-2" /> }
);

const QuestionAccount = dynamic(
  () => import("@/src/components/candidate/dashboard/settings/QuestionAccount"),
  { loading: () => <div className="animate-pulse bg-gray-200 h-40 rounded-xl mb-2" /> }
);

const CompanySettingsPage: React.FC = () => {
  return (
    <div className="w-full flex justify-start items-start md:flex-row flex-col gap-3">
      <div className="w-full md:w-2/3 flex flex-col justify-start gap-3 p-3 md:p-5 rounded-xl shadow-sm bg-white">
        <div className="mx-auto space-y-6 w-full">
          <CompanyInfoSection />
          <AccountSection />
          <SecuritySection />
          <NotificationSection />
          <DeleteAccountSection />
        </div>
      </div>

      <div className="w-full md:w-1/3 flex flex-col justify-start items-start gap-2">
        <DevicesAccount />
        <QuestionAccount />
      </div>
    </div>
  );
};

export default CompanySettingsPage;
"use client";

import React from "react";
import DashboardStatsCards from "@/src/components/company/dashboard/home/DashboardStatsCards";
import DashboardJobStatistics from "@/src/components/company/dashboard/home/DashboardJobStatistics";
import DashboardRecentlyPostedJobs from "@/src/components/company/dashboard/home/DashboardRecentlyPostedJobs";
import DashboardSchedule from "@/src/components/company/dashboard/home/DashboardSchedule";
import DashboardSubscription from "@/src/components/company/dashboard/home/DashboardSubscription";
import VerificationSection from "@/src/components/company/dashboard/home/VerificationSection";


const DashboardHome = () => {
  return (
    <div>
      {/* Top Row */}
      <div className="w-full flex flex-col lg:flex-row gap-4">
        {/* Left Column */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <DashboardStatsCards />
          <VerificationSection />

          
          <DashboardJobStatistics />
        </div>
        

        {/* Right Column */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <DashboardSchedule />
          <DashboardSubscription />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-4">
        <DashboardRecentlyPostedJobs />
      </div>
    </div>
  );
}

export default DashboardHome;

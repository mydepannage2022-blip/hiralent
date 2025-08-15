"use client"

import DashboardJobStatistics from "@/app/src/components/candidate/dashboard/home/analytics/DashboardJobStatistics";
import DashboardProfilePercentage from "@/app/src/components/candidate/dashboard/home/analytics/DashboardProfilePercantage";
import DashboardStatus from "@/app/src/components/candidate/dashboard/home/analytics/DashbordStatus";
import MessagesModule from "@/app/src/components/candidate/dashboard/home/DashboardChatModule";
import SavedJobs from "@/app/src/components/candidate/dashboard/home/SavedJobs";

export default function DashboardHome() {
  return (
    <div className='w-full flex justify-start items-start gap-3'>
      <div className='w-2/3 flex flex-col justify-start items-center gap-2'>
        <DashboardProfilePercentage />
        <DashboardJobStatistics />
        <SavedJobs />
      </div>
      <div className='w-1/3 flex flex-col justify-start items-start gap-2'>
        <DashboardStatus/>
        <MessagesModule
        />
      </div>
    </div>
  );
}
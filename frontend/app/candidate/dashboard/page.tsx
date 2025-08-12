"use client"

import DashboardNavbar from '@/app/src/components/candidate/dashboard/DashboardNavbar';
import DashboardSidebar from '@/app/src/components/candidate/dashboard/DashboardSidebar';
import ProtectedRoute from '@/app/src/components/layout/ProtectedRoute';
import DashboardProfilePercentage from '@/app/src/components/candidate/dashboard/analytics/DashboardProfilePercantage';
import React from 'react'
import { useState } from 'react'
import DashboardJobStatistics from '@/app/src/components/candidate/dashboard/analytics/DashboardJobStatistics';
import SavedJobs from '@/app/src/components/candidate/dashboard/SavedJobs';
import DashboardStatus from '@/app/src/components/candidate/dashboard/analytics/DashbordStatus';
import MessagesModule from '@/app/src/components/candidate/dashboard/DashboardChatModule';

const page = () => {
const [isOpen, setIsOpen] = useState(true);
  return (
    <ProtectedRoute>
      <div className="w-full bg-[#F9F9F9] flex justify-center items-center">

    <div className={`w-full xl:max-w-9/10 flex justify-center items-start p-8 gap-8`}>
      
      {/* Sticky Sidebar */}
      <div className='flex justify-start items-start sticky top-8 self-start' onClick={() => setIsOpen(!isOpen)}>
        <DashboardSidebar/>
      </div>
      
      <div className="w-full flex flex-col justify-start items-start ">
        <DashboardNavbar/>
        <div className='w-full flex justify-start items-start gap-3 py-4'>
          <div className='w-2/3 flex flex-col justify-start items-center gap-2'>
            <DashboardProfilePercentage />
            <DashboardJobStatistics />
            <SavedJobs />
          </div>
          <div className='w-1/3 flex flex-col justify-start items-start gap-2'>
            <DashboardStatus/>
            <MessagesModule/>
          </div>
        </div>
      </div>
    </div>

      </div>
    </ProtectedRoute>
  )
}

export default page

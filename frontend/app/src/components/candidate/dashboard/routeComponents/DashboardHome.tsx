"use client"
import React from 'react'
import DashboardSidebar from '../DashboardSidebar'
import DashboardNavbar from '../DashboardNavbar'
import DashboardProfilePercantage from '../analytics/DashboardProfilePercantage'
import DashbordStatus from '../analytics/DashbordStatus'
import DashboardJobStatistics from '../analytics/DashboardJobStatistics'
import MessagesModule from '../DashboardChatModule'
import { useState } from 'react'
import SavedJobs from '../SavedJobs'

const DashboardHome = () => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className={`w-full xl:max-w-9/10 flex justify-center items-start p-8 gap-8`}>
      
      {/* Sticky Sidebar */}
      <div className='flex justify-start items-start sticky top-8 self-start' onClick={() => setIsOpen(!isOpen)}>
        <DashboardSidebar/>
      </div>
      
      <div className="w-full flex flex-col justify-start items-start ">
        <DashboardNavbar/>
        <div className='w-full flex justify-start items-start gap-3 py-4'>
          <div className='w-2/3 flex flex-col justify-start items-center gap-2'>
            <DashboardProfilePercantage />
            <DashboardJobStatistics/>
            <SavedJobs/>
          </div>
          <div className='w-1/3 flex flex-col justify-start items-start gap-2'>
            <DashbordStatus/>
            <MessagesModule/>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
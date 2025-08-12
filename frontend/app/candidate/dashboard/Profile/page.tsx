"use client"

import DashboardNavbar from '@/app/src/components/candidate/dashboard/DashboardNavbar'
import DashboardSidebar from '@/app/src/components/candidate/dashboard/DashboardSidebar'
import React, { useState } from 'react'

const page = () => {
  const [isOpen, setIsOpen] = useState(true);
  return (
      <>
      <div className={`w-full xl:max-w-9/10 flex justify-center items-start p-8 gap-8`}>
      
      {/* Sticky Sidebar */}
      <div className='flex justify-start items-start sticky top-8 self-start' onClick={() => setIsOpen(!isOpen)}>
        <DashboardSidebar/>
      </div>
      
      <div className="w-full flex flex-col justify-start items-start ">
        <DashboardNavbar/>
        <div className='w-full flex justify-start items-start gap-3 py-4'>
        <h1 className="text-2xl font-bold">Profile Page</h1>
        <p className="mt-4">Welcome to your profile!</p>
        </div>
      </div>
    </div>
      </>
  )
}

export default page

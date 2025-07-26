import React from 'react'
import DashboardSidebar from '../DashboardSidebar'
import DashboardNavbar from '../DashboardNavbar'

const DashboardHome = () => {
  return (
    <div className='w-full flex justify-center items-start p-8 gap-8 h-screen'>

      <div className='flex justify-start items-start'>
      <DashboardSidebar/>
      </div>
      
      <div className="w-full flex flex-col justify-start items-start ">
        <DashboardNavbar/>
      </div>

    </div>
  )
}

export default DashboardHome
